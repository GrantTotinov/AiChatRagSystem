using System.Text.RegularExpressions;
using AiDocChat.Api.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace AiDocChat.Api.Services;

public sealed record IndexedChunk(
    string DocumentId, string FileName, int Index, int? Page, string Text, float[]? Vector, Dictionary<string, int> Terms, int Length);

public sealed record Hit(IndexedChunk Chunk, double Score, double? Similarity);

/// <summary>
/// Hybrid search: BM25 keyword ranking and embedding similarity, merged with reciprocal rank fusion.
/// Keywords catch exact names, codes and numbers that embeddings blur; embeddings catch paraphrases.
/// </summary>
public sealed partial class Retriever(AppDbContext db, EmbeddingClient embeddings, IMemoryCache cache)
{
    // ponytail: brute-force scan over cached chunks, fine to ~100k chunks; move to sqlite-vec or Qdrant beyond that.
    public async Task<List<Hit>> SearchAsync(IReadOnlyCollection<string> documentIds, string query, int topK, CancellationToken ct)
    {
        var chunks = await LoadAsync(documentIds, ct);
        if (chunks.Count == 0) return [];

        var queryVector = chunks.Any(c => c.Vector is not null)
            ? (await embeddings.EmbedAsync([query], isQuery: true, ct))?[0]
            : null;
        return Rank(chunks, query, queryVector, topK);
    }

    /// <summary>Evenly spaced chunks from each document, for summaries where "the most similar passage" is the wrong question.</summary>
    public async Task<List<Hit>> OverviewAsync(IReadOnlyCollection<string> documentIds, int count, CancellationToken ct)
    {
        var docs = (await LoadAsync(documentIds, ct)).GroupBy(c => c.DocumentId).ToList();
        if (docs.Count == 0) return [];

        var perDoc = Math.Max(2, (int)Math.Ceiling(count / (double)docs.Count));
        return
        [
            .. docs.SelectMany(doc =>
            {
                var list = doc.ToList();
                var take = Math.Min(perDoc, list.Count);
                return Enumerable.Range(0, take).Select(i => list[(int)((long)i * list.Count / take)]);
            })
            .Take(Math.Max(count, docs.Count * 2))
            .Select(c => new Hit(c, 0, null)),
        ];
    }

    public void Forget(string documentId) => cache.Remove(CacheKey(documentId));

    internal static List<Hit> Rank(IReadOnlyList<IndexedChunk> chunks, string query, float[]? queryVector, int topK)
    {
        var fused = new Dictionary<int, double>();

        var keyword = Bm25(chunks, Tokenize(query).Where(t => !StopWords.Contains(t)).Distinct().ToArray());
        Fuse(fused, keyword.Select((score, i) => (i, score)).Where(x => x.score > 0));

        double?[]? similarity = null;
        var best = 0.0;
        if (queryVector is not null)
        {
            similarity = [.. chunks.Select(c => c.Vector is null ? (double?)null : EmbeddingClient.Dot(queryVector, c.Vector))];
            Fuse(fused, similarity.Select((score, i) => (i, score: score ?? double.MinValue)).Where(x => x.score > double.MinValue));
            best = similarity.Max() ?? 0;
        }

        // Vector search always returns something. A passage that shares no keyword with the question and is far less
        // similar than the best one is noise: it would only cost prompt tokens and distract the model.
        bool Relevant(int i) => keyword[i] > 0 || similarity?[i] is not { } s || s >= best * 0.8;

        return
        [
            .. fused.Where(x => Relevant(x.Key))
                .OrderByDescending(x => x.Value)
                .Take(topK)
                .Select(x => new Hit(chunks[x.Key], x.Value, similarity?[x.Key])),
        ];
    }

    private static readonly HashSet<string> StopWords =
    [
        .. """
           the and or of to in on at for from by with about as is are was were be been do does did have has had what which
           who whom whose when where why how can could should would will may might must me my we our you your he she it its
           they them their this that these those there here not no if then than so too very just also into some any all each
           и в във на за с със от до по при към че да не ли се си ще е са бе съм сме сте как какво какви каква кой коя кое кои
           кога къде защо колко дали това този тази тези тя той то те ние вие аз ти ми ни ви му им го ги мога може могат трябва
           """.Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries),
    ];

    internal static IndexedChunk Index(string documentId, string fileName, int index, int? page, string text, float[]? vector)
    {
        var terms = new Dictionary<string, int>();
        var length = 0;
        foreach (var term in Tokenize(text))
        {
            terms[term] = terms.GetValueOrDefault(term) + 1;
            length++;
        }

        return new(documentId, fileName, index, page, text, vector, terms, length);
    }

    internal static IEnumerable<string> Tokenize(string text) =>
        Word().Matches(text).Select(m => m.Value.ToLowerInvariant()).Where(t => t.Length > 1);

    private static double[] Bm25(IReadOnlyList<IndexedChunk> chunks, string[] terms)
    {
        const double k1 = 1.2, b = 0.75;
        var scores = new double[chunks.Count];
        if (terms.Length == 0) return scores;

        var averageLength = Math.Max(1, chunks.Average(c => c.Length));
        foreach (var term in terms)
        {
            var df = chunks.Count(c => c.Terms.ContainsKey(term));
            if (df == 0) continue;

            var idf = Math.Log(1 + (chunks.Count - df + 0.5) / (df + 0.5));
            for (var i = 0; i < chunks.Count; i++)
            {
                if (chunks[i].Terms.TryGetValue(term, out var tf))
                {
                    scores[i] += idf * tf * (k1 + 1) / (tf + k1 * (1 - b + b * chunks[i].Length / averageLength));
                }
            }
        }

        return scores;
    }

    // Reciprocal rank fusion: rank positions are comparable across rankers, raw scores are not.
    private static void Fuse(Dictionary<int, double> fused, IEnumerable<(int Index, double Score)> ranking)
    {
        const int k = 60, depth = 50;
        var rank = 0;
        foreach (var (index, _) in ranking.OrderByDescending(x => x.Score).Take(depth))
        {
            fused[index] = fused.GetValueOrDefault(index) + 1.0 / (k + ++rank);
        }
    }

    private async Task<List<IndexedChunk>> LoadAsync(IReadOnlyCollection<string> documentIds, CancellationToken ct)
    {
        var ids = documentIds.Count > 0
            ? documentIds
            : await db.Documents.OrderByDescending(d => d.UploadedAt).Select(d => d.Id).ToListAsync(ct);

        var all = new List<IndexedChunk>();
        foreach (var id in ids)
        {
            var chunks = await cache.GetOrCreateAsync(CacheKey(id), async entry =>
            {
                entry.SlidingExpiration = TimeSpan.FromMinutes(30);
                var fileName = await db.Documents.Where(d => d.Id == id).Select(d => d.FileName).FirstOrDefaultAsync(ct);
                if (fileName is null) return [];

                var rows = await db.Chunks.AsNoTracking().Where(c => c.DocumentId == id).OrderBy(c => c.Index).ToListAsync(ct);
                return rows.Select(c => Index(id, fileName, c.Index, c.Page, c.Text, c.Vector is null ? null : EmbeddingClient.FromBytes(c.Vector))).ToList();
            });
            all.AddRange(chunks ?? []);
        }

        return all;
    }

    private static string CacheKey(string documentId) => "index:" + documentId;

    [GeneratedRegex(@"[\p{L}\p{N}]+")]
    private static partial Regex Word();
}

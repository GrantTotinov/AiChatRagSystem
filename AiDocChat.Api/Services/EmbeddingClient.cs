using System.Runtime.InteropServices;
using System.Text.Json;
using Microsoft.Extensions.Options;

namespace AiDocChat.Api.Services;

/// <summary>Ollama embeddings. Returns null instead of throwing when Ollama is down, so search falls back to keywords.</summary>
public sealed class EmbeddingClient(HttpClient http, IOptions<EmbeddingOptions> options, ILogger<EmbeddingClient> logger)
{
    private const int BatchSize = 32;
    private readonly EmbeddingOptions _options = options.Value;

    public string Model => _options.Model;

    public async Task<float[][]?> EmbedAsync(IReadOnlyList<string> texts, bool isQuery, CancellationToken ct)
    {
        var prefix = isQuery ? _options.QueryPrefix : _options.DocumentPrefix;
        var vectors = new List<float[]>(texts.Count);
        try
        {
            foreach (var batch in texts.Chunk(BatchSize))
            {
                using var response = await http.PostAsJsonAsync(
                    Url("/api/embed"), new { model = _options.Model, input = batch.Select(t => prefix + t) }, ct);
                response.EnsureSuccessStatusCode();
                var body = await response.Content.ReadFromJsonAsync<EmbedResponse>(ct);
                vectors.AddRange(body?.Embeddings?.Select(Normalize) ?? throw new JsonException("Ollama returned no embeddings."));
            }

            return vectors.Count == texts.Count ? [.. vectors] : null;
        }
        catch (Exception ex) when (ex is HttpRequestException or JsonException or TaskCanceledException && !ct.IsCancellationRequested)
        {
            logger.LogWarning("Embeddings unavailable ({Error}); using keyword search only.", ex.Message);
            return null;
        }
    }

    /// <returns>online, missing-model or offline.</returns>
    public async Task<string> StatusAsync(CancellationToken ct)
    {
        using var timeout = CancellationTokenSource.CreateLinkedTokenSource(ct);
        // Generous: a busy Ollama on a CPU can take a few seconds to answer even this.
        timeout.CancelAfter(TimeSpan.FromSeconds(5));
        try
        {
            var tags = await http.GetFromJsonAsync<TagsResponse>(Url("/api/tags"), timeout.Token);
            var model = _options.Model.Contains(':') ? _options.Model : _options.Model + ":latest";
            return tags?.Models?.Any(m => m.Name == model || m.Name == _options.Model) == true ? "online" : "missing-model";
        }
        catch (Exception ex) when (ex is HttpRequestException or JsonException or OperationCanceledException && !ct.IsCancellationRequested)
        {
            return "offline";
        }
    }

    public static byte[] ToBytes(float[] vector) => MemoryMarshal.AsBytes(vector.AsSpan()).ToArray();

    public static float[] FromBytes(byte[] bytes) => MemoryMarshal.Cast<byte, float>(bytes).ToArray();

    // Unit vectors turn cosine similarity into a plain dot product at query time.
    internal static float[] Normalize(float[] v)
    {
        var length = MathF.Sqrt(Dot(v, v));
        if (length > 0)
        {
            for (var i = 0; i < v.Length; i++) v[i] /= length;
        }

        return v;
    }

    internal static float Dot(float[] a, float[] b)
    {
        if (a.Length != b.Length) return 0;
        var sum = 0f;
        for (var i = 0; i < a.Length; i++) sum += a[i] * b[i];
        return sum;
    }

    private string Url(string path) => _options.BaseUrl.TrimEnd('/') + path;

    private sealed record EmbedResponse(float[][]? Embeddings);

    private sealed record TagsResponse(List<TagModel>? Models);

    private sealed record TagModel(string Name);
}

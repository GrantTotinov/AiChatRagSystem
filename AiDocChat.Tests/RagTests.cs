using System.IO.Compression;
using System.Text;
using AiDocChat.Api.Services;

namespace AiDocChat.Tests;

public class RagTests
{
    [Fact]
    public void Chunks_stay_under_the_word_limit_overlap_and_keep_pages()
    {
        var sentences = string.Join(" ", Enumerable.Range(1, 120).Select(i => $"Sentence number {i} talks about topic {i}."));
        var chunks = TextChunker.Split([new Page(3, sentences), new Page(4, "A short last page.")], maxWords: 60, overlapWords: 12);

        Assert.True(chunks.Count > 5);
        Assert.All(chunks, c => Assert.True(TextChunker.CountWords(c.Text) <= 60));
        Assert.Equal(4, chunks[^1].Page);
        Assert.Equal("A short last page.", chunks[^1].Text);

        // The second chunk starts with the last sentence of the first one.
        var lastSentenceOfFirst = chunks[0].Text[(chunks[0].Text.LastIndexOf("Sentence", StringComparison.Ordinal))..];
        Assert.StartsWith(lastSentenceOfFirst, chunks[1].Text);
    }

    [Fact]
    public void Text_files_keep_line_breaks_and_pdf_wraps_are_joined()
    {
        var csv = TextChunker.Split([new Page(null, "name,price\napple,1\npear,2")], 200, 20);
        Assert.Equal("name,price\napple,1\npear,2", Assert.Single(csv).Text);

        var pdf = TextChunker.Split([new Page(1, "The exam-\nple wraps\nacross lines.")], 200, 20);
        Assert.Equal("The example wraps across lines.", Assert.Single(pdf).Text);
    }

    [Fact]
    public void Keyword_search_finds_exact_terms()
    {
        var chunks = new[]
        {
            Retriever.Index("d", "a.txt", 0, null, "The office opens at nine and closes at five.", null),
            Retriever.Index("d", "a.txt", 1, null, "Refunds are possible within 30 days under the refund policy.", null),
            Retriever.Index("d", "a.txt", 2, null, "Parking is free for visitors.", null),
        };

        var hits = Retriever.Rank(chunks, "What is the refund policy?", queryVector: null, topK: 2);

        Assert.Equal(1, hits[0].Chunk.Index);
        Assert.Null(hits[0].Similarity);
    }

    [Fact]
    public void Vector_search_finds_paraphrases_without_shared_words()
    {
        float[] V(params float[] v) => EmbeddingClient.Normalize(v);
        var chunks = new[]
        {
            Retriever.Index("d", "a.txt", 0, null, "Opening hours of the office.", V(1, 0, 0)),
            Retriever.Index("d", "a.txt", 1, null, "Money back within thirty days.", V(0, 1, 0)),
        };

        var hits = Retriever.Rank(chunks, "Can I get a reimbursement?", V(0.1f, 0.9f, 0), topK: 1);

        Assert.Equal(1, Assert.Single(hits).Chunk.Index);
        Assert.True(hits[0].Similarity > 0.9);
    }

    [Fact]
    public void Docx_paragraphs_become_text()
    {
        using var file = new MemoryStream();
        using (var zip = new ZipArchive(file, ZipArchiveMode.Create, leaveOpen: true))
        {
            using var writer = new StreamWriter(zip.CreateEntry("word/document.xml").Open(), Encoding.UTF8);
            writer.Write("""
                <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>
                <w:p><w:r><w:t>Hello</w:t></w:r><w:r><w:t xml:space="preserve"> world</w:t></w:r></w:p>
                <w:p><w:r><w:t>Second</w:t><w:tab/><w:t>paragraph</w:t></w:r></w:p>
                </w:body></w:document>
                """);
        }

        file.Position = 0;
        Assert.Equal("Hello world\n\nSecond\tparagraph\n\n", TextExtractor.Docx(file));
    }

    [Fact]
    public void Vectors_round_trip_through_bytes()
    {
        float[] vector = [0.25f, -1.5f, 3f];
        Assert.Equal(vector, EmbeddingClient.FromBytes(EmbeddingClient.ToBytes(vector)));
    }
}

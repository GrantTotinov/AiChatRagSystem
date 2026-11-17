using System.Security.Cryptography;
using AiDocChat.Api.Data;
using AiDocChat.Api.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using UploadGuard;

namespace AiDocChat.Api.Services;

public sealed class DocumentService(
    AppDbContext db,
    UploadPipeline uploads,
    EmbeddingClient embeddings,
    Retriever retriever,
    IOptions<RagOptions> options,
    ILogger<DocumentService> logger)
{
    public const string UploadPolicy = "documents";

    private readonly RagOptions _options = options.Value;

    public Task<List<DocumentDto>> ListAsync(CancellationToken ct) =>
        db.Documents.OrderByDescending(d => d.UploadedAt)
            .Select(d => new DocumentDto(d.Id, d.FileName, d.Kind, d.SizeBytes, d.Pages, d.Words, d.ChunksCount, d.Embedded, d.UploadedAt))
            .ToListAsync(ct);

    public async Task<UploadOutcome> IngestAsync(IFormFile file, CancellationToken ct)
    {
        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (!TextExtractor.Extensions.Contains(extension))
        {
            return Fail(file, "This file type is not supported. Upload a PDF, Word (.docx), text, Markdown, CSV or JSON file.");
        }

        await using var content = new MemoryStream();
        await file.CopyToAsync(content, ct);

        // UploadGuard detects types from the bytes. It knows .txt and .csv but not .md or .json, which are checked as plain text.
        var checkedAsText = extension is not (".pdf" or ".docx" or ".txt" or ".csv");
        content.Position = 0;
        var check = await uploads.ValidateAsync(
            content,
            checkedAsText ? Path.ChangeExtension(file.FileName, ".txt") : file.FileName,
            checkedAsText ? null : file.ContentType,
            UploadPolicy,
            ct);
        if (!check.IsValid) return Fail(file, check.Error!.Message);

        content.Position = 0;
        var sha256 = Convert.ToHexString(SHA256.HashData(content));
        if (await db.Documents.FirstOrDefaultAsync(d => d.Sha256 == sha256, ct) is { } existing)
        {
            return new(file.FileName, existing.ToDto(), null, Duplicate: true);
        }

        List<Page> pages;
        try
        {
            content.Position = 0;
            pages = TextExtractor.Extract(content, extension);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            logger.LogWarning(ex, "Could not read {FileName}", file.FileName);
            return Fail(file, "The file could not be read. It may be damaged or password-protected.");
        }

        var chunks = TextChunker.Split(pages, _options.ChunkWords, _options.OverlapWords);
        if (chunks.Count == 0)
        {
            return Fail(file, "No text was found in this file. Scanned PDFs need OCR before they can be searched.");
        }

        var vectors = await embeddings.EmbedAsync([.. chunks.Select(c => c.Text)], isQuery: false, ct);
        var document = new Document
        {
            FileName = Path.GetFileName(file.FileName),
            Kind = extension == ".markdown" ? "md" : extension.TrimStart('.'),
            Sha256 = sha256,
            SizeBytes = file.Length,
            Pages = extension == ".pdf" ? pages.Count : null,
            Words = pages.Sum(p => TextChunker.CountWords(p.Text)),
            ChunksCount = chunks.Count,
            Embedded = vectors is not null,
        };
        document.Chunks.AddRange(chunks.Select((c, i) => new DocumentChunk
        {
            DocumentId = document.Id,
            Index = i,
            Page = c.Page,
            Text = c.Text,
            Vector = vectors is null ? null : EmbeddingClient.ToBytes(vectors[i]),
        }));

        db.Documents.Add(document);
        await db.SaveChangesAsync(ct);
        logger.LogInformation("Indexed {FileName}: {Chunks} chunks, embeddings {Embedded}", document.FileName, chunks.Count, document.Embedded);
        return new(file.FileName, document.ToDto(), null);
    }

    public async Task<bool> DeleteAsync(string id, CancellationToken ct)
    {
        var deleted = await db.Documents.Where(d => d.Id == id).ExecuteDeleteAsync(ct) > 0;
        retriever.Forget(id);
        return deleted;
    }

    private static UploadOutcome Fail(IFormFile file, string error) => new(file.FileName, null, error);
}

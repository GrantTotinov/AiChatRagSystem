namespace AiDocChat.Api.Models;

public sealed class Document
{
    public string Id { get; set; } = Guid.NewGuid().ToString("n");
    public required string FileName { get; set; }
    public required string Kind { get; set; }
    public required string Sha256 { get; set; }
    public long SizeBytes { get; set; }
    public int? Pages { get; set; }
    public int Words { get; set; }
    public int ChunksCount { get; set; }
    public bool Embedded { get; set; }
    public DateTime UploadedAt { get; set; } = DateTime.UtcNow;
    public List<string>? Suggestions { get; set; }
    public List<DocumentChunk> Chunks { get; set; } = [];

    public DocumentDto ToDto() => new(Id, FileName, Kind, SizeBytes, Pages, Words, ChunksCount, Embedded, UploadedAt);
}

public sealed class DocumentChunk
{
    public int Id { get; set; }
    public required string DocumentId { get; set; }
    public int Index { get; set; }
    public int? Page { get; set; }
    public required string Text { get; set; }

    /// <summary>Unit-length float32 embedding, or null when the embedding model was offline at upload.</summary>
    public byte[]? Vector { get; set; }
}

public sealed class Conversation
{
    public string Id { get; set; } = Guid.NewGuid().ToString("n");
    public required string Title { get; set; }

    /// <summary>The documents this conversation searches. Empty means all documents.</summary>
    public List<string> DocumentIds { get; set; } = [];
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public List<ChatMessage> Messages { get; set; } = [];
}

public sealed class ChatMessage
{
    public int Id { get; set; }
    public required string ConversationId { get; set; }
    public required string Role { get; set; }
    public required string Content { get; set; }

    /// <summary>A copy of the cited passages, so answers keep their citations after a document is deleted.</summary>
    public List<Source>? Sources { get; set; }
    public int? ElapsedMs { get; set; }
    public bool Stopped { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public sealed record Source(int N, string DocumentId, string FileName, int? Page, int ChunkIndex, string Text, double? Similarity);

public sealed record DocumentDto(
    string Id, string FileName, string Kind, long SizeBytes, int? Pages, int Words, int ChunksCount, bool Embedded, DateTime UploadedAt);

public sealed record UploadOutcome(string FileName, DocumentDto? Document, string? Error, bool Duplicate = false);

public sealed record ChatRequest(
    string Question,
    string? ConversationId = null,
    List<string>? DocumentIds = null,
    bool Regenerate = false,
    bool Overview = false);

public sealed record ConversationSummary(string Id, string Title, DateTime UpdatedAt, List<string> DocumentIds, int Messages);

public sealed record Health(LlmHealth Llm, EmbeddingHealth Embeddings);

public sealed record LlmHealth(bool Configured, string Model, string Provider);

/// <param name="Status">online, missing-model or offline.</param>
public sealed record EmbeddingHealth(string Status, string Model);

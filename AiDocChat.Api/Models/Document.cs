using System.ComponentModel.DataAnnotations;

namespace AiDocChat.Api.Models;

public class Document
{
    [Key]
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string FileName { get; set; } = string.Empty;
    public DateTime UploadedAt { get; set; } = DateTime.UtcNow;
    public int ChunksCount { get; set; }
    
    public List<DocumentChunk> Chunks { get; set; } = new();
}

public class DocumentChunk
{
    [Key]
    public int Id { get; set; }
    public string DocumentId { get; set; } = string.Empty;
    public int ChunkIndex { get; set; }
    public string Text { get; set; } = string.Empty;
    public string EmbeddingJson { get; set; } = string.Empty; // JSON array of floats
    
    public Document? Document { get; set; }
}

public class ChatRequest
{
    public string DocumentId { get; set; } = string.Empty;
    public string Question { get; set; } = string.Empty;
}

public class ChatResponse
{
    public bool Success { get; set; }
    public string Answer { get; set; } = string.Empty;
    public string? Error { get; set; }
}
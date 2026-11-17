namespace AiDocChat.Api;

/// <summary>Any OpenAI-compatible chat completions endpoint: Groq, OpenAI, OpenRouter, or Ollama's /v1.</summary>
public sealed class LlmOptions
{
    public string BaseUrl { get; set; } = "https://api.groq.com/openai/v1";
    public string Model { get; set; } = "openai/gpt-oss-20b";
    public string? ApiKey { get; set; }
    public double Temperature { get; set; } = 0.2;
    public int MaxTokens { get; set; } = 2048;

    // A local server such as Ollama needs no key.
    public bool IsConfigured =>
        !string.IsNullOrWhiteSpace(ApiKey)
        || (Uri.TryCreate(BaseUrl, UriKind.Absolute, out var uri) && uri.IsLoopback);
}

/// <summary>Ollama's embedding API.</summary>
public sealed class EmbeddingOptions
{
    public string BaseUrl { get; set; } = "http://localhost:11434";
    public string Model { get; set; } = "nomic-embed-text";

    // nomic-embed-text was trained with these task prefixes. Clear them for models that were not.
    public string DocumentPrefix { get; set; } = "search_document: ";
    public string QueryPrefix { get; set; } = "search_query: ";
}

public sealed class RagOptions
{
    public int TopK { get; set; } = 6;
    public int ChunkWords { get; set; } = 220;
    public int OverlapWords { get; set; } = 40;
    public int HistoryMessages { get; set; } = 6;
    public long MaxUploadBytes { get; set; } = 25 * 1024 * 1024;
}

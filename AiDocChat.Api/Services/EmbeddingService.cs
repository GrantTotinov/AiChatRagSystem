using System.Text;
using Newtonsoft.Json;
using AiDocChat.Api.Models;
using AiDocChat.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace AiDocChat.Api.Services;

public interface IEmbeddingService
{
    Task<float[]> GenerateEmbeddingAsync(string text);
    Task<List<DocumentChunk>> SearchSimilarChunksAsync(string documentId, string query, int topK = 3);
}

public class EmbeddingService : IEmbeddingService
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly AppDbContext _context;
    private readonly IConfiguration _configuration;
    
    // Ollama API endpoint (локален или cloud)
    private readonly string _ollamaBaseUrl;
    private const string EMBEDDING_MODEL = "nomic-embed-text"; // Специален модел за embeddings
    
    public EmbeddingService(
        IHttpClientFactory httpClientFactory,
        AppDbContext context,
        IConfiguration configuration)
    {
        _httpClientFactory = httpClientFactory;
        _context = context;
        _configuration = configuration;
        
        // Вземи Ollama URL от config (по подразбиране локален)
        _ollamaBaseUrl = _configuration["Ollama:BaseUrl"] ?? "http://localhost:11434";
    }
    
    public async Task<float[]> GenerateEmbeddingAsync(string text)
    {
        var client = _httpClientFactory.CreateClient();
        client.Timeout = TimeSpan.FromSeconds(30);
        
        var requestBody = new
        {
            model = EMBEDDING_MODEL,
            prompt = text
        };
        
        var content = new StringContent(
            JsonConvert.SerializeObject(requestBody),
            Encoding.UTF8,
            "application/json"
        );
        
        try
        {
            var response = await client.PostAsync(
                $"{_ollamaBaseUrl}/api/embeddings", 
                content
            );
            
            if (!response.IsSuccessStatusCode)
            {
                var error = await response.Content.ReadAsStringAsync();
                Console.WriteLine($"Ollama embedding error: {error}");
                throw new Exception($"Ollama API грешка: {response.StatusCode}");
            }
            
            var jsonResponse = await response.Content.ReadAsStringAsync();
            var result = JsonConvert.DeserializeObject<OllamaEmbeddingResponse>(jsonResponse);
            
            return result?.Embedding ?? Array.Empty<float>();
        }
        catch (HttpRequestException ex)
        {
            Console.WriteLine($"Ollama connection error: {ex.Message}");
            throw new Exception(
                "Не мога да се свържа с Ollama. Уверете се, че Ollama работи на " + _ollamaBaseUrl
            );
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Embedding error: {ex.Message}");
            throw;
        }
    }
    
    public async Task<List<DocumentChunk>> SearchSimilarChunksAsync(
        string documentId, 
        string query, 
        int topK = 3)
    {
        var queryEmbedding = await GenerateEmbeddingAsync(query);
        
        var chunks = await _context.DocumentChunks
            .Where(c => c.DocumentId == documentId)
            .ToListAsync();
        
        var results = chunks.Select(chunk => new
        {
            Chunk = chunk,
            Similarity = CosineSimilarity(
                queryEmbedding,
                JsonConvert.DeserializeObject<float[]>(chunk.EmbeddingJson) ?? Array.Empty<float>()
            )
        })
        .OrderByDescending(x => x.Similarity)
        .Take(topK)
        .Select(x => x.Chunk)
        .ToList();
        
        return results;
    }
    
    private float CosineSimilarity(float[] a, float[] b)
    {
        if (a.Length != b.Length) return 0;
        
        float dotProduct = 0;
        float magnitudeA = 0;
        float magnitudeB = 0;
        
        for (int i = 0; i < a.Length; i++)
        {
            dotProduct += a[i] * b[i];
            magnitudeA += a[i] * a[i];
            magnitudeB += b[i] * b[i];
        }
        
        magnitudeA = (float)Math.Sqrt(magnitudeA);
        magnitudeB = (float)Math.Sqrt(magnitudeB);
        
        if (magnitudeA == 0 || magnitudeB == 0) return 0;
        
        return dotProduct / (magnitudeA * magnitudeB);
    }
}

// Ollama API response models
public class OllamaEmbeddingResponse
{
    [JsonProperty("embedding")]
    public float[]? Embedding { get; set; }
}
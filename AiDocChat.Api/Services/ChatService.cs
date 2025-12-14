using System.Text;
using Newtonsoft.Json;
using AiDocChat.Api.Models;

namespace AiDocChat.Api.Services;

public interface IChatService
{
    Task<string> AnswerQuestionAsync(string documentId, string question);
}

public class ChatService : IChatService
{
    private readonly IEmbeddingService _embeddingService;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IConfiguration _configuration;
    
    private const string GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
    private const string MODEL = "llama-3.1-8b-instant";
 // Безплатен модел
    
    public ChatService(
        IEmbeddingService embeddingService,
        IHttpClientFactory httpClientFactory,
        IConfiguration configuration)
    {
        _embeddingService = embeddingService;
        _httpClientFactory = httpClientFactory;
        _configuration = configuration;
    }
    
    public async Task<string> AnswerQuestionAsync(string documentId, string question)
    {
        // Намиране на релевантни chunks
        var relevantChunks = await _embeddingService.SearchSimilarChunksAsync(
            documentId, 
            question, 
            topK: 3
        );
        
        if (!relevantChunks.Any())
        {
            return "Не намерих релевантна информация в документа за този въпрос.";
        }
        
        // Изграждане на контекст
        var context = string.Join("\n\n", relevantChunks.Select((chunk, i) => 
            $"[Пасаж {i + 1}]: {chunk.Text}"));
        
        // Създаване на prompt
        var systemPrompt = "Ти си AI асистент, който отговаря на въпроси базирани на предоставени документи. Отговаряй САМО на база контекста и на езика на който е зададен въпроса. По default да бъде английски.";
        
        var userPrompt = $@"Контекст от документа:
{context}

Въпрос: {question}

Отговори кратко и точно на езика на който е зададен въпроса, базирайки се само на информацията в контекста.";
        
        // Извикване на Groq API
        try
        {
            var apiKey = _configuration["Groq:ApiKey"];
            if (string.IsNullOrEmpty(apiKey))
            {
                return "Groq API ключ не е конфигуриран. Моля добавете го в appsettings.json";
            }
            
            var client = _httpClientFactory.CreateClient();
            client.DefaultRequestHeaders.Add("Authorization", $"Bearer {apiKey}");
            
            var requestBody = new
            {
                model = MODEL,
                messages = new[]
                {
                    new { role = "system", content = systemPrompt },
                    new { role = "user", content = userPrompt }
                },
                temperature = 0.3,
                max_tokens = 500
            };
            
            var content = new StringContent(
                JsonConvert.SerializeObject(requestBody),
                Encoding.UTF8,
                "application/json"
            );
            
            var response = await client.PostAsync(GROQ_API_URL, content);
            
            if (!response.IsSuccessStatusCode)
            {
                var errorContent = await response.Content.ReadAsStringAsync();
                Console.WriteLine($"Groq API error: {errorContent}");
                return $"Грешка при комуникация с AI модела: {response.StatusCode}";
            }
            
            var jsonResponse = await response.Content.ReadAsStringAsync();
            var result = JsonConvert.DeserializeObject<GroqChatResponse>(jsonResponse);
            
            return result?.Choices?.FirstOrDefault()?.Message?.Content 
                ?? "Не получих валиден отговор от AI модела.";
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Chat error: {ex.Message}");
            return $"Грешка при генериране на отговор: {ex.Message}";
        }
    }
}

// Groq API response models
public class GroqChatResponse
{
    [JsonProperty("choices")]
    public List<GroqChoice>? Choices { get; set; }
}

public class GroqChoice
{
    [JsonProperty("message")]
    public GroqMessage? Message { get; set; }
}

public class GroqMessage
{
    [JsonProperty("content")]
    public string? Content { get; set; }
}
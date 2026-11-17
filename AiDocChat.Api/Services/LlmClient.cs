using System.Net;
using System.Net.Http.Headers;
using System.Net.ServerSentEvents;
using System.Runtime.CompilerServices;
using System.Text.Json;
using Microsoft.Extensions.Options;

namespace AiDocChat.Api.Services;

public sealed record LlmMessage(string Role, string Content);

/// <summary>A failure whose message is safe to show to the user.</summary>
public sealed class LlmException(string message) : Exception(message);

/// <summary>OpenAI-compatible chat completions, streamed.</summary>
public sealed class LlmClient(HttpClient http, IOptions<LlmOptions> options, ILogger<LlmClient> logger)
{
    public LlmOptions Options { get; } = options.Value;

    public string Provider => Uri.TryCreate(Options.BaseUrl, UriKind.Absolute, out var uri) ? uri.Host : Options.BaseUrl;

    public async IAsyncEnumerable<string> StreamAsync(IReadOnlyList<LlmMessage> messages, [EnumeratorCancellation] CancellationToken ct)
    {
        using var request = CreateRequest(messages, stream: true);
        using var response = await SendAsync(request, ct);
        await using var body = await response.Content.ReadAsStreamAsync(ct);

        await foreach (var item in SseParser.Create(body).EnumerateAsync(ct))
        {
            if (item.Data == "[DONE]") yield break;

            var text = JsonSerializer.Deserialize<Completion>(item.Data, JsonSerializerOptions.Web)?.Choices?.FirstOrDefault()?.Delta?.Content;
            if (!string.IsNullOrEmpty(text)) yield return text;
        }
    }

    public async Task<string> CompleteAsync(IReadOnlyList<LlmMessage> messages, CancellationToken ct)
    {
        using var request = CreateRequest(messages, stream: false);
        using var response = await SendAsync(request, ct);
        var completion = await response.Content.ReadFromJsonAsync<Completion>(JsonSerializerOptions.Web, ct);
        return completion?.Choices?.FirstOrDefault()?.Message?.Content ?? "";
    }

    private HttpRequestMessage CreateRequest(IReadOnlyList<LlmMessage> messages, bool stream)
    {
        var request = new HttpRequestMessage(HttpMethod.Post, Options.BaseUrl.TrimEnd('/') + "/chat/completions")
        {
            Content = JsonContent.Create(new
            {
                model = Options.Model,
                messages,
                stream,
                temperature = Options.Temperature,
                max_tokens = Options.MaxTokens,
            }),
        };
        if (!string.IsNullOrWhiteSpace(Options.ApiKey))
        {
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", Options.ApiKey);
        }

        return request;
    }

    private async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct)
    {
        HttpResponseMessage response;
        try
        {
            response = await http.SendAsync(request, HttpCompletionOption.ResponseHeadersRead, ct);
        }
        catch (HttpRequestException ex)
        {
            logger.LogWarning(ex, "Cannot reach the language model at {Provider}", Provider);
            throw new LlmException($"Cannot reach the language model at {Provider}. Check Llm:BaseUrl and your connection.");
        }

        if (response.IsSuccessStatusCode) return response;

        var detail = await response.Content.ReadAsStringAsync(ct);
        logger.LogWarning("Language model returned {Status}: {Detail}", (int)response.StatusCode, detail);
        response.Dispose();
        throw new LlmException(response.StatusCode switch
        {
            HttpStatusCode.Unauthorized or HttpStatusCode.Forbidden => $"{Provider} rejected the API key. Set Llm:ApiKey to a valid key.",
            HttpStatusCode.NotFound => $"{Provider} has no model named '{Options.Model}'. Set Llm:Model to one it serves.",
            HttpStatusCode.TooManyRequests => $"{Provider} rate limit reached. Wait a moment and try again.",
            _ => $"{Provider} returned an error ({(int)response.StatusCode}). Try again in a moment.",
        });
    }

    private sealed record Completion(List<Choice>? Choices);

    private sealed record Choice(Delta? Delta, Delta? Message);

    private sealed record Delta(string? Content);
}

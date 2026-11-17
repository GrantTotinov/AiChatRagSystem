using Microsoft.AspNetCore.RateLimiting;
using AiDocChat.Api;
using AiDocChat.Api.Data;
using AiDocChat.Api.Models;
using AiDocChat.Api.Services;
using Microsoft.EntityFrameworkCore;
using Scalar.AspNetCore;
using UploadGuard;

var builder = WebApplication.CreateBuilder(args);
var config = builder.Configuration;

builder.Services.Configure<LlmOptions>(config.GetSection("Llm"));
builder.Services.PostConfigure<LlmOptions>(o =>
{
    // Older configs used Groq:ApiKey; a GROQ_API_KEY environment variable also works.
    if (string.IsNullOrWhiteSpace(o.ApiKey)) o.ApiKey = config["Groq:ApiKey"] is { Length: > 0 } key ? key : config["GROQ_API_KEY"];
});
builder.Services.Configure<EmbeddingOptions>(config.GetSection("Embeddings"));
builder.Services.Configure<RagOptions>(config.GetSection("Rag"));
var rag = config.GetSection("Rag").Get<RagOptions>() ?? new RagOptions();

builder.Services.AddUploadGuard(o => o.AddPolicy(DocumentService.UploadPolicy, p => p
    .Allow(FileTypes.Pdf, FileTypes.Docx, FileTypes.Text, FileTypes.Csv)
    .MaxSize(rag.MaxUploadBytes)
    .LimitArchives(maxEntries: 2_000, maxUncompressedSize: 100 * 1024 * 1024)));

var dataDirectory = Path.Combine(builder.Environment.ContentRootPath, "App_Data");
Directory.CreateDirectory(dataDirectory);
builder.Services.AddDbContext<AppDbContext>(o =>
    o.UseSqlite(config.GetConnectionString("Default") ?? $"Data Source={Path.Combine(dataDirectory, "aidocchat.db")}"));

builder.Services.AddMemoryCache();
builder.Services.AddHttpClient<EmbeddingClient>(c => c.Timeout = TimeSpan.FromMinutes(2));
builder.Services.AddHttpClient<LlmClient>(c => c.Timeout = TimeSpan.FromMinutes(2));
builder.Services.AddScoped<Retriever>();
builder.Services.AddScoped<DocumentService>();
builder.Services.AddScoped<ChatService>();

builder.Services.AddProblemDetails();
builder.Services.AddOpenApi();
builder.Services.AddRateLimiter(o =>
{
    o.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    o.AddFixedWindowLimiter("llm", w =>
    {
        w.PermitLimit = 30;
        w.Window = TimeSpan.FromMinutes(1);
        w.QueueLimit = 0;
    });
});

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.EnsureCreated();
    db.Database.ExecuteSqlRaw("PRAGMA journal_mode=WAL;");
}

app.UseExceptionHandler();
app.UseRateLimiter();

// `npm run build` in frontend/ writes to wwwroot, so one `dotnet run` serves the whole app.
app.UseDefaultFiles();
app.UseStaticFiles();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.MapScalarApiReference();
}

var api = app.MapGroup("/api");

api.MapGet("/health", async (LlmClient llm, EmbeddingClient embeddings, CancellationToken ct) =>
    new Health(
        new LlmHealth(llm.Options.IsConfigured, llm.Options.Model, llm.Provider),
        new EmbeddingHealth(await embeddings.StatusAsync(ct), embeddings.Model)));

api.MapGet("/documents", (DocumentService documents, CancellationToken ct) => documents.ListAsync(ct));

// The UI sends one file per request so each file shows its own progress and error.
api.MapPost("/documents", async (IFormFileCollection files, DocumentService documents, CancellationToken ct) =>
{
    var results = new List<UploadOutcome>();
    foreach (var file in files) results.Add(await documents.IngestAsync(file, ct));
    return results;
}).DisableAntiforgery();

api.MapDelete("/documents/{id}", async (string id, DocumentService documents, CancellationToken ct) =>
    await documents.DeleteAsync(id, ct) ? Results.NoContent() : Results.NotFound());

api.MapGet("/documents/{id}/suggestions", (string id, ChatService chat, CancellationToken ct) => chat.SuggestAsync(id, ct))
    .RequireRateLimiting("llm");

api.MapGet("/conversations", (AppDbContext db, CancellationToken ct) =>
    db.Conversations.OrderByDescending(c => c.UpdatedAt)
        .Select(c => new ConversationSummary(c.Id, c.Title, c.UpdatedAt, c.DocumentIds, c.Messages.Count))
        .ToListAsync(ct));

api.MapGet("/conversations/{id}", async (string id, AppDbContext db, CancellationToken ct) =>
    await db.Conversations.AsNoTracking().Include(c => c.Messages.OrderBy(m => m.Id)).FirstOrDefaultAsync(c => c.Id == id, ct)
        is { } conversation ? Results.Ok(conversation) : Results.NotFound());

api.MapDelete("/conversations/{id}", async (string id, AppDbContext db, CancellationToken ct) =>
    await db.Conversations.Where(c => c.Id == id).ExecuteDeleteAsync(ct) > 0 ? Results.NoContent() : Results.NotFound());

api.MapPost("/chat", IResult (ChatRequest request, ChatService chat, CancellationToken ct) =>
{
    if (string.IsNullOrWhiteSpace(request.Question) || request.Question.Length > 4000)
    {
        return Results.ValidationProblem(new Dictionary<string, string[]>
        {
            ["question"] = ["Ask a question of 1 to 4000 characters."],
        });
    }

    return TypedResults.ServerSentEvents(chat.AskAsync(request, ct));
}).RequireRateLimiting("llm");

app.MapFallbackToFile("index.html");

app.Run();

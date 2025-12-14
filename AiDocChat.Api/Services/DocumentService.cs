using System.Text;
using iText.Kernel.Pdf;
using iText.Kernel.Pdf.Canvas.Parser;
using iText.Kernel.Pdf.Canvas.Parser.Listener;
using Newtonsoft.Json;
using AiDocChat.Api.Models;
using AiDocChat.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace AiDocChat.Api.Services;

public interface IDocumentService
{
    Task<string> ProcessDocumentAsync(IFormFile file);
    Task<List<Document>> GetAllDocumentsAsync();
}

public class DocumentService : IDocumentService
{
    private readonly AppDbContext _context;
    private readonly IEmbeddingService _embeddingService;
    
    public DocumentService(AppDbContext context, IEmbeddingService embeddingService)
    {
        _context = context;
        _embeddingService = embeddingService;
    }
    
    public async Task<string> ProcessDocumentAsync(IFormFile file)
    {
        // Извличане на текст според типа файл
        string text = await ExtractTextFromFileAsync(file);
        
        // Разделяне на chunks
        var chunks = SplitIntoChunks(text, 250);
        
        // Създаване на документ
        var document = new Document
        {
            Id = Guid.NewGuid().ToString(),
            FileName = file.FileName,
            UploadedAt = DateTime.UtcNow,
            ChunksCount = chunks.Count
        };
        
        // Генериране на embeddings за всеки chunk
        for (int i = 0; i < chunks.Count; i++)
        {
            var embedding = await _embeddingService.GenerateEmbeddingAsync(chunks[i]);
            
            var chunk = new DocumentChunk
            {
                DocumentId = document.Id,
                ChunkIndex = i,
                Text = chunks[i],
                EmbeddingJson = JsonConvert.SerializeObject(embedding)
            };
            
            document.Chunks.Add(chunk);
        }
        
        // Запис в базата
        _context.Documents.Add(document);
        await _context.SaveChangesAsync();
        
        return document.Id;
    }
    
    public async Task<List<Document>> GetAllDocumentsAsync()
    {
        return await _context.Documents
            .OrderByDescending(d => d.UploadedAt)
            .ToListAsync();
    }
    
    private async Task<string> ExtractTextFromFileAsync(IFormFile file)
    {
        using var stream = new MemoryStream();
        await file.CopyToAsync(stream);
        stream.Position = 0;
        
        var extension = Path.GetExtension(file.FileName).ToLower();
        
        return extension switch
        {
            ".pdf" => ExtractTextFromPdf(stream),
            ".txt" => await ExtractTextFromTxtAsync(stream),
            _ => throw new NotSupportedException($"Файлов тип {extension} не се поддържа")
        };
    }
    
    private string ExtractTextFromPdf(Stream stream)
    {
        var text = new StringBuilder();
        
        using var pdfReader = new PdfReader(stream);
        using var pdfDoc = new PdfDocument(pdfReader);
        
        for (int i = 1; i <= pdfDoc.GetNumberOfPages(); i++)
        {
            var page = pdfDoc.GetPage(i);
            var strategy = new LocationTextExtractionStrategy();
            var pageText = PdfTextExtractor.GetTextFromPage(page, strategy);
            text.AppendLine(pageText);
        }
        
        return text.ToString();
    }
    
    private async Task<string> ExtractTextFromTxtAsync(Stream stream)
    {
        using var reader = new StreamReader(stream, Encoding.UTF8);
        return await reader.ReadToEndAsync();
    }
    
    private List<string> SplitIntoChunks(string text, int chunkSize)
    {
        var words = text.Split(new[] { ' ', '\n', '\r', '\t' }, 
            StringSplitOptions.RemoveEmptyEntries);
        
        var chunks = new List<string>();
        
        for (int i = 0; i < words.Length; i += chunkSize)
        {
            var chunk = string.Join(" ", words.Skip(i).Take(chunkSize));
            if (!string.IsNullOrWhiteSpace(chunk))
            {
                chunks.Add(chunk);
            }
        }
        
        return chunks;
    }
}
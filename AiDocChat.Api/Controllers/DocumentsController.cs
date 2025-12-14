using AiDocChat.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace AiDocChat.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class DocumentsController : ControllerBase
{
    private readonly IDocumentService _documentService;
    private readonly ILogger<DocumentsController> _logger;
    
    public DocumentsController(
        IDocumentService documentService,
        ILogger<DocumentsController> logger)
    {
        _documentService = documentService;
        _logger = logger;
    }
    
    [HttpPost("upload")]
    public async Task<IActionResult> Upload(IFormFile file)
    {
        try
        {
            if (file == null || file.Length == 0)
            {
                return BadRequest(new { success = false, error = "Файлът е празен" });
            }
            
            _logger.LogInformation($"Качване на файл: {file.FileName}");
            
            var documentId = await _documentService.ProcessDocumentAsync(file);
            
            return Ok(new
            {
                success = true,
                documentId,
                message = "Документът е обработен успешно!"
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Грешка при качване на документ");
            return StatusCode(500, new
            {
                success = false,
                error = ex.Message
            });
        }
    }
    
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        try
        {
            var documents = await _documentService.GetAllDocumentsAsync();
            return Ok(new
            {
                success = true,
                documents
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Грешка при извличане на документи");
            return StatusCode(500, new
            {
                success = false,
                error = ex.Message
            });
        }
    }
}
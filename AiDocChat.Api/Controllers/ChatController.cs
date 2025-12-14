using AiDocChat.Api.Models;
using AiDocChat.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace AiDocChat.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ChatController : ControllerBase
{
    private readonly IChatService _chatService;
    private readonly ILogger<ChatController> _logger;
    
    public ChatController(
        IChatService chatService,
        ILogger<ChatController> logger)
    {
        _chatService = chatService;
        _logger = logger;
    }
    
    [HttpPost("ask")]
    public async Task<IActionResult> Ask([FromBody] ChatRequest request)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(request.Question))
            {
                return BadRequest(new ChatResponse
                {
                    Success = false,
                    Error = "Въпросът не може да бъде празен"
                });
            }
            
            if (string.IsNullOrWhiteSpace(request.DocumentId))
            {
                return BadRequest(new ChatResponse
                {
                    Success = false,
                    Error = "Трябва да изберете документ"
                });
            }
            
            _logger.LogInformation($"Въпрос за документ {request.DocumentId}: {request.Question}");
            
            var answer = await _chatService.AnswerQuestionAsync(
                request.DocumentId,
                request.Question
            );
            
            return Ok(new ChatResponse
            {
                Success = true,
                Answer = answer
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Грешка при обработка на въпрос");
            return StatusCode(500, new ChatResponse
            {
                Success = false,
                Error = ex.Message
            });
        }
    }
}
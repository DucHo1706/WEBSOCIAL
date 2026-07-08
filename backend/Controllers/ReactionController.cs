using Microsoft.AspNetCore.Mvc;
using backend.Services;
using System;
using System.Threading.Tasks;

namespace backend.Controllers
{
    [ApiController]
    [Route("api/reaction")]
    public class ReactionController : ControllerBase
    {
        private readonly IMemoryService _memoryService;

        public ReactionController(IMemoryService memoryService)
        {
            _memoryService = memoryService;
        }

        [HttpPost("post")]
        public async Task<IActionResult> TogglePostReaction([FromBody] AddReactionDto dto)
        {
            try
            {
                var response = await _memoryService.ToggleReactionAsync(dto.MemoryId, dto.UserId, dto.EmojiType);
                return Ok(response);
            }
            catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
        }

        // ─── DTOs ───
        public class AddReactionDto
        {
            public Guid MemoryId { get; set; }
            public Guid UserId { get; set; }
            public string EmojiType { get; set; } = "❤️";
        }
    }
}

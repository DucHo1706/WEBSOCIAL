using Microsoft.AspNetCore.Mvc;
using backend.Services;
using System;
using System.Threading.Tasks;

namespace backend.Controllers
{
    [ApiController]
    [Route("api/comment")]
    public class CommentController : ControllerBase
    {
        private readonly IMemoryService _memoryService;

        public CommentController(IMemoryService memoryService)
        {
            _memoryService = memoryService;
        }

        [HttpPost("{memoryId}")]
        public async Task<IActionResult> AddComment(Guid memoryId, [FromBody] AddCommentDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Text))
                return BadRequest(new { message = "Comment text cannot be empty." });

            try
            {
                var responseComment = await _memoryService.AddCommentAsync(memoryId, dto.UserId, dto.Text, dto.ParentCommentId);
                return Ok(responseComment);
            }
            catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
        }

        [HttpPut("{commentId}")]
        public async Task<IActionResult> UpdateComment(Guid commentId, [FromBody] UpdateCommentDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Text))
                return BadRequest(new { message = "Comment text cannot be empty." });

            try
            {
                var comment = await _memoryService.UpdateCommentAsync(commentId, dto.UserId, dto.Text);
                return Ok(comment);
            }
            catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
        }

        [HttpDelete("{commentId}")]
        public async Task<IActionResult> DeleteComment(Guid commentId, [FromQuery] Guid userId)
        {
            try
            {
                await _memoryService.DeleteCommentAsync(commentId, userId);
                return Ok(new { message = "Bình luận đã được xóa." });
            }
            catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
        }

        [HttpPost("{commentId}/pin")]
        public async Task<IActionResult> PinComment(Guid commentId, [FromQuery] Guid userId)
        {
            try
            {
                await _memoryService.PinCommentAsync(commentId, userId);
                return Ok(new { message = "Đã ghim bình luận." });
            }
            catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
        }

        [HttpPost("{commentId}/unpin")]
        public async Task<IActionResult> UnpinComment(Guid commentId, [FromQuery] Guid userId)
        {
            try
            {
                await _memoryService.UnpinCommentAsync(commentId, userId);
                return Ok(new { message = "Đã bỏ ghim bình luận." });
            }
            catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
        }

        [HttpPost("react")]
        public async Task<IActionResult> ToggleCommentReaction([FromBody] AddCommentReactionDto dto)
        {
            try
            {
                var result = await _memoryService.ToggleCommentReactionAsync(dto.CommentId, dto.UserId, dto.EmojiType);
                return Ok(result);
            }
            catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
        }

        // ─── DTOs ───
        public class UpdateCommentDto
        {
            public Guid UserId { get; set; }
            public string Text { get; set; } = string.Empty;
        }

        public class AddCommentDto
        {
            public Guid MemoryId { get; set; }
            public Guid UserId { get; set; }
            public Guid? ParentCommentId { get; set; }
            public string Text { get; set; } = string.Empty;
        }

        public class AddCommentReactionDto
        {
            public Guid CommentId { get; set; }
            public Guid UserId { get; set; }
            public string EmojiType { get; set; } = "❤️";
        }
    }
}

using Microsoft.AspNetCore.Mvc;
using backend.Services;
using System;
using System.IO;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;

namespace backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class StoryController : ControllerBase
    {
        private readonly IStoryService _storyService;
        private readonly IWebHostEnvironment _env;

        public StoryController(IStoryService storyService, IWebHostEnvironment env)
        {
            _storyService = storyService;
            _env = env;
        }

        [HttpPost("upload")]
        public async Task<IActionResult> UploadStory([FromForm] UploadStoryDto dto)
        {
            if (dto.Image == null || dto.Image.Length == 0)
                return BadRequest(new { message = "An image file is required." });

            try
            {
                var uploadsFolder = Path.Combine(_env.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot"), "uploads");
                if (!Directory.Exists(uploadsFolder))
                    Directory.CreateDirectory(uploadsFolder);

                var uniqueFileName = $"{Guid.NewGuid()}{Path.GetExtension(dto.Image.FileName)}";
                var filePath = Path.Combine(uploadsFolder, uniqueFileName);

                using (var fileStream = new FileStream(filePath, FileMode.Create))
                    await dto.Image.CopyToAsync(fileStream);

                var imageWebUrl = $"/uploads/{uniqueFileName}";
                var story = await _storyService.CreateStoryAsync(dto.UserId, imageWebUrl, dto.Caption);
                return Ok(story);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpGet("active/{userId}")]
        public async Task<IActionResult> GetActiveStories(Guid userId)
        {
            try
            {
                var list = await _storyService.GetActiveStoriesGroupedAsync(userId);
                return Ok(list);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // POST /api/story/react  { storyId, userId, emojiType }
        [HttpPost("react")]
        public async Task<IActionResult> ReactToStory([FromBody] StoryReactDto dto)
        {
            try
            {
                await _storyService.AddStoryReactionAsync(dto.StoryId, dto.UserId, dto.EmojiType);
                return Ok(new { message = "Đã ghi nhận cảm xúc." });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // GET /api/story/{storyId}/reactions
        [HttpGet("{storyId}/reactions")]
        public async Task<IActionResult> GetReactions(Guid storyId)
        {
            try
            {
                var list = await _storyService.GetReactionsForStoryAsync(storyId);
                return Ok(list);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // POST /api/story/comment  { storyId, userId, text }
        [HttpPost("comment")]
        public async Task<IActionResult> CommentStory([FromBody] StoryCommentDto dto)
        {
            try
            {
                await _storyService.SendStoryCommentAsync(dto.StoryId, dto.UserId, dto.Text);
                return Ok(new { message = "Đã gửi phản hồi vào Trò chuyện riêng thành công." });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }

    public class UploadStoryDto
    {
        public IFormFile? Image { get; set; }
        public Guid UserId { get; set; }
        public string? Caption { get; set; }
    }

    public class StoryReactDto
    {
        public Guid StoryId { get; set; }
        public Guid UserId { get; set; }
        public string EmojiType { get; set; } = string.Empty;
    }

    public class StoryCommentDto
    {
        public Guid StoryId { get; set; }
        public Guid UserId { get; set; }
        public string Text { get; set; } = string.Empty;
    }
}

using Microsoft.AspNetCore.Mvc;
using backend.Services;
using System;
using System.IO;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;

namespace backend.Controllers
{
    [ApiController]
    [Route("api/memory")]
    public class MemoryController : ControllerBase
    {
        private readonly IMemoryService _memoryService;
        private readonly ImgBbService _imgBbService;

        public MemoryController(IMemoryService memoryService, ImgBbService imgBbService)
        {
            _memoryService = memoryService;
            _imgBbService = imgBbService;
        }

        [HttpPost("upload")]
        public async Task<IActionResult> UploadMemory([FromForm] UploadMemoryDto dto)
        {
            if (dto.Images == null || dto.Images.Count == 0 || dto.Images[0] == null || dto.Images[0].Length == 0)
                return BadRequest(new { message = "At least one image file is required." });

            try
            {
                var imageUrls = new List<string>();
                foreach (var image in dto.Images)
                {
                    if (image == null || image.Length == 0) continue;
                    var uploadedUrl = await _imgBbService.UploadImageAsync(image);
                    if (!string.IsNullOrEmpty(uploadedUrl)) imageUrls.Add(uploadedUrl);
                }

                var memory = await _memoryService.CreateMemoryAsync(
                    dto.UserId, 
                    dto.GroupId == Guid.Empty ? null : dto.GroupId, 
                    dto.Caption, imageUrls, dto.Category, dto.Privacy);
                return Ok(memory);
            }
            catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
        }

        [HttpPut("{memoryId}")]
        public async Task<IActionResult> UpdateMemory(Guid memoryId, [FromForm] UpdateMemoryDto dto)
        {
            try
            {
                List<string>? newImageUrls = null;
                if (dto.Images != null && dto.Images.Count > 0 && dto.Images[0] != null && dto.Images[0].Length > 0)
                {
                    newImageUrls = new List<string>();
                    foreach (var image in dto.Images)
                    {
                        if (image == null || image.Length == 0) continue;
                        var uploadedUrl = await _imgBbService.UploadImageAsync(image);
                        if (!string.IsNullOrEmpty(uploadedUrl)) newImageUrls.Add(uploadedUrl);
                    }
                }

                var memory = await _memoryService.UpdateMemoryAsync(memoryId, dto.UserId, dto.Caption, dto.Category, dto.Privacy, newImageUrls);
                return Ok(memory);
            }
            catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
        }

        [HttpDelete("{memoryId}")]
        public async Task<IActionResult> DeleteMemory(Guid memoryId, [FromQuery] Guid userId)
        {
            try
            {
                await _memoryService.DeleteMemoryAsync(memoryId, userId);
                return Ok(new { message = "Bài viết đã được xóa." });
            }
            catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
        }

        [HttpPost("share")]
        public async Task<IActionResult> ShareMemory([FromBody] ShareMemoryDto dto)
        {
            try
            {
                var shared = await _memoryService.ShareMemoryAsync(dto.UserId, dto.OriginalMemoryId, dto.Caption);
                return Ok(shared);
            }
            catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
        }

        [HttpGet("feed")]
        public async Task<IActionResult> GetFeed([FromQuery] Guid userId, [FromQuery] string? category)
        {
            try
            {
                var feed = await _memoryService.GetFeedAsync(userId, category);
                return Ok(feed);
            }
            catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
        }

        [HttpGet("group/{groupId}")]
        public async Task<IActionResult> GetMemories(Guid groupId, [FromQuery] string? category)
        {
            try
            {
                var memories = await _memoryService.GetGroupMemoriesAsync(groupId, category);
                return Ok(memories);
            }
            catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
        }

        // ─── DTOs ───
        public class UploadMemoryDto
        {
            public List<IFormFile>? Images { get; set; }
            public string? Caption { get; set; }
            public string? Category { get; set; }
            public string? Privacy { get; set; }
            public Guid? GroupId { get; set; }
            public Guid UserId { get; set; }
        }

        public class ShareMemoryDto
        {
            public Guid UserId { get; set; }
            public Guid OriginalMemoryId { get; set; }
            public string? Caption { get; set; }
        }

        public class UpdateMemoryDto
        {
            public Guid UserId { get; set; }
            public string? Caption { get; set; }
            public string? Category { get; set; }
            public string? Privacy { get; set; }
            public List<IFormFile>? Images { get; set; }
        }
    }
}

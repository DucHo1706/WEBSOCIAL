using Microsoft.AspNetCore.Mvc;
using backend.Services;
using System;
using System.Threading.Tasks;

namespace backend.Controllers
{
    [ApiController]
    [Route("api/memory")]
    public class MemoryFeatureController : ControllerBase
    {
        private readonly IMemoryService _memoryService;

        public MemoryFeatureController(IMemoryService memoryService)
        {
            _memoryService = memoryService;
        }

        // ─── Pin/Unpin Memory ───
        [HttpPost("{memoryId}/pin")]
        public async Task<IActionResult> PinMemory(Guid memoryId, [FromQuery] Guid userId, [FromQuery] bool isPinned = true)
        {
            try
            {
                await _memoryService.PinMemoryAsync(memoryId, userId, isPinned);
                return Ok(new { message = isPinned ? "Đã ghim bài viết." : "Đã bỏ ghim bài viết." });
            }
            catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
        }

        // ─── Toggle comments lock ───
        [HttpPost("{memoryId}/toggle-comments")]
        public async Task<IActionResult> ToggleCommentsLock(Guid memoryId, [FromQuery] Guid userId, [FromQuery] bool isLocked = true)
        {
            try
            {
                await _memoryService.ToggleCommentsLockAsync(memoryId, userId, isLocked);
                return Ok(new { message = isLocked ? "Đã tắt bình luận." : "Đã bật bình luận." });
            }
            catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
        }

        // ─── Save/Bookmark memory ───
        [HttpPost("{memoryId}/save")]
        public async Task<IActionResult> ToggleSaveMemory(Guid memoryId, [FromQuery] Guid userId)
        {
            try
            {
                await _memoryService.ToggleSaveMemoryAsync(memoryId, userId);
                return Ok(new { message = "Đã cập nhật lưu bài viết." });
            }
            catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
        }

        [HttpGet("{memoryId}/is-saved")]
        public async Task<IActionResult> IsMemorySaved(Guid memoryId, [FromQuery] Guid userId)
        {
            try
            {
                var isSaved = await _memoryService.IsMemorySavedAsync(memoryId, userId);
                return Ok(new { isSaved });
            }
            catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
        }

        // ─── Hide memory ───
        [HttpPost("{memoryId}/hide")]
        public async Task<IActionResult> ToggleHideMemory(Guid memoryId, [FromQuery] Guid userId)
        {
            try
            {
                await _memoryService.ToggleHideMemoryAsync(memoryId, userId);
                return Ok(new { message = "Đã cập nhật ẩn bài viết." });
            }
            catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
        }

        // ─── Report memory ───
        [HttpPost("{memoryId}/report")]
        public async Task<IActionResult> ReportMemory(Guid memoryId, [FromBody] ReportMemoryDto dto)
        {
            try
            {
                await _memoryService.ReportMemoryAsync(memoryId, dto.UserId, dto.Reason, dto.Description ?? string.Empty);
                return Ok(new { message = "Báo cáo đã được gửi." });
            }
            catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
        }

        // ─── Post notification toggle ───
        [HttpPost("{memoryId}/notifications")]
        public async Task<IActionResult> TogglePostNotification(Guid memoryId, [FromQuery] Guid userId, [FromQuery] bool enabled = true)
        {
            try
            {
                await _memoryService.TogglePostNotificationAsync(memoryId, userId, enabled);
                return Ok(new { message = enabled ? "Đã bật thông báo." : "Đã tắt thông báo." });
            }
            catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
        }

        // ─── DTOs ───
        public class ReportMemoryDto
        {
            public Guid UserId { get; set; }
            public string Reason { get; set; } = string.Empty;
            public string? Description { get; set; }
        }
    }
}

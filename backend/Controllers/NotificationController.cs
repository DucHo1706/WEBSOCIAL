using Microsoft.AspNetCore.Mvc;
using backend.Services;
using System;
using System.Threading.Tasks;

namespace backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class NotificationController : ControllerBase
    {
        private readonly INotificationService _notificationService;

        public NotificationController(INotificationService notificationService)
        {
            _notificationService = notificationService;
        }

        [HttpGet("{userId}")]
        public async Task<IActionResult> GetNotifications(Guid userId)
        {
            try
            {
                var list = await _notificationService.GetNotificationsAsync(userId);
                return Ok(list);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("read/{userId}")]
        public async Task<IActionResult> MarkAllAsRead(Guid userId)
        {
            try
            {
                await _notificationService.MarkAllAsReadAsync(userId);
                return Ok(new { message = "All notifications marked as read." });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }
}

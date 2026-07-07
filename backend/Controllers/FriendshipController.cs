using Microsoft.AspNetCore.Mvc;
using backend.Services;
using System;
using System.Threading.Tasks;

namespace backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class FriendshipController : ControllerBase
    {
        private readonly IFriendshipService _friendshipService;

        public FriendshipController(IFriendshipService friendshipService)
        {
            _friendshipService = friendshipService;
        }

        [HttpGet("users/{currentUserId}")]
        public async Task<IActionResult> GetAllUsers(Guid currentUserId)
        {
            try
            {
                var result = await _friendshipService.GetAllUsersAsync(currentUserId);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("request")]
        public async Task<IActionResult> SendFriendRequest([FromBody] FriendRequestDto dto)
        {
            try
            {
                var friendship = await _friendshipService.SendFriendRequestAsync(dto.SenderId, dto.ReceiverId);
                return Ok(new { message = "Friend request sent successfully.", friendship.FriendshipId, friendship.Status });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("accept")]
        public async Task<IActionResult> AcceptFriendRequest([FromBody] FriendAcceptDto dto)
        {
            try
            {
                var request = await _friendshipService.AcceptFriendRequestAsync(dto.FriendshipId);
                if (request == null)
                {
                    return NotFound(new { message = "Friend request not found." });
                }
                return Ok(new { message = "Friend request accepted.", request.FriendshipId, request.Status });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("remove")]
        public async Task<IActionResult> RemoveFriend([FromBody] FriendAcceptDto dto)
        {
            try
            {
                await _friendshipService.RemoveFriendAsync(dto.FriendshipId);
                return Ok(new { message = "Friend removed successfully." });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpGet("friends/{userId}")]
        public async Task<IActionResult> GetFriends(Guid userId)
        {
            try
            {
                var friends = await _friendshipService.GetFriendsAsync(userId);
                return Ok(friends);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }

    public class FriendRequestDto
    {
        public Guid SenderId { get; set; }
        public Guid ReceiverId { get; set; }
    }

    public class FriendAcceptDto
    {
        public Guid FriendshipId { get; set; }
    }
}

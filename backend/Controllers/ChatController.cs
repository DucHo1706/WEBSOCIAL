using Microsoft.AspNetCore.Mvc;
using backend.Services;
using System;
using System.IO;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;

namespace backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ChatController : ControllerBase
    {
        private readonly IChatService _chatService;
        private readonly ImgBbService _imgBbService;

        public ChatController(IChatService chatService, ImgBbService imgBbService)
        {
            _chatService = chatService;
            _imgBbService = imgBbService;
        }

        [HttpGet("conversations/{userId}")]
        public async Task<IActionResult> GetConversations(Guid userId)
        {
            try
            {
                var conversations = await _chatService.GetConversationsAsync(userId);
                return Ok(conversations);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpGet("history/direct/{userId1}/{userId2}")]
        public async Task<IActionResult> GetDirectChatHistory(Guid userId1, Guid userId2)
        {
            try
            {
                var history = await _chatService.GetDirectChatHistoryAsync(userId1, userId2);
                return Ok(history);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpGet("history/group/{groupChatId}")]
        public async Task<IActionResult> GetGroupChatHistory(Guid groupChatId)
        {
            try
            {
                var history = await _chatService.GetGroupChatHistoryAsync(groupChatId);
                return Ok(history);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("group/create")]
        public async Task<IActionResult> CreateGroupChat([FromBody] CreateGroupChatDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.GroupName) || dto.MemberIds == null || dto.MemberIds.Count == 0)
            {
                return BadRequest(new { message = "GroupName and Members are required." });
            }

            try
            {
                var groupChat = await _chatService.CreateGroupChatAsync(dto.GroupName, dto.MemberIds);
                return Ok(new { groupChat.GroupChatId, groupChat.GroupName, groupChat.CreatedAt });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("send")]
        public async Task<IActionResult> SendChatMessage([FromForm] SendMessageDto dto)
        {
            try
            {
                string? imageWebUrl = null;

                // Handle image upload using ImgBB API
                if (dto.Image != null && dto.Image.Length > 0)
                {
                    imageWebUrl = await _imgBbService.UploadImageAsync(dto.Image);
                }

                var responseMessage = await _chatService.SaveChatMessageAsync(dto.UserId, dto.ReceiverId, dto.GroupChatId, dto.MessageText, imageWebUrl, dto.ReplyToMessageId, dto.ReplyToText);
                return Ok(responseMessage);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("recall/{messageId}")]
        public async Task<IActionResult> RecallMessage(Guid messageId, [FromQuery] Guid userId)
        {
            try
            {
                var success = await _chatService.RecallMessageAsync(messageId, userId);
                if (success)
                {
                    return Ok(new { message = "Tin nhắn đã được thu hồi." });
                }
                return BadRequest(new { message = "Không thể thu hồi tin nhắn." });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }

    public class CreateGroupChatDto
    {
        public string GroupName { get; set; } = string.Empty;
        public List<Guid> MemberIds { get; set; } = new List<Guid>();
    }

    public class SendMessageDto
    {
        public Guid UserId { get; set; } // Sender
        public Guid? ReceiverId { get; set; } // 1-1 DM
        public Guid? GroupChatId { get; set; } // Group DM
        public string? MessageText { get; set; }
        public IFormFile? Image { get; set; }
        public Guid? ReplyToMessageId { get; set; }
        public string? ReplyToText { get; set; }
    }
}

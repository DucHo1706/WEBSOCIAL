using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using backend.Models;
using backend.Repositories;
using Microsoft.AspNetCore.SignalR;
using backend.Hubs;

namespace backend.Services
{
    public interface IChatService
    {
        Task<List<ConversationDto>> GetConversationsAsync(Guid userId);
        Task<List<ChatMessageResponseDto>> GetDirectChatHistoryAsync(Guid userId1, Guid userId2);
        Task<List<ChatMessageResponseDto>> GetGroupChatHistoryAsync(Guid groupChatId);
        Task<GroupChat> CreateGroupChatAsync(string groupName, List<Guid> memberIds);
        Task<ChatMessageResponseDto> SaveChatMessageAsync(Guid userId, Guid? receiverId, Guid? groupChatId, string? messageText, string? imageUrl, Guid? replyToMessageId = null, string? replyToText = null);
        Task<bool> RecallMessageAsync(Guid messageId, Guid userId);
    }

    public class ChatService : IChatService
    {
        private readonly IChatRepository _chatRepository;
        private readonly IFriendshipRepository _friendshipRepository;
        private readonly IUserRepository _userRepository;
        private readonly IActivityLogRepository _activityLogRepository;
        private readonly IHubContext<MemoryHub> _hubContext;

        public ChatService(
            IChatRepository chatRepository,
            IFriendshipRepository friendshipRepository,
            IUserRepository userRepository,
            IActivityLogRepository activityLogRepository,
            IHubContext<MemoryHub> hubContext)
        {
            _chatRepository = chatRepository;
            _friendshipRepository = friendshipRepository;
            _userRepository = userRepository;
            _activityLogRepository = activityLogRepository;
            _hubContext = hubContext;
        }

        public async Task<List<ConversationDto>> GetConversationsAsync(Guid userId)
        {
            var friendships = await _friendshipRepository.GetFriendshipsByUserIdAsync(userId);
            var friends = friendships
                .Where(f => f.Status == "Accepted")
                .Select(f => f.SenderId == userId ? f.Receiver : f.Sender)
                .Select(u => new ConversationDto { UserId = u!.UserId, Username = u.Username, AvatarUrl = u.AvatarUrl, IsGroup = false, Name = u.Username })
                .ToList();

            var groupMemberships = await _chatRepository.GetGroupChatsByUserIdAsync(userId);
            var groupChats = groupMemberships
                .Select(gcm => new ConversationDto { UserId = gcm.GroupChatId, Username = gcm.GroupChat!.GroupName, AvatarUrl = "", IsGroup = true, Name = gcm.GroupChat.GroupName })
                .ToList();

            return friends.Concat(groupChats).ToList();
        }

        public async Task<List<ChatMessageResponseDto>> GetDirectChatHistoryAsync(Guid userId1, Guid userId2)
        {
            var messages = await _chatRepository.GetDirectChatHistoryAsync(userId1, userId2);
            return messages.Select(cm => new ChatMessageResponseDto
            {
                ChatMessageId = cm.ChatMessageId,
                UserId = cm.UserId,
                User = new ChatUserDto { UserId = cm.User!.UserId, Username = cm.User.Username, AvatarUrl = cm.User.AvatarUrl },
                ReceiverId = cm.ReceiverId,
                MessageText = cm.MessageText,
                ImageUrl = cm.ImageUrl,
                CreatedAt = cm.CreatedAt,
                ReplyToMessageId = cm.ReplyToMessageId,
                ReplyToText = cm.ReplyToText,
                ReactionsJson = cm.ReactionsJson,
                IsPinned = cm.IsPinned,
                IsDeleted = cm.IsDeleted
            }).ToList();
        }

        public async Task<List<ChatMessageResponseDto>> GetGroupChatHistoryAsync(Guid groupChatId)
        {
            var messages = await _chatRepository.GetGroupChatHistoryAsync(groupChatId);
            
            // Get group details
            var groupChat = await _chatRepository.GetGroupChatByIdAsync(groupChatId);
            string groupName = groupChat?.GroupName ?? string.Empty;

            return messages.Select(cm => new ChatMessageResponseDto
            {
                ChatMessageId = cm.ChatMessageId,
                GroupChatId = cm.GroupChatId,
                GroupChatName = groupName,
                UserId = cm.UserId,
                User = new ChatUserDto { UserId = cm.User!.UserId, Username = cm.User.Username, AvatarUrl = cm.User.AvatarUrl },
                MessageText = cm.MessageText,
                ImageUrl = cm.ImageUrl,
                CreatedAt = cm.CreatedAt,
                ReplyToMessageId = cm.ReplyToMessageId,
                ReplyToText = cm.ReplyToText,
                ReactionsJson = cm.ReactionsJson,
                IsPinned = cm.IsPinned,
                IsDeleted = cm.IsDeleted
            }).ToList();
        }

        public async Task<GroupChat> CreateGroupChatAsync(string groupName, List<Guid> memberIds)
        {
            var groupChat = new GroupChat
            {
                GroupName = groupName.Trim()
            };

            await _chatRepository.AddGroupChatAsync(groupChat);

            foreach (var memberId in memberIds)
            {
                var member = new GroupChatMember
                {
                    GroupChatId = groupChat.GroupChatId,
                    UserId = memberId
                };
                await _chatRepository.AddGroupChatMemberAsync(member);
            }

            await _chatRepository.SaveChangesAsync();

            // Log activity for the members
            foreach (var mId in memberIds)
            {
                await _activityLogRepository.LogActivityAsync(mId, "ChatGroupCreate", $"Đã tham gia nhóm chat mới '{groupName}'.");
            }

            return groupChat;
        }

        public async Task<ChatMessageResponseDto> SaveChatMessageAsync(Guid userId, Guid? receiverId, Guid? groupChatId, string? messageText, string? imageUrl, Guid? replyToMessageId = null, string? replyToText = null)
        {
            var user = await _userRepository.GetByIdAsync(userId);
            if (user == null) throw new Exception("User not found.");

            var message = new ChatMessage
            {
                UserId = userId,
                ReceiverId = receiverId,
                GroupChatId = groupChatId,
                MessageText = messageText?.Trim() ?? string.Empty,
                ImageUrl = imageUrl,
                ReplyToMessageId = replyToMessageId,
                ReplyToText = replyToText
            };

            await _chatRepository.AddChatMessageAsync(message);
            await _chatRepository.SaveChangesAsync();

            string? groupChatName = null;
            if (groupChatId.HasValue)
            {
                var gc = await _chatRepository.GetGroupChatByIdAsync(groupChatId.Value);
                groupChatName = gc?.GroupName;
            }

            var dto = new ChatMessageResponseDto
            {
                ChatMessageId = message.ChatMessageId,
                UserId = message.UserId,
                User = new ChatUserDto { UserId = user.UserId, Username = user.Username, AvatarUrl = user.AvatarUrl },
                ReceiverId = message.ReceiverId,
                GroupChatId = message.GroupChatId,
                GroupChatName = groupChatName ?? string.Empty,
                MessageText = message.MessageText,
                ImageUrl = message.ImageUrl,
                CreatedAt = message.CreatedAt,
                ReplyToMessageId = message.ReplyToMessageId,
                ReplyToText = message.ReplyToText,
                ReactionsJson = message.ReactionsJson,
                IsPinned = message.IsPinned,
                IsDeleted = message.IsDeleted
            };

            // Log activity
            if (groupChatId.HasValue)
            {
                await _activityLogRepository.LogActivityAsync(userId, "Message", "Đã gửi tin nhắn trong nhóm chat.");
            }
            else if (receiverId.HasValue)
            {
                var receiver = await _userRepository.GetByIdAsync(receiverId.Value);
                string detail = receiver != null ? $"Đã gửi một tin nhắn đến {receiver.Username}." : "Đã gửi một tin nhắn cá nhân.";
                await _activityLogRepository.LogActivityAsync(userId, "Message", detail);
            }

            // Broadcast via SignalR
            if (groupChatId.HasValue)
            {
                await _hubContext.Clients.Group(groupChatId.Value.ToString()).SendAsync("OnNewMessage", dto);
            }
            else if (receiverId.HasValue)
            {
                await _hubContext.Clients.Group(userId.ToString()).SendAsync("OnNewMessage", dto);
                await _hubContext.Clients.Group(receiverId.Value.ToString()).SendAsync("OnNewMessage", dto);
            }

            return dto;
        }

        public async Task<bool> RecallMessageAsync(Guid messageId, Guid userId)
        {
            var message = await _chatRepository.GetMessageByIdAsync(messageId);
            if (message == null || message.UserId != userId) return false;

            message.IsDeleted = true;
            message.DeletedAt = DateTime.UtcNow;
            await _chatRepository.SaveChangesAsync();

            // Broadcast the recall event via SignalR so other clients remove/update it in real-time
            var targetId = message.GroupChatId.HasValue ? message.GroupChatId.Value.ToString() : message.ReceiverId.Value.ToString();
            await _hubContext.Clients.Group(targetId).SendAsync("OnMessageRecalled", messageId);
            await _hubContext.Clients.Group(message.UserId.ToString()).SendAsync("OnMessageRecalled", messageId);

            return true;
        }
    }

    public class ConversationDto
    {
        public Guid UserId { get; set; }
        public string Username { get; set; } = string.Empty;
        public string AvatarUrl { get; set; } = string.Empty;
        public bool IsGroup { get; set; }
        public string Name { get; set; } = string.Empty;
    }

    public class ChatMessageResponseDto
    {
        public Guid ChatMessageId { get; set; }
        public Guid UserId { get; set; }
        public ChatUserDto? User { get; set; }
        public Guid? ReceiverId { get; set; }
        public Guid? GroupChatId { get; set; }
        public string? GroupChatName { get; set; }
        public string MessageText { get; set; } = string.Empty;
        public string? ImageUrl { get; set; }
        public DateTime CreatedAt { get; set; }
        public Guid? ReplyToMessageId { get; set; }
        public string? ReplyToText { get; set; }
            public string ReactionsJson { get; set; } = "[]";
        public bool IsPinned { get; set; }
        public bool IsDeleted { get; set; }
    }

    public class ChatUserDto
    {
        public Guid UserId { get; set; }
        public string Username { get; set; } = string.Empty;
        public string AvatarUrl { get; set; } = string.Empty;
    }
}

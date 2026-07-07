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
    public interface IStoryService
    {
        Task<Story> CreateStoryAsync(Guid userId, string imageUrl, string? caption);
        Task<List<StoryGroupDto>> GetActiveStoriesGroupedAsync(Guid currentUserId);
        Task AddStoryReactionAsync(Guid storyId, Guid userId, string emojiType);
        Task<List<StoryReactionResponseDto>> GetReactionsForStoryAsync(Guid storyId);
        Task SendStoryCommentAsync(Guid storyId, Guid userId, string text);
    }

    public class StoryService : IStoryService
    {
        private readonly IStoryRepository _storyRepository;
        private readonly IFriendshipRepository _friendshipRepository;
        private readonly IUserRepository _userRepository;
        private readonly IChatRepository _chatRepository;
        private readonly IActivityLogRepository _activityLogRepository;
        private readonly INotificationService _notificationService;
        private readonly IHubContext<MemoryHub> _hubContext;

        public StoryService(
            IStoryRepository storyRepository,
            IFriendshipRepository friendshipRepository,
            IUserRepository userRepository,
            IChatRepository chatRepository,
            IActivityLogRepository activityLogRepository,
            INotificationService notificationService,
            IHubContext<MemoryHub> hubContext)
        {
            _storyRepository = storyRepository;
            _friendshipRepository = friendshipRepository;
            _userRepository = userRepository;
            _chatRepository = chatRepository;
            _activityLogRepository = activityLogRepository;
            _notificationService = notificationService;
            _hubContext = hubContext;
        }

        public async Task<Story> CreateStoryAsync(Guid userId, string imageUrl, string? caption)
        {
            var user = await _userRepository.GetByIdAsync(userId);
            if (user == null) throw new Exception("User not found.");

            var story = new Story
            {
                UserId = userId,
                ImageUrl = imageUrl,
                Caption = caption
            };

            await _storyRepository.AddAsync(story);
            await _storyRepository.SaveChangesAsync();

            // Set navigation property for SignalR broadcast
            story.User = user;

            // Log activity
            await _activityLogRepository.LogActivityAsync(userId, "StoryUpload", "Đã đăng một Tin mới biến mất sau 24h.");

            // Broadcast real-time
            await _hubContext.Clients.All.SendAsync("OnNewStory", new StoryItemDto
            {
                StoryId = story.StoryId,
                UserId = story.UserId,
                Username = user.Username,
                AvatarUrl = user.AvatarUrl,
                ImageUrl = story.ImageUrl,
                Caption = story.Caption,
                CreatedAt = story.CreatedAt
            });

            return story;
        }

        public async Task<List<StoryGroupDto>> GetActiveStoriesGroupedAsync(Guid currentUserId)
        {
            // Get all accepted friends of the user
            var friendships = await _friendshipRepository.GetFriendshipsByUserIdAsync(currentUserId);
            var activeFriendIds = friendships
                .Where(f => f.Status == "Accepted")
                .Select(f => f.SenderId == currentUserId ? f.ReceiverId : f.SenderId)
                .ToList();

            // Always include current user's own stories
            var allVisibleUserIds = activeFriendIds.Concat(new[] { currentUserId }).ToList();

            // Fetch active stories
            var activeStories = await _storyRepository.GetActiveStoriesForUsersAsync(allVisibleUserIds);

            // Group by User
            var grouped = activeStories
                .GroupBy(s => s.UserId)
                .Select(g =>
                {
                    var firstStory = g.First();
                    return new StoryGroupDto
                    {
                        UserId = g.Key,
                        Username = firstStory.User?.Username ?? "Một người dùng",
                        AvatarUrl = firstStory.User?.AvatarUrl ?? "",
                        Items = g.Select(s => new StoryItemDto
                        {
                            StoryId = s.StoryId,
                            UserId = s.UserId,
                            Username = firstStory.User?.Username ?? "",
                            AvatarUrl = firstStory.User?.AvatarUrl ?? "",
                            ImageUrl = s.ImageUrl,
                            Caption = s.Caption,
                            CreatedAt = s.CreatedAt
                        }).ToList()
                    };
                })
                .OrderByDescending(g => g.UserId == currentUserId) // Put owner's stories first
                .ToList();

            return grouped;
        }

        public async Task AddStoryReactionAsync(Guid storyId, Guid userId, string emojiType)
        {
            var user = await _userRepository.GetByIdAsync(userId);
            if (user == null) throw new Exception("User not found.");

            var story = await _storyRepository.GetStoryByIdAsync(storyId);
            if (story == null) throw new Exception("Story not found.");

            // Upsert: one reaction per user per story (toggle same emoji, update if different)
            await _storyRepository.UpsertReactionAsync(storyId, userId, emojiType);
            await _storyRepository.SaveChangesAsync();

            // Log activity
            await _activityLogRepository.LogActivityAsync(userId, "StoryReaction", $"Đã thả cảm xúc {emojiType} vào Tin.");

            // Create notification for story owner (only once per reaction, not per spam)
            if (story.UserId != userId)
            {
                await _notificationService.CreateNotificationAsync(
                    story.UserId, 
                    userId, 
                    "StoryReaction", 
                    storyId, 
                    $"đã thả cảm xúc {emojiType} vào Tin của bạn."
                );
            }
        }

        public async Task<List<StoryReactionResponseDto>> GetReactionsForStoryAsync(Guid storyId)
        {
            var list = await _storyRepository.GetReactionsForStoryAsync(storyId);
            return list.Select(sr => new StoryReactionResponseDto
            {
                StoryReactionId = sr.StoryReactionId,
                UserId = sr.UserId,
                Username = sr.User?.Username ?? "Một người dùng",
                AvatarUrl = sr.User?.AvatarUrl ?? "",
                EmojiType = sr.EmojiType,
                CreatedAt = sr.CreatedAt
            }).ToList();
        }

        public async Task SendStoryCommentAsync(Guid storyId, Guid userId, string text)
        {
            var user = await _userRepository.GetByIdAsync(userId);
            if (user == null) throw new Exception("User not found.");

            var story = await _storyRepository.GetStoryByIdAsync(storyId);
            if (story == null) throw new Exception("Story not found.");

            // 1. Save ChatMessage with story image preview!
            var message = new ChatMessage
            {
                UserId = userId,
                ReceiverId = story.UserId,
                MessageText = $"💬 [Phản hồi Tin]: \"{text.Trim()}\"",
                ImageUrl = story.ImageUrl
            };
            await _chatRepository.AddChatMessageAsync(message);
            await _chatRepository.SaveChangesAsync();

            // Log activity
            await _activityLogRepository.LogActivityAsync(userId, "StoryComment", "Đã trả lời Tin qua tin nhắn riêng.");

            // 2. Broadcast SignalR message to sender/receiver groups
            var responseMessage = new ChatMessageResponseDto
            {
                ChatMessageId = message.ChatMessageId,
                UserId = message.UserId,
                User = new ChatUserDto { UserId = user.UserId, Username = user.Username, AvatarUrl = user.AvatarUrl },
                ReceiverId = message.ReceiverId,
                MessageText = message.MessageText,
                ImageUrl = message.ImageUrl,
                CreatedAt = message.CreatedAt
            };
            await _hubContext.Clients.Group(userId.ToString()).SendAsync("OnNewMessage", responseMessage);
            await _hubContext.Clients.Group(story.UserId.ToString()).SendAsync("OnNewMessage", responseMessage);

            // 3. Create Notification for story owner
            if (story.UserId != userId)
            {
                await _notificationService.CreateNotificationAsync(
                    story.UserId, 
                    userId, 
                    "StoryComment", 
                    storyId, 
                    $"đã phản hồi Tin của bạn: \"{(text.Length > 25 ? text.Substring(0, 22) + "..." : text)}\""
                );
            }
        }
    }

    public class StoryGroupDto
    {
        public Guid UserId { get; set; }
        public string Username { get; set; } = string.Empty;
        public string AvatarUrl { get; set; } = string.Empty;
        public List<StoryItemDto> Items { get; set; } = new();
    }

    public class StoryItemDto
    {
        public Guid StoryId { get; set; }
        public Guid UserId { get; set; }
        public string Username { get; set; } = string.Empty;
        public string AvatarUrl { get; set; } = string.Empty;
        public string ImageUrl { get; set; } = string.Empty;
        public string? Caption { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class StoryReactionResponseDto
    {
        public Guid StoryReactionId { get; set; }
        public Guid UserId { get; set; }
        public string Username { get; set; } = string.Empty;
        public string AvatarUrl { get; set; } = string.Empty;
        public string EmojiType { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
    }
}

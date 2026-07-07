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
    public interface IMemoryService
    {
        Task<Memory> CreateMemoryAsync(Guid userId, Guid? groupId, string? caption, List<string> imageUrls, string? category, string? privacy);
        Task<List<MemoryResponseDto>> GetFeedAsync(Guid currentUserId, string? category);
        Task<List<MemoryResponseDto>> GetGroupMemoriesAsync(Guid groupId, string? category);
        Task<Memory> UpdateMemoryAsync(Guid memoryId, Guid userId, string? caption, string? category, string? privacy, List<string>? newImageUrls = null);
        Task DeleteMemoryAsync(Guid memoryId, Guid userId);
        Task<Memory> ShareMemoryAsync(Guid userId, Guid originalMemoryId, string? caption);
        Task<CommentResponseDto> AddCommentAsync(Guid memoryId, Guid userId, string text, Guid? parentCommentId = null);
        Task<CommentResponseDto> UpdateCommentAsync(Guid commentId, Guid userId, string text);
        Task DeleteCommentAsync(Guid commentId, Guid userId);
        Task<ReactionResponseDto> ToggleReactionAsync(Guid memoryId, Guid userId, string emojiType);
        Task<ReactionResponseDto> ToggleCommentReactionAsync(Guid commentId, Guid userId, string emojiType);
        Task PinCommentAsync(Guid commentId, Guid userId);
        Task UnpinCommentAsync(Guid commentId, Guid userId);
    }

    public class MemoryService : IMemoryService
    {
        private readonly IMemoryRepository _memoryRepository;
        private readonly IUserRepository _userRepository;
        private readonly IFriendshipRepository _friendshipRepository;
        private readonly IActivityLogRepository _activityLogRepository;
        private readonly INotificationService _notificationService;
        private readonly IHubContext<MemoryHub> _hubContext;

        public MemoryService(
            IMemoryRepository memoryRepository, 
            IUserRepository userRepository, 
            IFriendshipRepository friendshipRepository,
            IActivityLogRepository activityLogRepository,
            INotificationService notificationService,
            IHubContext<MemoryHub> hubContext)
        {
            _memoryRepository = memoryRepository;
            _userRepository = userRepository;
            _friendshipRepository = friendshipRepository;
            _activityLogRepository = activityLogRepository;
            _notificationService = notificationService;
            _hubContext = hubContext;
        }

        public async Task<Memory> CreateMemoryAsync(Guid userId, Guid? groupId, string? caption, List<string> imageUrls, string? category, string? privacy)
        {
            var user = await _userRepository.GetByIdAsync(userId);
            if (user == null) throw new Exception("User not found.");

            var imagesJson = System.Text.Json.JsonSerializer.Serialize(imageUrls);
            var memory = new Memory
            {
                GroupId = groupId,
                UserId = userId,
                Caption = caption?.Trim() ?? string.Empty,
                ImageUrl = imageUrls.FirstOrDefault() ?? string.Empty,
                ImagesJson = imagesJson,
                Category = category?.Trim() ?? "Daily",
                Privacy = privacy?.Trim() ?? "Public"
            };

            await _memoryRepository.AddAsync(memory);
            await _memoryRepository.SaveChangesAsync();

            // FIX: Set navigation property AFTER saving to database to avoid EF Core primary key tracking collision
            memory.User = user;

            // Log activity
            await _activityLogRepository.LogActivityAsync(userId, "Post", "Đã chia sẻ một bài viết mới lên Bảng Tin.");

            // Broadcast real-time
            await _hubContext.Clients.All.SendAsync("OnNewMemory", memory);

            return memory;
        }

        public async Task<Memory> UpdateMemoryAsync(Guid memoryId, Guid userId, string? caption, string? category, string? privacy, List<string>? newImageUrls = null)
        {
            var memory = await _memoryRepository.GetByIdAsync(memoryId);
            if (memory == null) throw new Exception("Memory not found.");
            if (memory.UserId != userId) throw new Exception("You can only edit your own posts.");

            if (caption != null) memory.Caption = caption.Trim();
            if (category != null) memory.Category = category.Trim();
            if (privacy != null) memory.Privacy = privacy.Trim();

            if (newImageUrls != null && newImageUrls.Count > 0)
            {
                memory.ImageUrl = newImageUrls.FirstOrDefault() ?? memory.ImageUrl;
                memory.ImagesJson = System.Text.Json.JsonSerializer.Serialize(newImageUrls);
            }

            _memoryRepository.Update(memory);
            await _memoryRepository.SaveChangesAsync();

            await _activityLogRepository.LogActivityAsync(userId, "Update", "Đã cập nhật bài viết của mình.");

            return memory;
        }

        public async Task DeleteMemoryAsync(Guid memoryId, Guid userId)
        {
            var memory = await _memoryRepository.GetByIdAsync(memoryId);
            if (memory == null) throw new Exception("Memory not found.");

            // Soft Delete: mark as deleted, keep in DB
            memory.IsDeleted = true;
            memory.DeletedAt = DateTime.UtcNow;
            memory.Privacy = "Private"; // Auto make private when deleted

            _memoryRepository.Update(memory);
            await _memoryRepository.SaveChangesAsync();

            await _activityLogRepository.LogActivityAsync(userId, "Delete", "Đã xóa bài viết của mình (có thể khôi phục trong 30 ngày).");
        }

        public async Task<Memory> ShareMemoryAsync(Guid userId, Guid originalMemoryId, string? caption)
        {
            var original = await _memoryRepository.GetByIdAsync(originalMemoryId);
            if (original == null) throw new Exception("Original post not found.");

            var user = await _userRepository.GetByIdAsync(userId);
            if (user == null) throw new Exception("User not found.");

            var shared = new Memory
            {
                UserId = userId,
                SharedMemoryId = originalMemoryId,
                Caption = caption?.Trim() ?? string.Empty,
                ImageUrl = original.ImageUrl, // Copy the image
                Category = "Shared",
                Privacy = "Public"
            };

            await _memoryRepository.AddAsync(shared);
            await _memoryRepository.SaveChangesAsync();

            shared.User = user;

            await _activityLogRepository.LogActivityAsync(userId, "Share", "Đã chia sẻ bài viết của người khác.");

            // Don't broadcast shares globally - they'll show up on the user's profile
            // await _hubContext.Clients.All.SendAsync("OnNewMemory", shared);

            return shared;
        }

        public async Task<List<MemoryResponseDto>> GetFeedAsync(Guid currentUserId, string? category)
        {
            var memories = await _memoryRepository.GetFeedAsync(category);

            // Fetch accepted friendships to filter "Friends Only" posts
            var friendships = await _friendshipRepository.GetFriendshipsByUserIdAsync(currentUserId);
            var friendIds = friendships
                .Where(f => f.Status == "Accepted")
                .Select(f => f.SenderId == currentUserId ? f.ReceiverId : f.SenderId)
                .ToList();

            // Apply Facebook-Style Privacy Filtering
            var filteredMemories = memories.Where(m =>
                m.Privacy == "Public" ||
                m.UserId == currentUserId ||
                (m.Privacy == "Friends" && friendIds.Contains(m.UserId))
            ).ToList();

            return filteredMemories.Select(m => new MemoryResponseDto
            {
                MemoryId = m.MemoryId,
                GroupId = m.GroupId,
                UserId = m.UserId,
                User = new MemoryUserDto { UserId = m.User!.UserId, Username = m.User.Username, AvatarUrl = m.User.AvatarUrl },
                Caption = m.Caption,
                ImageUrl = m.ImageUrl,
                Category = m.Category,
                Privacy = m.Privacy,
                CreatedAt = m.CreatedAt,
                SharedMemoryId = m.SharedMemoryId,
                Images = GetImagesFromMemory(m),
                Comments = m.Comments.OrderBy(c => c.CreatedAt).Select(c => new CommentResponseDto
                {
                    CommentId = c.CommentId,
                    MemoryId = c.MemoryId,
                    UserId = c.UserId,
                    Text = c.Text,
                    CreatedAt = c.CreatedAt,
                    EditedAt = c.EditedAt,
                    IsPinned = c.IsPinned,
                    User = new MemoryUserDto { UserId = c.User!.UserId, Username = c.User.Username, AvatarUrl = c.User.AvatarUrl },
                    Replies = c.Replies?.OrderBy(r => r.CreatedAt).Select(r => new CommentResponseDto
                    {
                        CommentId = r.CommentId,
                        MemoryId = r.MemoryId,
                        UserId = r.UserId,
                        Text = r.Text,
                        CreatedAt = r.CreatedAt,
                        EditedAt = r.EditedAt,
                        IsPinned = r.IsPinned,
                        User = r.User == null ? null : new MemoryUserDto { UserId = r.User.UserId, Username = r.User.Username, AvatarUrl = r.User.AvatarUrl },
                        Reactions = r.Reactions?.Select(rr => new ReactionResponseDto
                        {
                            MemoryId = rr.CommentId != null ? Guid.Empty : Guid.Empty,
                            UserId = rr.UserId,
                            Username = rr.User?.Username ?? "",
                            EmojiType = rr.EmojiType,
                            IsRemoved = false
                        }).ToList()
                    }).ToList(),
                    Reactions = c.Reactions?.Select(cr => new ReactionResponseDto
                    {
                        MemoryId = cr.CommentId != null ? Guid.Empty : Guid.Empty,
                        UserId = cr.UserId,
                        Username = cr.User?.Username ?? "",
                        EmojiType = cr.EmojiType,
                        IsRemoved = false
                    }).ToList()
                }).ToList(),
                Reactions = m.Reactions.Select(r => new ReactionDetailDto
                {
                    ReactionId = r.ReactionId,
                    EmojiType = r.EmojiType,
                    User = new ReactionUserDto { UserId = r.User!.UserId, Username = r.User.Username }
                }).ToList()
            }).ToList();
        }

        public async Task<List<MemoryResponseDto>> GetGroupMemoriesAsync(Guid groupId, string? category)
        {
            var memories = await _memoryRepository.GetGroupMemoriesAsync(groupId, category);
            return memories.Select(m => new MemoryResponseDto
            {
                MemoryId = m.MemoryId,
                GroupId = m.GroupId,
                UserId = m.UserId,
                User = new MemoryUserDto { UserId = m.User!.UserId, Username = m.User.Username, AvatarUrl = m.User.AvatarUrl },
                Caption = m.Caption,
                ImageUrl = m.ImageUrl,
                Category = m.Category,
                Privacy = m.Privacy,
                CreatedAt = m.CreatedAt,
                Images = GetImagesFromMemory(m),
                Comments = m.Comments.OrderBy(c => c.CreatedAt).Select(c => new CommentResponseDto
                {
                    CommentId = c.CommentId,
                    MemoryId = c.MemoryId,
                    UserId = c.UserId,
                    ParentCommentId = c.ParentCommentId,
                    Text = c.Text,
                    CreatedAt = c.CreatedAt,
                    EditedAt = c.EditedAt,
                    IsPinned = c.IsPinned,
                    User = new MemoryUserDto { UserId = c.User!.UserId, Username = c.User.Username, AvatarUrl = c.User.AvatarUrl },
                    Replies = c.Replies?.OrderBy(r => r.CreatedAt).Select(r => new CommentResponseDto
                    {
                        CommentId = r.CommentId,
                        MemoryId = r.MemoryId,
                        UserId = r.UserId,
                        ParentCommentId = r.ParentCommentId,
                        Text = r.Text,
                        CreatedAt = r.CreatedAt,
                        EditedAt = r.EditedAt,
                        IsPinned = r.IsPinned,
                        User = r.User == null ? null : new MemoryUserDto { UserId = r.User.UserId, Username = r.User.Username, AvatarUrl = r.User.AvatarUrl },
                        Reactions = r.Reactions?.Select(rr => new ReactionResponseDto
                        {
                            MemoryId = rr.CommentId != null ? Guid.Empty : Guid.Empty,
                            UserId = rr.UserId,
                            Username = rr.User?.Username ?? "",
                            EmojiType = rr.EmojiType,
                            IsRemoved = false
                        }).ToList()
                    }).ToList(),
                    Reactions = c.Reactions?.Select(cr => new ReactionResponseDto
                    {
                        MemoryId = cr.CommentId != null ? Guid.Empty : Guid.Empty,
                        UserId = cr.UserId,
                        Username = cr.User?.Username ?? "",
                        EmojiType = cr.EmojiType,
                        IsRemoved = false
                    }).ToList()
                }).ToList(),
                Reactions = m.Reactions.Select(r => new ReactionDetailDto
                {
                    ReactionId = r.ReactionId,
                    EmojiType = r.EmojiType,
                    User = new ReactionUserDto { UserId = r.User!.UserId, Username = r.User.Username }
                }).ToList()
            }).ToList();
        }

        public async Task<CommentResponseDto> AddCommentAsync(Guid memoryId, Guid userId, string text, Guid? parentCommentId = null)
        {
            if (string.IsNullOrWhiteSpace(text)) throw new Exception("Comment cannot be empty.");
            var user = await _userRepository.GetByIdAsync(userId);
            if (user == null) throw new Exception("User not found.");

            var memory = await _memoryRepository.GetByIdAsync(memoryId);
            if (memory == null) throw new Exception("Memory not found.");

            var comment = new Comment
            {
                MemoryId = memoryId,
                UserId = userId,
                Text = text.Trim(),
                ParentCommentId = parentCommentId
            };

            await _memoryRepository.AddCommentAsync(comment);
            await _memoryRepository.SaveChangesAsync();

            // Log activity
            await _activityLogRepository.LogActivityAsync(userId, "Comment", "Đã bình luận vào một bài viết.");

            // Create notification record for post owner
            if (memory.UserId != userId)
            {
                await _notificationService.CreateNotificationAsync(
                    memory.UserId, 
                    userId, 
                    "Comment", 
                    memoryId, 
                    $"đã bình luận về bài viết của bạn: \"{(text.Length > 25 ? text.Substring(0, 22) + "..." : text)}\""
                );
            }

            var responseComment = new CommentResponseDto
            {
                CommentId = comment.CommentId,
                MemoryId = comment.MemoryId,
                ParentCommentId = comment.ParentCommentId,
                Text = comment.Text,
                CreatedAt = comment.CreatedAt,
                User = new MemoryUserDto { UserId = user.UserId, Username = user.Username, AvatarUrl = user.AvatarUrl }
            };

            await _hubContext.Clients.All.SendAsync("OnNewComment", responseComment);
            return responseComment;
        }

        public async Task<CommentResponseDto> UpdateCommentAsync(Guid commentId, Guid userId, string text)
        {
            var comment = await _memoryRepository.GetCommentByIdAsync(commentId);
            if (comment == null) throw new Exception("Comment not found.");
            if (comment.UserId != userId) throw new Exception("You can only edit your own comments.");

            comment.Text = text.Trim();
            await _memoryRepository.SaveChangesAsync();

            return new CommentResponseDto
            {
                CommentId = comment.CommentId,
                MemoryId = comment.MemoryId,
                Text = comment.Text,
                CreatedAt = comment.CreatedAt,
                User = new MemoryUserDto { UserId = comment.User!.UserId, Username = comment.User.Username, AvatarUrl = comment.User.AvatarUrl }
            };
        }

        public async Task DeleteCommentAsync(Guid commentId, Guid userId)
        {
            var comment = await _memoryRepository.GetCommentByIdAsync(commentId);
            if (comment == null) throw new Exception("Comment not found.");

            // Soft Delete
            comment.IsDeleted = true;
            comment.DeletedAt = DateTime.UtcNow;

            await _memoryRepository.SaveChangesAsync();
        }

        public async Task<ReactionResponseDto> ToggleReactionAsync(Guid memoryId, Guid userId, string emojiType)
        {
            var user = await _userRepository.GetByIdAsync(userId);
            if (user == null) throw new Exception("User not found.");

            var memory = await _memoryRepository.GetByIdAsync(memoryId);
            if (memory == null) throw new Exception("Memory not found.");

            var existingReaction = await _memoryRepository.GetReactionAsync(memoryId, userId, emojiType);

            if (existingReaction != null)
            {
                await _memoryRepository.RemoveReactionAsync(existingReaction);
                await _memoryRepository.SaveChangesAsync();

                var removeEvent = new ReactionResponseDto
                {
                    MemoryId = memoryId,
                    UserId = userId,
                    Username = user.Username,
                    EmojiType = emojiType,
                    IsRemoved = true
                };

                await _hubContext.Clients.All.SendAsync("OnReactionUpdate", removeEvent);
                return removeEvent;
            }
            else
            {
                var reaction = new Reaction
                {
                    MemoryId = memoryId,
                    UserId = userId,
                    EmojiType = emojiType
                };

                await _memoryRepository.AddReactionAsync(reaction);
                await _memoryRepository.SaveChangesAsync();

                // Log activity
                await _activityLogRepository.LogActivityAsync(userId, "Reaction", $"Đã thả biểu cảm {emojiType} vào một bài viết.");

                // Create notification record for post owner
                if (memory.UserId != userId)
                {
                    await _notificationService.CreateNotificationAsync(
                        memory.UserId, 
                        userId, 
                        "Reaction", 
                        memoryId, 
                        $"đã bày tỏ cảm xúc {emojiType} về bài viết của bạn."
                    );
                }

                var addEvent = new ReactionResponseDto
                {
                    ReactionId = reaction.ReactionId,
                    MemoryId = memoryId,
                    UserId = userId,
                    Username = user.Username,
                    EmojiType = emojiType,
                    IsRemoved = false
                };

                await _hubContext.Clients.All.SendAsync("OnReactionUpdate", addEvent);
                return addEvent;
            }
        }

        // Helper to parse ImagesJson into a List<string>
        public async Task<ReactionResponseDto> ToggleCommentReactionAsync(Guid commentId, Guid userId, string emojiType)
        {
            var user = await _userRepository.GetByIdAsync(userId);
            if (user == null) throw new Exception("User not found.");
            var comment = await _memoryRepository.GetCommentByIdAsync(commentId);
            if (comment == null) throw new Exception("Comment not found.");
            var existing = await _memoryRepository.GetCommentReactionAsync(commentId, userId, emojiType);
            if (existing != null)
            {
                _memoryRepository.RemoveCommentReaction(existing);
                await _memoryRepository.SaveChangesAsync();
                return new ReactionResponseDto { MemoryId = comment.MemoryId, UserId = userId, Username = user.Username, EmojiType = emojiType, IsRemoved = true };
            }
            else
            {
                var reaction = new CommentReaction { CommentId = commentId, UserId = userId, EmojiType = emojiType };
                await _memoryRepository.AddCommentReactionAsync(reaction);
                await _memoryRepository.SaveChangesAsync();
                return new ReactionResponseDto { MemoryId = comment.MemoryId, UserId = userId, Username = user.Username, EmojiType = emojiType, IsRemoved = false };
            }
        }

        public async Task PinCommentAsync(Guid commentId, Guid userId)
        {
            var comment = await _memoryRepository.GetCommentByIdAsync(commentId);
            if (comment == null) throw new Exception("Comment not found.");
            comment.IsPinned = true;
            comment.PinnedAt = DateTime.UtcNow;
            await _memoryRepository.SaveChangesAsync();
        }

        public async Task UnpinCommentAsync(Guid commentId, Guid userId)
        {
            var comment = await _memoryRepository.GetCommentByIdAsync(commentId);
            if (comment == null) throw new Exception("Comment not found.");
            comment.IsPinned = false;
            comment.PinnedAt = null;
            await _memoryRepository.SaveChangesAsync();
        }

        private List<string> GetImagesFromMemory(Memory memory)
        {
            if (string.IsNullOrWhiteSpace(memory.ImagesJson) || memory.ImagesJson == "[]")
            {
                return string.IsNullOrEmpty(memory.ImageUrl) ? new List<string>() : new List<string> { memory.ImageUrl };
            }
            try
            {
                return System.Text.Json.JsonSerializer.Deserialize<List<string>>(memory.ImagesJson) ?? new List<string>();
            }
            catch
            {
                return string.IsNullOrEmpty(memory.ImageUrl) ? new List<string>() : new List<string> { memory.ImageUrl };
            }
        }
    }

    public class MemoryResponseDto
    {
        public Guid MemoryId { get; set; }
        public Guid? GroupId { get; set; }
        public Guid UserId { get; set; }
        public MemoryUserDto? User { get; set; }
        public string Caption { get; set; } = string.Empty;
        public string ImageUrl { get; set; } = string.Empty;
        public List<string> Images { get; set; } = new();
        public string Category { get; set; } = string.Empty;
        public string Privacy { get; set; } = "Public";
        public DateTime CreatedAt { get; set; }
        public Guid? SharedMemoryId { get; set; }
        public List<CommentResponseDto> Comments { get; set; } = new();
        public List<ReactionDetailDto> Reactions { get; set; } = new();
    }

    public class MemoryUserDto
    {
        public Guid UserId { get; set; }
        public string Username { get; set; } = string.Empty;
        public string AvatarUrl { get; set; } = string.Empty;
    }

    public class CommentResponseDto
    {
        public Guid CommentId { get; set; }
        public Guid MemoryId { get; set; }
        public Guid UserId { get; set; }
        public Guid? ParentCommentId { get; set; }
        public string Text { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public DateTime? EditedAt { get; set; }
        public bool IsPinned { get; set; }
        public MemoryUserDto? User { get; set; }
        public List<CommentResponseDto>? Replies { get; set; }
        public List<ReactionResponseDto>? Reactions { get; set; }
    }

    public class ReactionDetailDto
    {
        public Guid ReactionId { get; set; }
        public string EmojiType { get; set; } = string.Empty;
        public ReactionUserDto? User { get; set; }
    }

    public class ReactionUserDto
    {
        public Guid UserId { get; set; }
        public string Username { get; set; } = string.Empty;
    }

    public class ReactionResponseDto
    {
        public Guid? ReactionId { get; set; }
        public Guid MemoryId { get; set; }
        public Guid UserId { get; set; }
        public string Username { get; set; } = string.Empty;
        public string EmojiType { get; set; } = string.Empty;
        public bool IsRemoved { get; set; }
    }
}

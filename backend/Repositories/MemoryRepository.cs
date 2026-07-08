using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using backend.Data;
using backend.Models;

namespace backend.Repositories
{
    public interface IMemoryRepository
    {
        Task<Memory?> GetByIdAsync(Guid id);
        Task AddAsync(Memory memory);
        void Update(Memory memory);
        void Delete(Memory memory);
        Task<List<Memory>> GetFeedAsync(string? category);
        Task<List<Memory>> GetGroupMemoriesAsync(Guid groupId, string? category);
        Task<List<Memory>> SearchMemoriesAsync(string query);
        Task AddCommentAsync(Comment comment);
        void DeleteComment(Comment comment);
        Task<Comment?> GetCommentByIdAsync(Guid commentId);
        Task<Reaction?> GetReactionAsync(Guid memoryId, Guid userId, string emojiType);
        Task<List<Reaction>> GetUserReactionsOnMemoryAsync(Guid memoryId, Guid userId);
        Task AddReactionAsync(Reaction reaction);
        Task RemoveReactionAsync(Reaction reaction);
        Task<CommentReaction?> GetCommentReactionAsync(Guid commentId, Guid userId, string emojiType);
        Task<List<CommentReaction>> GetUserReactionsOnCommentAsync(Guid commentId, Guid userId);
        Task AddCommentReactionAsync(CommentReaction reaction);
        void RemoveCommentReaction(CommentReaction reaction);
        Task SaveChangesAsync();
        // ─── New feature methods ───
        Task PinMemoryAsync(Guid memoryId, bool isPinned);
        Task ToggleCommentsLockAsync(Guid memoryId, bool isLocked);
        Task<SavedPost?> GetSavedPostAsync(Guid userId, Guid memoryId);
        Task AddSavedPostAsync(SavedPost savedPost);
        Task RemoveSavedPostAsync(SavedPost savedPost);
        Task<List<Guid>> GetUserSavedMemoryIdsAsync(Guid userId);
        Task<HiddenPost?> GetHiddenPostAsync(Guid userId, Guid memoryId);
        Task AddHiddenPostAsync(HiddenPost hiddenPost);
        Task RemoveHiddenPostAsync(HiddenPost hiddenPost);
        Task<List<Guid>> GetUserHiddenMemoryIdsAsync(Guid userId);
        Task AddPostReportAsync(PostReport report);
        Task<PostNotificationSetting?> GetPostNotificationSettingAsync(Guid userId, Guid memoryId);
        Task AddPostNotificationSettingAsync(PostNotificationSetting setting);
        Task RemovePostNotificationSettingAsync(PostNotificationSetting setting);
    }

    public class MemoryRepository : IMemoryRepository
    {
        private readonly ApplicationDbContext _context;

        public MemoryRepository(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<Memory?> GetByIdAsync(Guid id)
        {
            return await _context.Memories
                .Where(m => !m.IsDeleted)
                .FirstOrDefaultAsync(m => m.MemoryId == id);
        }

        public async Task AddAsync(Memory memory)
        {
            await _context.Memories.AddAsync(memory);
        }

        public void Update(Memory memory)
        {
            _context.Memories.Update(memory);
        }

        public void Delete(Memory memory)
        {
            _context.Memories.Remove(memory);
        }

        public async Task<List<Memory>> GetFeedAsync(string? category)
        {
            IQueryable<Memory> query = _context.Memories
                .Where(m => !m.IsDeleted)
                .Include(m => m.User)
                .Include(m => m.Comments.Where(c => !c.IsDeleted && c.ParentCommentId == null)).ThenInclude(c => c.User)
                .Include(m => m.Comments.Where(c => !c.IsDeleted && c.ParentCommentId == null)).ThenInclude(c => c.Reactions).ThenInclude(r => r.User)
                .Include(m => m.Comments.Where(c => !c.IsDeleted && c.ParentCommentId == null)).ThenInclude(c => c.Replies.Where(r => !r.IsDeleted)).ThenInclude(r => r.User)
                .Include(m => m.Reactions).ThenInclude(r => r.User);

            if (!string.IsNullOrWhiteSpace(category) && category != "Tất Cả Kỷ Niệm" && category != "All Snaps")
            {
                var cleanedCategory = category.Replace("🎂", "").Replace("✈️", "").Replace("🏡", "").Replace("🏆", "").Trim().ToLower();
                
                query = query.Where(m => m.Category.ToLower().Contains(cleanedCategory) || 
                                         (cleanedCategory == "birthdays" && m.Category.ToLower() == "birthday") ||
                                         (cleanedCategory == "travels" && m.Category.ToLower() == "travel") ||
                                         (cleanedCategory == "daily snaps" && m.Category.ToLower() == "daily") ||
                                         (cleanedCategory == "milestones" && m.Category.ToLower() == "milestone") ||
                                         (cleanedCategory == "đời thường" && m.Category.ToLower() == "daily") ||
                                         (cleanedCategory == "sinh nhật" && m.Category.ToLower() == "birthday") ||
                                         (cleanedCategory == "du lịch" && m.Category.ToLower() == "travel") ||
                                         (cleanedCategory == "cột mốc" && m.Category.ToLower() == "milestone"));
            }

            return await query.OrderByDescending(m => m.CreatedAt).ToListAsync();
        }

        public async Task<List<Memory>> GetGroupMemoriesAsync(Guid groupId, string? category)
        {
            IQueryable<Memory> query = _context.Memories
                .Where(m => !m.IsDeleted)
                .Include(m => m.User)
                .Include(m => m.Comments.Where(c => !c.IsDeleted && c.ParentCommentId == null)).ThenInclude(c => c.User)
                .Include(m => m.Comments.Where(c => !c.IsDeleted && c.ParentCommentId == null)).ThenInclude(c => c.Reactions).ThenInclude(r => r.User)
                .Include(m => m.Comments.Where(c => !c.IsDeleted && c.ParentCommentId == null)).ThenInclude(c => c.Replies.Where(r => !r.IsDeleted)).ThenInclude(r => r.User)
                .Include(m => m.Reactions).ThenInclude(r => r.User)
                .Where(m => m.GroupId == groupId);

            if (!string.IsNullOrWhiteSpace(category) && category != "All Snaps")
            {
                var cleanedCategory = category.Replace("🎂", "").Replace("✈️", "").Replace("🏡", "").Replace("🏆", "").Trim().ToLower();
                
                query = query.Where(m => m.Category.ToLower().Contains(cleanedCategory) || 
                                         (cleanedCategory == "birthdays" && m.Category.ToLower() == "birthday") ||
                                         (cleanedCategory == "travels" && m.Category.ToLower() == "travel") ||
                                         (cleanedCategory == "daily snaps" && m.Category.ToLower() == "daily") ||
                                         (cleanedCategory == "milestones" && m.Category.ToLower() == "milestone"));
            }

            return await query.OrderByDescending(m => m.CreatedAt).ToListAsync();
        }

        public async Task<List<Memory>> SearchMemoriesAsync(string query)
        {
            if (string.IsNullOrWhiteSpace(query))
                return new List<Memory>();

            return await _context.Memories
                .Where(m => !m.IsDeleted)
                .Include(m => m.User)
                .Include(m => m.Comments.Where(c => !c.IsDeleted)).ThenInclude(c => c.User)
                .Include(m => m.Reactions).ThenInclude(r => r.User)
                .Where(m => m.Caption.ToLower().Contains(query.ToLower()))
                .OrderByDescending(m => m.CreatedAt)
                .ToListAsync();
        }

        public async Task AddCommentAsync(Comment comment)
        {
            await _context.Comments.AddAsync(comment);
        }

        public void DeleteComment(Comment comment)
        {
            _context.Comments.Remove(comment);
        }

        public async Task<Comment?> GetCommentByIdAsync(Guid commentId)
        {
            return await _context.Comments
                .Where(c => !c.IsDeleted)
                .Include(c => c.User)
                .FirstOrDefaultAsync(c => c.CommentId == commentId);
        }

        public async Task<Reaction?> GetReactionAsync(Guid memoryId, Guid userId, string emojiType)
        {
            return await _context.Reactions
                .FirstOrDefaultAsync(r => r.MemoryId == memoryId && r.UserId == userId && r.EmojiType == emojiType);
        }

        public async Task<List<Reaction>> GetUserReactionsOnMemoryAsync(Guid memoryId, Guid userId)
        {
            return await _context.Reactions
                .Where(r => r.MemoryId == memoryId && r.UserId == userId)
                .ToListAsync();
        }

        public async Task AddReactionAsync(Reaction reaction)
        {
            await _context.Reactions.AddAsync(reaction);
        }

        public async Task RemoveReactionAsync(Reaction reaction)
        {
            _context.Reactions.Remove(reaction);
            await Task.CompletedTask;
        }

        public async Task SaveChangesAsync()
        {
            await _context.SaveChangesAsync();
        }

        public async Task<CommentReaction?> GetCommentReactionAsync(Guid commentId, Guid userId, string emojiType)
        {
            return await _context.CommentReactions
                .FirstOrDefaultAsync(r => r.CommentId == commentId && r.UserId == userId && r.EmojiType == emojiType);
        }

        public async Task<List<CommentReaction>> GetUserReactionsOnCommentAsync(Guid commentId, Guid userId)
        {
            return await _context.CommentReactions
                .Where(r => r.CommentId == commentId && r.UserId == userId)
                .ToListAsync();
        }

        public async Task AddCommentReactionAsync(CommentReaction reaction)
        {
            await _context.CommentReactions.AddAsync(reaction);
        }

        public void RemoveCommentReaction(CommentReaction reaction)
        {
            _context.CommentReactions.Remove(reaction);
        }

        // ─── Pin memory ───
        public async Task PinMemoryAsync(Guid memoryId, bool isPinned)
        {
            var memory = await _context.Memories.FindAsync(memoryId);
            if (memory == null) return;
            memory.IsPinned = isPinned;
            memory.PinnedAt = isPinned ? DateTime.UtcNow : null;
            await _context.SaveChangesAsync();
        }

        // ─── Toggle comments lock ───
        public async Task ToggleCommentsLockAsync(Guid memoryId, bool isLocked)
        {
            var memory = await _context.Memories.FindAsync(memoryId);
            if (memory == null) return;
            memory.IsCommentsLocked = isLocked;
            await _context.SaveChangesAsync();
        }

        // ─── Saved posts (bookmarks) ───
        public async Task<SavedPost?> GetSavedPostAsync(Guid userId, Guid memoryId)
        {
            return await _context.SavedPosts
                .FirstOrDefaultAsync(sp => sp.UserId == userId && sp.MemoryId == memoryId);
        }

        public async Task AddSavedPostAsync(SavedPost savedPost)
        {
            await _context.SavedPosts.AddAsync(savedPost);
            await _context.SaveChangesAsync();
        }

        public async Task RemoveSavedPostAsync(SavedPost savedPost)
        {
            _context.SavedPosts.Remove(savedPost);
            await _context.SaveChangesAsync();
        }

        public async Task<List<Guid>> GetUserSavedMemoryIdsAsync(Guid userId)
        {
            return await _context.SavedPosts
                .Where(sp => sp.UserId == userId)
                .Select(sp => sp.MemoryId)
                .ToListAsync();
        }

        // ─── Hidden posts ───
        public async Task<HiddenPost?> GetHiddenPostAsync(Guid userId, Guid memoryId)
        {
            return await _context.HiddenPosts
                .FirstOrDefaultAsync(hp => hp.UserId == userId && hp.MemoryId == memoryId);
        }

        public async Task AddHiddenPostAsync(HiddenPost hiddenPost)
        {
            await _context.HiddenPosts.AddAsync(hiddenPost);
            await _context.SaveChangesAsync();
        }

        public async Task RemoveHiddenPostAsync(HiddenPost hiddenPost)
        {
            _context.HiddenPosts.Remove(hiddenPost);
            await _context.SaveChangesAsync();
        }

        public async Task<List<Guid>> GetUserHiddenMemoryIdsAsync(Guid userId)
        {
            return await _context.HiddenPosts
                .Where(hp => hp.UserId == userId)
                .Select(hp => hp.MemoryId)
                .ToListAsync();
        }

        // ─── Post reports ───
        public async Task AddPostReportAsync(PostReport report)
        {
            await _context.PostReports.AddAsync(report);
            await _context.SaveChangesAsync();
        }

        // ─── Notification settings ───
        public async Task<PostNotificationSetting?> GetPostNotificationSettingAsync(Guid userId, Guid memoryId)
        {
            return await _context.PostNotificationSettings
                .FirstOrDefaultAsync(s => s.UserId == userId && s.MemoryId == memoryId);
        }

        public async Task AddPostNotificationSettingAsync(PostNotificationSetting setting)
        {
            await _context.PostNotificationSettings.AddAsync(setting);
            await _context.SaveChangesAsync();
        }

        public async Task RemovePostNotificationSettingAsync(PostNotificationSetting setting)
        {
            _context.PostNotificationSettings.Remove(setting);
            await _context.SaveChangesAsync();
        }
    }
}

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
        Task AddReactionAsync(Reaction reaction);
        Task RemoveReactionAsync(Reaction reaction);
        Task<CommentReaction?> GetCommentReactionAsync(Guid commentId, Guid userId, string emojiType);
        Task AddCommentReactionAsync(CommentReaction reaction);
        void RemoveCommentReaction(CommentReaction reaction);
        Task SaveChangesAsync();
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

        // ─── Comment Reactions ───
        public async Task<CommentReaction?> GetCommentReactionAsync(Guid commentId, Guid userId, string emojiType)
        {
            return await _context.CommentReactions
                .FirstOrDefaultAsync(r => r.CommentId == commentId && r.UserId == userId && r.EmojiType == emojiType);
        }

        public async Task AddCommentReactionAsync(CommentReaction reaction)
        {
            await _context.CommentReactions.AddAsync(reaction);
        }

        public void RemoveCommentReaction(CommentReaction reaction)
        {
            _context.CommentReactions.Remove(reaction);
        }
    }
}

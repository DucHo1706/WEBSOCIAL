using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using backend.Data;
using backend.Models;

namespace backend.Repositories
{
    public interface IStoryRepository
    {
        Task AddAsync(Story story);
        Task<List<Story>> GetActiveStoriesForUsersAsync(List<Guid> userIds);
        Task<Story?> GetStoryByIdAsync(Guid storyId);
        Task UpsertReactionAsync(Guid storyId, Guid userId, string emojiType);
        Task<List<StoryReaction>> GetReactionsForStoryAsync(Guid storyId);
        Task DeleteStoryAsync(Guid storyId);
        Task SaveChangesAsync();
    }

    public class StoryRepository : IStoryRepository
    {
        private readonly ApplicationDbContext _context;

        public StoryRepository(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task AddAsync(Story story)
        {
            await _context.Stories.AddAsync(story);
        }

        public async Task<List<Story>> GetActiveStoriesForUsersAsync(List<Guid> userIds)
        {
            var now = DateTime.UtcNow;
            return await _context.Stories
                .Include(s => s.User)
                .Where(s => userIds.Contains(s.UserId) && s.ExpiresAt > now)
                .OrderBy(s => s.CreatedAt)
                .ToListAsync();
        }

        public async Task<Story?> GetStoryByIdAsync(Guid storyId)
        {
            return await _context.Stories.FindAsync(storyId);
        }

        public async Task UpsertReactionAsync(Guid storyId, Guid userId, string emojiType)
        {
            var existing = await _context.StoryReactions
                .FirstOrDefaultAsync(sr => sr.StoryId == storyId && sr.UserId == userId);

            if (existing != null)
            {
                // Toggle: same emoji = remove; different emoji = update
                if (existing.EmojiType == emojiType)
                    _context.StoryReactions.Remove(existing);
                else
                    existing.EmojiType = emojiType;
            }
            else
            {
                await _context.StoryReactions.AddAsync(new StoryReaction
                {
                    StoryId = storyId,
                    UserId = userId,
                    EmojiType = emojiType
                });
            }
        }

        public async Task<List<StoryReaction>> GetReactionsForStoryAsync(Guid storyId)
        {
            return await _context.StoryReactions
                .Include(sr => sr.User)
                .Where(sr => sr.StoryId == storyId)
                .OrderByDescending(sr => sr.CreatedAt)
                .ToListAsync();
        }

        public async Task DeleteStoryAsync(Guid storyId)
        {
            var story = await _context.Stories.FindAsync(storyId);
            if (story != null)
            {
                var reactions = _context.StoryReactions.Where(sr => sr.StoryId == storyId);
                _context.StoryReactions.RemoveRange(reactions);
                _context.Stories.Remove(story);
                await _context.SaveChangesAsync();
            }
        }

        public async Task SaveChangesAsync()
        {
            await _context.SaveChangesAsync();
        }
    }
}

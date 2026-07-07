using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using backend.Data;
using backend.Models;

namespace backend.Repositories
{
    public interface IFriendshipRepository
    {
        Task<List<Friendship>> GetFriendshipsByUserIdAsync(Guid userId);
        Task<List<Friendship>> GetAcceptedFriendshipsAsync();
        Task<Friendship?> GetByIdAsync(Guid id);
        Task<bool> RequestExistsAsync(Guid senderId, Guid receiverId);
        Task AddAsync(Friendship friendship);
        Task RemoveAsync(Friendship friendship);
        Task SaveChangesAsync();
    }

    public class FriendshipRepository : IFriendshipRepository
    {
        private readonly ApplicationDbContext _context;

        public FriendshipRepository(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<List<Friendship>> GetFriendshipsByUserIdAsync(Guid userId)
        {
            return await _context.Friendships
                .Include(f => f.Sender)
                .Include(f => f.Receiver)
                .Where(f => f.SenderId == userId || f.ReceiverId == userId)
                .ToListAsync();
        }

        public async Task<List<Friendship>> GetAcceptedFriendshipsAsync()
        {
            return await _context.Friendships
                .Where(f => f.Status == "Accepted")
                .ToListAsync();
        }

        public async Task<Friendship?> GetByIdAsync(Guid id)
        {
            return await _context.Friendships.FindAsync(id);
        }

        public async Task<bool> RequestExistsAsync(Guid senderId, Guid receiverId)
        {
            return await _context.Friendships.AnyAsync(f => 
                (f.SenderId == senderId && f.ReceiverId == receiverId) ||
                (f.SenderId == receiverId && f.ReceiverId == senderId));
        }

        public async Task AddAsync(Friendship friendship)
        {
            await _context.Friendships.AddAsync(friendship);
        }

        public async Task RemoveAsync(Friendship friendship)
        {
            _context.Friendships.Remove(friendship);
            await Task.CompletedTask;
        }

        public async Task SaveChangesAsync()
        {
            await _context.SaveChangesAsync();
        }
    }
}

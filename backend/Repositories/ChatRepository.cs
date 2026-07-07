using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using backend.Data;
using backend.Models;

namespace backend.Repositories
{
    public interface IChatRepository
    {
        Task<List<ChatMessage>> GetDirectChatHistoryAsync(Guid userId1, Guid userId2);
        Task<List<ChatMessage>> GetGroupChatHistoryAsync(Guid groupChatId);
        Task<List<GroupChatMember>> GetGroupChatsByUserIdAsync(Guid userId);
        Task<GroupChat?> GetGroupChatByIdAsync(Guid groupChatId);
        Task AddGroupChatAsync(GroupChat groupChat);
        Task AddGroupChatMemberAsync(GroupChatMember member);
        Task AddChatMessageAsync(ChatMessage message);
        Task SaveChangesAsync();
    }

    public class ChatRepository : IChatRepository
    {
        private readonly ApplicationDbContext _context;

        public ChatRepository(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<List<ChatMessage>> GetDirectChatHistoryAsync(Guid userId1, Guid userId2)
        {
            return await _context.ChatMessages
                .Include(cm => cm.User)
                .Where(cm => !cm.IsDeleted)
                .Where(cm => (cm.UserId == userId1 && cm.ReceiverId == userId2) ||
                             (cm.UserId == userId2 && cm.ReceiverId == userId1))
                .OrderBy(cm => cm.CreatedAt)
                .ToListAsync();
        }

        public async Task<List<ChatMessage>> GetGroupChatHistoryAsync(Guid groupChatId)
        {
            return await _context.ChatMessages
                .Include(cm => cm.User)
                .Where(cm => !cm.IsDeleted)
                .Where(cm => cm.GroupChatId == groupChatId)
                .OrderBy(cm => cm.CreatedAt)
                .ToListAsync();
        }

        public async Task<List<GroupChatMember>> GetGroupChatsByUserIdAsync(Guid userId)
        {
            return await _context.GroupChatMembers
                .Include(gcm => gcm.GroupChat)
                .Where(gcm => gcm.UserId == userId)
                .ToListAsync();
        }

        public async Task<GroupChat?> GetGroupChatByIdAsync(Guid groupChatId)
        {
            return await _context.GroupChats.FindAsync(groupChatId);
        }

        public async Task AddGroupChatAsync(GroupChat groupChat)
        {
            await _context.GroupChats.AddAsync(groupChat);
        }

        public async Task AddGroupChatMemberAsync(GroupChatMember member)
        {
            await _context.GroupChatMembers.AddAsync(member);
        }

        public async Task AddChatMessageAsync(ChatMessage message)
        {
            await _context.ChatMessages.AddAsync(message);
        }

        public async Task SaveChangesAsync()
        {
            await _context.SaveChangesAsync();
        }
    }
}

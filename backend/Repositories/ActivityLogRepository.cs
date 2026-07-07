using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using backend.Data;
using backend.Models;

namespace backend.Repositories
{
    public interface IActivityLogRepository
    {
        Task LogActivityAsync(Guid userId, string actionType, string detail);
        Task<List<ActivityLog>> GetLogsByUserIdAsync(Guid userId);
    }

    public class ActivityLogRepository : IActivityLogRepository
    {
        private readonly ApplicationDbContext _context;

        public class MockLocationCity
        {
            // Simple mock class or utility is fine
        }

        public ActivityLogRepository(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task LogActivityAsync(Guid userId, string actionType, string detail)
        {
            var log = new ActivityLog
            {
                UserId = userId,
                ActionType = actionType,
                Detail = detail
            };

            await _context.ActivityLogs.AddAsync(log);
            await _context.SaveChangesAsync();
        }

        public async Task<List<ActivityLog>> GetLogsByUserIdAsync(Guid userId)
        {
            return await _context.ActivityLogs
                .Where(al => al.UserId == userId)
                .OrderByDescending(al => al.CreatedAt)
                .ToListAsync();
        }
    }
}

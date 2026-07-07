using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using backend.Models;
using backend.Repositories;

namespace backend.Services
{
    public interface IActivityLogService
    {
        Task LogActivityAsync(Guid userId, string actionType, string detail);
        Task<List<ActivityLogResponseDto>> GetLogsByUserIdAsync(Guid userId);
    }

    public class ActivityLogService : IActivityLogService
    {
        private readonly IActivityLogRepository _activityLogRepository;

        public ActivityLogService(IActivityLogRepository activityLogRepository)
        {
            _activityLogRepository = activityLogRepository;
        }

        public async Task LogActivityAsync(Guid userId, string actionType, string detail)
        {
            await _activityLogRepository.LogActivityAsync(userId, actionType, detail);
        }

        public async Task<List<ActivityLogResponseDto>> GetLogsByUserIdAsync(Guid userId)
        {
            var logs = await _activityLogRepository.GetLogsByUserIdAsync(userId);
            return logs.Select(l => new ActivityLogResponseDto
            {
                ActivityLogId = l.ActivityLogId,
                UserId = l.UserId,
                ActionType = l.ActionType,
                Detail = l.Detail,
                CreatedAt = l.CreatedAt
            }).ToList();
        }
    }

    public class ActivityLogResponseDto
    {
        public Guid ActivityLogId { get; set; }
        public Guid UserId { get; set; }
        public string ActionType { get; set; } = string.Empty;
        public string Detail { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
    }
}

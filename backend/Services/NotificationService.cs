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
    public interface INotificationService
    {
        Task<List<NotificationResponseDto>> GetNotificationsAsync(Guid userId);
        Task CreateNotificationAsync(Guid receiverId, Guid senderId, string type, Guid? relatedId, string text);
        Task MarkAllAsReadAsync(Guid userId);
    }

    public class NotificationService : INotificationService
    {
        private readonly INotificationRepository _notificationRepository;
        private readonly IUserRepository _userRepository;
        private readonly IHubContext<MemoryHub> _hubContext;

        public NotificationService(
            INotificationRepository notificationRepository,
            IUserRepository userRepository,
            IHubContext<MemoryHub> hubContext)
        {
            _notificationRepository = notificationRepository;
            _userRepository = userRepository;
            _hubContext = hubContext;
        }

        public async Task<List<NotificationResponseDto>> GetNotificationsAsync(Guid userId)
        {
            var list = await _notificationRepository.GetNotificationsByUserIdAsync(userId);
            return list.Select(n => new NotificationResponseDto
            {
                NotificationId = n.NotificationId,
                ReceiverId = n.ReceiverId,
                SenderId = n.SenderId,
                SenderName = n.Sender?.Username ?? "Một người dùng",
                SenderAvatarUrl = n.Sender?.AvatarUrl ?? "",
                Type = n.Type,
                RelatedId = n.RelatedId,
                Text = n.Text,
                IsRead = n.IsRead,
                CreatedAt = n.CreatedAt
            }).ToList();
        }

        public async Task CreateNotificationAsync(Guid receiverId, Guid senderId, string type, Guid? relatedId, string text)
        {
            // Don't notify self
            if (receiverId == senderId) return;

            var notification = new Notification
            {
                ReceiverId = receiverId,
                SenderId = senderId,
                Type = type,
                RelatedId = relatedId,
                Text = text
            };

            await _notificationRepository.AddAsync(notification);
            await _notificationRepository.SaveChangesAsync();

            // Fetch sender profile details to enrich real-time event DTO
            var sender = await _userRepository.GetByIdAsync(senderId);

            var dto = new NotificationResponseDto
            {
                NotificationId = notification.NotificationId,
                ReceiverId = notification.ReceiverId,
                SenderId = notification.SenderId,
                SenderName = sender?.Username ?? "Một người dùng",
                SenderAvatarUrl = sender?.AvatarUrl ?? "",
                Type = notification.Type,
                RelatedId = notification.RelatedId,
                Text = notification.Text,
                IsRead = notification.IsRead,
                CreatedAt = notification.CreatedAt
            };

            // Broadcast real-time to the specific receiver group
            await _hubContext.Clients.Group(receiverId.ToString()).SendAsync("OnNewNotification", dto);
        }

        public async Task MarkAllAsReadAsync(Guid userId)
        {
            await _notificationRepository.MarkAllAsReadAsync(userId);
            await _notificationRepository.SaveChangesAsync();
        }
    }

    public class NotificationResponseDto
    {
        public Guid NotificationId { get; set; }
        public Guid ReceiverId { get; set; }
        public Guid SenderId { get; set; }
        public string SenderName { get; set; } = string.Empty;
        public string SenderAvatarUrl { get; set; } = string.Empty;
        public string Type { get; set; } = string.Empty;
        public Guid? RelatedId { get; set; }
        public string Text { get; set; } = string.Empty;
        public bool IsRead { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}

using System;

namespace backend.Models
{
    public class ActivityLog
    {
        public Guid ActivityLogId { get; set; } = Guid.NewGuid();
        
        public Guid UserId { get; set; }
        public User? User { get; set; }

        public string ActionType { get; set; } = string.Empty; // Post, Comment, Reaction, FriendRequest, FriendAccept, ChatGroupCreate, Message
        public string Detail { get; set; } = string.Empty; // Description in Vietnamese
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}

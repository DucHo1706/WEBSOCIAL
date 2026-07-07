using System;

namespace backend.Models
{
    public class Notification
    {
        public Guid NotificationId { get; set; } = Guid.NewGuid();

        public Guid ReceiverId { get; set; }
        public User? Receiver { get; set; }

        public Guid SenderId { get; set; }
        public User? Sender { get; set; }

        public string Type { get; set; } = string.Empty; // Comment, Reaction, FriendRequest, FriendAccept
        public Guid? RelatedId { get; set; } // MemoryId or FriendshipId
        public string Text { get; set; } = string.Empty; // Notification message details in Vietnamese
        public bool IsRead { get; set; } = false;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}

using System;

namespace backend.Models
{
    public class Friendship
    {
        public Guid FriendshipId { get; set; } = Guid.NewGuid();
        
        public Guid SenderId { get; set; }
        public User? Sender { get; set; }

        public Guid ReceiverId { get; set; }
        public User? Receiver { get; set; }

        public string Status { get; set; } = "Pending"; // Pending, Accepted
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}

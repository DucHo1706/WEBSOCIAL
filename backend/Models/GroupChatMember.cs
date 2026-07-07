using System;

namespace backend.Models
{
    public class GroupChatMember
    {
        public Guid GroupChatId { get; set; }
        public GroupChat? GroupChat { get; set; }

        public Guid UserId { get; set; }
        public User? User { get; set; }

        public DateTime JoinedAt { get; set; } = DateTime.UtcNow;
    }
}

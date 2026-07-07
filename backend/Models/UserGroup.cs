using System;

namespace backend.Models
{
    public class UserGroup
    {
        public Guid UserId { get; set; }
        public User? User { get; set; }

        public Guid GroupId { get; set; }
        public Group? Group { get; set; }

        public string Role { get; set; } = "Member"; // e.g., Creator, Member
        public DateTime JoinedAt { get; set; } = DateTime.UtcNow;
    }
}

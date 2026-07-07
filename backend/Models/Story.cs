using System;

namespace backend.Models
{
    public class Story
    {
        public Guid StoryId { get; set; } = Guid.NewGuid();

        public Guid UserId { get; set; }
        public User? User { get; set; }

        public string ImageUrl { get; set; } = string.Empty;
        public string? Caption { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime ExpiresAt { get; set; } = DateTime.UtcNow.AddHours(24);
    }
}

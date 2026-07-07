using System;

namespace backend.Models
{
    public class StoryReaction
    {
        public Guid StoryReactionId { get; set; } = Guid.NewGuid();

        public Guid StoryId { get; set; }
        public Story? Story { get; set; }

        public Guid UserId { get; set; }
        public User? User { get; set; }

        public string EmojiType { get; set; } = string.Empty; // ❤️, 😂, 😮, 😢, 🙏
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}

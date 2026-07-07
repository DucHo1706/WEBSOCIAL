using System;

namespace backend.Models
{
    public class Reaction
    {
        public Guid ReactionId { get; set; } = Guid.NewGuid();
        public Guid MemoryId { get; set; }
        [System.Text.Json.Serialization.JsonIgnore]
        public Memory? Memory { get; set; }

        public Guid UserId { get; set; }
        public User? User { get; set; }

        public string EmojiType { get; set; } = "❤️"; // e.g. ❤️, 🔥, 🎉, 😆
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}

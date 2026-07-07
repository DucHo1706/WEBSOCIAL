using System;

namespace backend.Models
{
    public class CommentReaction
    {
        public Guid CommentReactionId { get; set; } = Guid.NewGuid();
        public Guid CommentId { get; set; }
        public Comment? Comment { get; set; }
        public Guid UserId { get; set; }
        public User? User { get; set; }
        public string EmojiType { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}

using System;
using System.Collections.Generic;

namespace backend.Models
{
    public class Comment
    {
        public Guid CommentId { get; set; } = Guid.NewGuid();
        public Guid MemoryId { get; set; }
        // Prevent circular reference when serializing
        [System.Text.Json.Serialization.JsonIgnore]
        public Memory? Memory { get; set; }

        public Guid UserId { get; set; }
        public User? User { get; set; }

        public string Text { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? EditedAt { get; set; }

        // Pin support
        public bool IsPinned { get; set; } = false;
        public DateTime? PinnedAt { get; set; }

        // Nested replies support
        public Guid? ParentCommentId { get; set; }
        [System.Text.Json.Serialization.JsonIgnore]
        public Comment? ParentComment { get; set; }
        public ICollection<Comment>? Replies { get; set; }

        // Soft Delete
        public bool IsDeleted { get; set; } = false;
        public DateTime? DeletedAt { get; set; }

        // Reactions on comment
        public ICollection<CommentReaction>? Reactions { get; set; }
    }
}

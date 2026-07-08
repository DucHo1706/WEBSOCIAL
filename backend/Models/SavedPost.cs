using System;

namespace backend.Models
{
    // Lưu bài viết (Bookmark) - many-to-many between User and Memory
    public class SavedPost
    {
        public Guid SavedPostId { get; set; } = Guid.NewGuid();
        public Guid UserId { get; set; }
        public User? User { get; set; }

        public Guid MemoryId { get; set; }
        public Memory? Memory { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}

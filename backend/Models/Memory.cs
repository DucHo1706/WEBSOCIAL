using System;
using System.Collections.Generic;

namespace backend.Models
{
    public class Memory
    {
        public Guid MemoryId { get; set; } = Guid.NewGuid();
        
        // GroupId is now nullable to allow public/global postings like Facebook Feed
        public Guid? GroupId { get; set; }
        public Group? Group { get; set; }

        public Guid UserId { get; set; }
        public User? User { get; set; }

        public string Caption { get; set; } = string.Empty;
        public string ImageUrl { get; set; } = string.Empty; // First/cover image (backward compat)
        public string ImagesJson { get; set; } = "[]"; // JSON array of all image URLs
        public string Category { get; set; } = "Daily"; // e.g. Birthday, Travel, Daily, Milestone
        public string Privacy { get; set; } = "Public"; // Public, Friends, Private
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Soft Delete fields (hide from user, keep in DB)
        public bool IsDeleted { get; set; } = false;
        public DateTime? DeletedAt { get; set; }

        // Share functionality: reference to original shared post
        public Guid? SharedMemoryId { get; set; }
        public Memory? SharedMemory { get; set; }

        public ICollection<Comment> Comments { get; set; } = new List<Comment>();
        public ICollection<Reaction> Reactions { get; set; } = new List<Reaction>();
    }
}

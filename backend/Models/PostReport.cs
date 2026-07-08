using System;

namespace backend.Models
{
    // Báo cáo bài viết
    public class PostReport
    {
        public Guid ReportId { get; set; } = Guid.NewGuid();
        public Guid ReporterId { get; set; }
        public User? Reporter { get; set; }

        public Guid MemoryId { get; set; }
        public Memory? Memory { get; set; }

        public string Reason { get; set; } = string.Empty; // Spam, Inappropriate, Violence, etc.
        public string Description { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public string Status { get; set; } = "Pending"; // Pending, Reviewed, Resolved
    }
}

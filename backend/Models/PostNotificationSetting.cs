using System;

namespace backend.Models
{
    // Cài đặt thông báo cho từng bài viết
    public class PostNotificationSetting
    {
        public Guid SettingId { get; set; } = Guid.NewGuid();
        public Guid UserId { get; set; }
        public User? User { get; set; }

        public Guid MemoryId { get; set; }
        public Memory? Memory { get; set; }

        public bool IsEnabled { get; set; } = true;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}

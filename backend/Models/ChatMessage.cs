using System;
using System.Collections.Generic;

namespace backend.Models
{
    public class ChatMessage
    {
        public Guid ChatMessageId { get; set; } = Guid.NewGuid();

        // 1-1 Chat: Receiver user id
        public Guid? ReceiverId { get; set; }
        public User? Receiver { get; set; }

        // Group Chat: Group chat room id (Messenger style)
        public Guid? GroupChatId { get; set; }
        public GroupChat? GroupChat { get; set; }

        // Legacy: Group Pod (we can keep it nullable to avoid breaking initial migrations)
        public Guid? GroupId { get; set; }
        public Group? Group { get; set; }

        // Sender
        public Guid UserId { get; set; }
        public User? User { get; set; }

        public string MessageText { get; set; } = string.Empty;
        public string? ImageUrl { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? EditedAt { get; set; }

        // Soft Delete (hide deleted messages)
        public bool IsDeleted { get; set; } = false;
        public DateTime? DeletedAt { get; set; }

        // Reactions stored as JSON array: [{UserId, EmojiType, Username}]
        public string ReactionsJson { get; set; } = "[]";

        // Pin support
        public bool IsPinned { get; set; } = false;
        public DateTime? PinnedAt { get; set; }

        // Reply support
        public Guid? ReplyToMessageId { get; set; }
        public string? ReplyToText { get; set; }
    }
}

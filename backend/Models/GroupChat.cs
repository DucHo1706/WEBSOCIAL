using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace backend.Models
{
    public class GroupChat
    {
        public Guid GroupChatId { get; set; } = Guid.NewGuid();
        public string GroupName { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [JsonIgnore]
        public ICollection<GroupChatMember> Members { get; set; } = new List<GroupChatMember>();
        [JsonIgnore]
        public ICollection<ChatMessage> ChatMessages { get; set; } = new List<ChatMessage>();
    }
}

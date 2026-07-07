using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace backend.Models
{
    public class Group
    {
        public Guid GroupId { get; set; } = Guid.NewGuid();
        public string GroupName { get; set; } = string.Empty;
        public string InviteCode { get; set; } = string.Empty; // 6-digit invitation code
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [JsonIgnore]
        public ICollection<UserGroup> UserGroups { get; set; } = new List<UserGroup>();
        [JsonIgnore]
        public ICollection<Memory> Memories { get; set; } = new List<Memory>();
        [JsonIgnore]
        public ICollection<ChatMessage> ChatMessages { get; set; } = new List<ChatMessage>();
    }
}

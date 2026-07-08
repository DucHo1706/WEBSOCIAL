using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace backend.Models
{
    public class User
    {
        public Guid UserId { get; set; } = Guid.NewGuid();
        public string Username { get; set; } = string.Empty;
        public string? Nickname { get; set; }
        public string Email { get; set; } = string.Empty;
        public string PasswordHash { get; set; } = string.Empty;
        public string? AvatarUrl { get; set; }
        public string? CoverImageUrl { get; set; }
        public string? Bio { get; set; }

        // New profile fields (Facebook-style)
        public string? Location { get; set; }
        public DateTime? DateOfBirth { get; set; }
        public string? RelationshipStatus { get; set; } // Single, In a relationship, Married, etc.
        public string? Education { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [JsonIgnore]
        public ICollection<UserGroup> UserGroups { get; set; } = new List<UserGroup>();
        [JsonIgnore]
        public ICollection<Memory> Memories { get; set; } = new List<Memory>();
        [JsonIgnore]
        public ICollection<Comment> Comments { get; set; } = new List<Comment>();
        [JsonIgnore]
        public ICollection<Reaction> Reactions { get; set; } = new List<Reaction>();
        [JsonIgnore]
        public ICollection<ChatMessage> ChatMessages { get; set; } = new List<ChatMessage>();
    }
}

using Microsoft.EntityFrameworkCore;
using backend.Models;

namespace backend.Data
{
    public class ApplicationDbContext : DbContext
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
            : base(options)
        {
        }

        public DbSet<User> Users { get; set; } = null!;
        public DbSet<Group> Groups { get; set; } = null!;
        public DbSet<UserGroup> UserGroups { get; set; } = null!;
        public DbSet<Memory> Memories { get; set; } = null!;
        public DbSet<Comment> Comments { get; set; } = null!;
        public DbSet<Reaction> Reactions { get; set; } = null!;
        public DbSet<ChatMessage> ChatMessages { get; set; } = null!;
        public DbSet<Friendship> Friendships { get; set; } = null!;
        public DbSet<GroupChat> GroupChats { get; set; } = null!;
        public DbSet<GroupChatMember> GroupChatMembers { get; set; } = null!;
        public DbSet<ActivityLog> ActivityLogs { get; set; } = null!;
        public DbSet<Notification> Notifications { get; set; } = null!;
        public DbSet<Story> Stories { get; set; } = null!;
        public DbSet<StoryReaction> StoryReactions { get; set; } = null!;
        public DbSet<CommentReaction> CommentReactions { get; set; } = null!;
        public DbSet<SavedPost> SavedPosts { get; set; } = null!;
        public DbSet<HiddenPost> HiddenPosts { get; set; } = null!;
        public DbSet<PostReport> PostReports { get; set; } = null!;
        public DbSet<PostNotificationSetting> PostNotificationSettings { get; set; } = null!;

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Auto convert all DateTime properties to Utc Kind when reading from database
            var dateTimeConverter = new Microsoft.EntityFrameworkCore.Storage.ValueConversion.ValueConverter<DateTime, DateTime>(
                v => v,
                v => DateTime.SpecifyKind(v, DateTimeKind.Utc));

            var nullableDateTimeConverter = new Microsoft.EntityFrameworkCore.Storage.ValueConversion.ValueConverter<DateTime?, DateTime?>(
                v => v,
                v => v.HasValue ? DateTime.SpecifyKind(v.Value, DateTimeKind.Utc) : null);

            foreach (var entityType in modelBuilder.Model.GetEntityTypes())
            {
                if (entityType.IsKeyless)
                {
                    continue;
                }

                foreach (var property in entityType.GetProperties())
                {
                    if (property.ClrType == typeof(DateTime))
                    {
                        property.SetValueConverter(dateTimeConverter);
                    }
                    else if (property.ClrType == typeof(DateTime?))
                    {
                        property.SetValueConverter(nullableDateTimeConverter);
                    }
                }
            }

            // Configure composite key for UserGroup many-to-many relationship
            modelBuilder.Entity<UserGroup>()
                .HasKey(ug => new { ug.UserId, ug.GroupId });

            modelBuilder.Entity<UserGroup>()
                .HasOne(ug => ug.User)
                .WithMany(u => u.UserGroups)
                .HasForeignKey(ug => ug.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<UserGroup>()
                .HasOne(ug => ug.Group)
                .WithMany(g => g.UserGroups)
                .HasForeignKey(ug => ug.GroupId)
                .OnDelete(DeleteBehavior.Cascade);

            // Configure composite key for GroupChatMember
            modelBuilder.Entity<GroupChatMember>()
                .HasKey(gcm => new { gcm.GroupChatId, gcm.UserId });

            modelBuilder.Entity<GroupChatMember>()
                .HasOne(gcm => gcm.GroupChat)
                .WithMany(gc => gc.Members)
                .HasForeignKey(gcm => gcm.GroupChatId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<GroupChatMember>()
                .HasOne(gcm => gcm.User)
                .WithMany()
                .HasForeignKey(gcm => gcm.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            // Configure Friendship relationships
            modelBuilder.Entity<Friendship>()
                .HasOne(f => f.Sender)
                .WithMany()
                .HasForeignKey(f => f.SenderId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Friendship>()
                .HasOne(f => f.Receiver)
                .WithMany()
                .HasForeignKey(f => f.ReceiverId)
                .OnDelete(DeleteBehavior.NoAction); // Disable cascade path to avoid cycles

            // Configure Group and Memory relationships
            modelBuilder.Entity<Memory>()
                .HasOne(m => m.Group)
                .WithMany(g => g.Memories)
                .HasForeignKey(m => m.GroupId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Memory>()
                .HasOne(m => m.User)
                .WithMany(u => u.Memories)
                .HasForeignKey(m => m.UserId)
                .OnDelete(DeleteBehavior.NoAction);

            // Configure SharedMemory self-reference
            modelBuilder.Entity<Memory>()
                .HasOne(m => m.SharedMemory)
                .WithMany()
                .HasForeignKey(m => m.SharedMemoryId)
                .OnDelete(DeleteBehavior.NoAction);

            // Configure Comments
            modelBuilder.Entity<Comment>()
                .HasOne(c => c.Memory)
                .WithMany(m => m.Comments)
                .HasForeignKey(c => c.MemoryId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Comment>()
                .HasOne(c => c.User)
                .WithMany(u => u.Comments)
                .HasForeignKey(c => c.UserId)
                .OnDelete(DeleteBehavior.NoAction);

            // Configure Comment self-reference for nested replies
            modelBuilder.Entity<Comment>()
                .HasOne(c => c.ParentComment)
                .WithMany(c => c.Replies)
                .HasForeignKey(c => c.ParentCommentId)
                .OnDelete(DeleteBehavior.NoAction);

            // Configure CommentReactions
            modelBuilder.Entity<CommentReaction>()
                .HasOne(cr => cr.Comment)
                .WithMany(c => c.Reactions)
                .HasForeignKey(cr => cr.CommentId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<CommentReaction>()
                .HasOne(cr => cr.User)
                .WithMany()
                .HasForeignKey(cr => cr.UserId)
                .OnDelete(DeleteBehavior.NoAction);

            // Configure Reactions
            modelBuilder.Entity<Reaction>()
                .HasOne(r => r.Memory)
                .WithMany(m => m.Reactions)
                .HasForeignKey(r => r.MemoryId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Reaction>()
                .HasOne(r => r.User)
                .WithMany(u => u.Reactions)
                .HasForeignKey(r => r.UserId)
                .OnDelete(DeleteBehavior.NoAction);

            // Configure ChatMessages
            modelBuilder.Entity<ChatMessage>()
                .HasOne(cm => cm.Group)
                .WithMany(g => g.ChatMessages)
                .HasForeignKey(cm => cm.GroupId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<ChatMessage>()
                .HasOne(cm => cm.User)
                .WithMany(u => u.ChatMessages)
                .HasForeignKey(cm => cm.UserId)
                .OnDelete(DeleteBehavior.NoAction);

            modelBuilder.Entity<ChatMessage>()
                .HasOne(cm => cm.GroupChat)
                .WithMany(gc => gc.ChatMessages)
                .HasForeignKey(cm => cm.GroupChatId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<ChatMessage>()
                .HasOne(cm => cm.Receiver)
                .WithMany()
                .HasForeignKey(cm => cm.ReceiverId)
                .OnDelete(DeleteBehavior.NoAction);

            // Configure ActivityLog
            modelBuilder.Entity<ActivityLog>()
                .HasOne(al => al.User)
                .WithMany()
                .HasForeignKey(al => al.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            // Configure Notification
            modelBuilder.Entity<Notification>()
                .HasOne(n => n.Receiver)
                .WithMany()
                .HasForeignKey(n => n.ReceiverId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Notification>()
                .HasOne(n => n.Sender)
                .WithMany()
                .HasForeignKey(n => n.SenderId)
                .OnDelete(DeleteBehavior.NoAction);

            // Configure Story
            modelBuilder.Entity<Story>()
                .HasOne(s => s.User)
                .WithMany()
                .HasForeignKey(s => s.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            // Configure StoryReaction
            modelBuilder.Entity<StoryReaction>()
                .HasOne(sr => sr.Story)
                .WithMany()
                .HasForeignKey(sr => sr.StoryId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<StoryReaction>()
                .HasOne(sr => sr.User)
                .WithMany()
                .HasForeignKey(sr => sr.UserId)
                .OnDelete(DeleteBehavior.NoAction);

            // ─── SavedPost (Bookmarks) ───
            modelBuilder.Entity<SavedPost>()
                .HasKey(sp => sp.SavedPostId);

            modelBuilder.Entity<SavedPost>()
                .HasOne(sp => sp.User)
                .WithMany()
                .HasForeignKey(sp => sp.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<SavedPost>()
                .HasOne(sp => sp.Memory)
                .WithMany(m => m.SavedByUsers)
                .HasForeignKey(sp => sp.MemoryId)
                .OnDelete(DeleteBehavior.Cascade);

            // Prevent duplicate saves per user
            modelBuilder.Entity<SavedPost>()
                .HasIndex(sp => new { sp.UserId, sp.MemoryId })
                .IsUnique();

            // ─── HiddenPost ───
            modelBuilder.Entity<HiddenPost>()
                .HasKey(hp => hp.HiddenPostId);

            modelBuilder.Entity<HiddenPost>()
                .HasOne(hp => hp.User)
                .WithMany()
                .HasForeignKey(hp => hp.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<HiddenPost>()
                .HasOne(hp => hp.Memory)
                .WithMany(m => m.HiddenByUsers)
                .HasForeignKey(hp => hp.MemoryId)
                .OnDelete(DeleteBehavior.Cascade);

            // Prevent duplicate hides per user
            modelBuilder.Entity<HiddenPost>()
                .HasIndex(hp => new { hp.UserId, hp.MemoryId })
                .IsUnique();

            // ─── PostReport ───
            modelBuilder.Entity<PostReport>()
                .HasKey(r => r.ReportId);

            modelBuilder.Entity<PostReport>()
                .HasOne(r => r.Reporter)
                .WithMany()
                .HasForeignKey(r => r.ReporterId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<PostReport>()
                .HasOne(r => r.Memory)
                .WithMany(m => m.Reports)
                .HasForeignKey(r => r.MemoryId)
                .OnDelete(DeleteBehavior.Cascade);

            // ─── PostNotificationSetting ───
            modelBuilder.Entity<PostNotificationSetting>()
                .HasKey(s => s.SettingId);

            modelBuilder.Entity<PostNotificationSetting>()
                .HasOne(s => s.User)
                .WithMany()
                .HasForeignKey(s => s.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<PostNotificationSetting>()
                .HasOne(s => s.Memory)
                .WithMany(m => m.NotificationSettings)
                .HasForeignKey(s => s.MemoryId)
                .OnDelete(DeleteBehavior.Cascade);

            // Prevent duplicate settings per user+post
            modelBuilder.Entity<PostNotificationSetting>()
                .HasIndex(s => new { s.UserId, s.MemoryId })
                .IsUnique();
        }
    }
}

using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using backend.Models;
using backend.Repositories;
using Microsoft.AspNetCore.SignalR;
using backend.Hubs;

namespace backend.Services
{
    public interface IFriendshipService
    {
        Task<List<UserRelationDto>> GetAllUsersAsync(Guid currentUserId);
        Task<Friendship> SendFriendRequestAsync(Guid senderId, Guid receiverId);
        Task<Friendship?> AcceptFriendRequestAsync(Guid friendshipId);
        Task RemoveFriendAsync(Guid friendshipId);
        Task<List<UserDto>> GetFriendsAsync(Guid userId);
    }

    public class FriendshipService : IFriendshipService
    {
        private readonly IFriendshipRepository _friendshipRepository;
        private readonly IUserRepository _userRepository;
        private readonly IActivityLogRepository _activityLogRepository;
        private readonly INotificationService _notificationService;
        private readonly IHubContext<MemoryHub> _hubContext;

        public FriendshipService(
            IFriendshipRepository friendshipRepository, 
            IUserRepository userRepository, 
            IActivityLogRepository activityLogRepository,
            INotificationService notificationService,
            IHubContext<MemoryHub> hubContext)
        {
            _friendshipRepository = friendshipRepository;
            _userRepository = userRepository;
            _activityLogRepository = activityLogRepository;
            _notificationService = notificationService;
            _hubContext = hubContext;
        }

        public async Task<List<UserRelationDto>> GetAllUsersAsync(Guid currentUserId)
        {
            var users = await _userRepository.GetAllExceptAsync(currentUserId);
            var friendships = await _friendshipRepository.GetFriendshipsByUserIdAsync(currentUserId);
            
            var callerFriends = friendships
                .Where(f => f.Status == "Accepted")
                .Select(f => f.SenderId == currentUserId ? f.ReceiverId : f.SenderId)
                .ToList();

            var allAcceptedFriendships = await _friendshipRepository.GetAcceptedFriendshipsAsync();

            return users.Select(u =>
            {
                var relation = friendships.FirstOrDefault(f => f.SenderId == u.UserId || f.ReceiverId == u.UserId);
                string status = "None";

                if (relation != null)
                {
                    if (relation.Status == "Accepted")
                    {
                        status = "Accepted";
                    }
                    else if (relation.SenderId == currentUserId)
                    {
                        status = "Sent";
                    }
                    else
                    {
                        status = "Received";
                    }
                }

                var targetFriends = allAcceptedFriendships
                    .Where(f => f.SenderId == u.UserId || f.ReceiverId == u.UserId)
                    .Select(f => f.SenderId == u.UserId ? f.ReceiverId : f.SenderId)
                    .ToList();

                int mutualCount = callerFriends.Intersect(targetFriends).Count();
                string city = (u.Username.Length % 3 == 0) ? "Hà Nội" : (u.Username.Length % 3 == 1) ? "TP. Hồ Chí Minh" : "Đà Nẵng";

                return new UserRelationDto
                {
                    UserId = u.UserId,
                    Username = u.Username,
                    Email = u.Email,
                    AvatarUrl = u.AvatarUrl,
                    FriendshipStatus = status,
                    FriendshipId = relation?.FriendshipId,
                    MutualFriendsCount = mutualCount,
                    Location = city
                };
            }).ToList();
        }

        public async Task<Friendship> SendFriendRequestAsync(Guid senderId, Guid receiverId)
        {
            if (senderId == receiverId)
            {
                throw new Exception("You cannot add yourself as a friend.");
            }

            var alreadyFriends = await _friendshipRepository.RequestExistsAsync(senderId, receiverId);
            if (alreadyFriends)
            {
                throw new Exception("Friendship request already exists or you are already friends.");
            }

            var friendship = new Friendship
            {
                SenderId = senderId,
                ReceiverId = receiverId,
                Status = "Pending"
            };

            await _friendshipRepository.AddAsync(friendship);
            await _friendshipRepository.SaveChangesAsync();

            // Create notification record and broadcast
            await _notificationService.CreateNotificationAsync(receiverId, senderId, "FriendRequest", friendship.FriendshipId, "đã gửi cho bạn một lời mời kết bạn.");

            // Log activity
            var receiver = await _userRepository.GetByIdAsync(receiverId);
            string detail = receiver != null ? $"Đã gửi lời mời kết bạn đến {receiver.Username}." : "Đã gửi lời mời kết bạn.";
            await _activityLogRepository.LogActivityAsync(senderId, "FriendRequest", detail);

            // Notify real-time via SignalR Legacy Event
            var sender = await _userRepository.GetByIdAsync(senderId);
            if (sender != null)
            {
                await _hubContext.Clients.Group(receiverId.ToString()).SendAsync("OnFriendRequestReceived", new
                {
                    senderId = senderId,
                    senderUsername = sender.Username,
                    senderAvatarUrl = sender.AvatarUrl,
                    friendshipId = friendship.FriendshipId
                });
                await _hubContext.Clients.Group(receiverId.ToString()).SendAsync("OnFriendshipUpdated");
                await _hubContext.Clients.Group(senderId.ToString()).SendAsync("OnFriendshipUpdated");
            }

            return friendship;
        }

        public async Task<Friendship?> AcceptFriendRequestAsync(Guid friendshipId)
        {
            var request = await _friendshipRepository.GetByIdAsync(friendshipId);
            if (request == null) return null;

            request.Status = "Accepted";
            await _friendshipRepository.SaveChangesAsync();

            // Create notification record and broadcast to request sender
            await _notificationService.CreateNotificationAsync(request.SenderId, request.ReceiverId, "FriendAccept", request.FriendshipId, "đã chấp nhận lời mời kết bạn của bạn.");

            // Log activity for both receiver (accepter) and sender (requester)
            var sender = await _userRepository.GetByIdAsync(request.SenderId);
            string detailAccepter = sender != null ? $"Đã đồng ý kết bạn với {sender.Username}." : "Đã đồng ý kết bạn.";
            await _activityLogRepository.LogActivityAsync(request.ReceiverId, "FriendAccept", detailAccepter);

            var receiver = await _userRepository.GetByIdAsync(request.ReceiverId);
            string detailRequester = receiver != null ? $"Đã kết bạn với {receiver.Username}." : "Đã kết bạn.";
            await _activityLogRepository.LogActivityAsync(request.SenderId, "FriendAccept", detailRequester);

            // Notify both users in real-time
            await _hubContext.Clients.Group(request.SenderId.ToString()).SendAsync("OnFriendshipUpdated");
            await _hubContext.Clients.Group(request.ReceiverId.ToString()).SendAsync("OnFriendshipUpdated");

            return request;
        }

        public async Task RemoveFriendAsync(Guid friendshipId)
        {
            var friendship = await _friendshipRepository.GetByIdAsync(friendshipId);
            if (friendship == null) throw new Exception("Friendship not found.");

            // Log activity
            var sender = await _userRepository.GetByIdAsync(friendship.SenderId);
            var receiver = await _userRepository.GetByIdAsync(friendship.ReceiverId);
            string detail = (sender != null && receiver != null) ? $"Hủy kết bạn giữa {sender.Username} và {receiver.Username}." : "Đã hủy kết bạn.";
            
            await _friendshipRepository.RemoveAsync(friendship);
            await _friendshipRepository.SaveChangesAsync();

            await _activityLogRepository.LogActivityAsync(friendship.SenderId, "FriendRemove", detail);

            // Notify both users in real-time
            await _hubContext.Clients.Group(friendship.SenderId.ToString()).SendAsync("OnFriendshipUpdated");
            await _hubContext.Clients.Group(friendship.ReceiverId.ToString()).SendAsync("OnFriendshipUpdated");
        }

        public async Task<List<UserDto>> GetFriendsAsync(Guid userId)
        {
            var friendships = await _friendshipRepository.GetFriendshipsByUserIdAsync(userId);
            return friendships
                .Where(f => f.Status == "Accepted")
                .Select(f => f.SenderId == userId ? f.Receiver : f.Sender)
                .Select(u => new UserDto { UserId = u!.UserId, Username = u.Username, Email = u.Email, AvatarUrl = u.AvatarUrl })
                .ToList();
        }
    }

    public class UserRelationDto
    {
        public Guid UserId { get; set; }
        public string Username { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string AvatarUrl { get; set; } = string.Empty;
        public string FriendshipStatus { get; set; } = string.Empty;
        public Guid? FriendshipId { get; set; }
        public int MutualFriendsCount { get; set; }
        public string Location { get; set; } = string.Empty;
    }

    public class UserDto
    {
        public Guid UserId { get; set; }
        public string Username { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string AvatarUrl { get; set; } = string.Empty;
    }
}

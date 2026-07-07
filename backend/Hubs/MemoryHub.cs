using System;
using System.Collections.Concurrent;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.SignalR;

namespace backend.Hubs
{
    public class MemoryHub : Hub
    {
        // Tracks active online users: Key = ConnectionId, Value = UserId
        private static readonly ConcurrentDictionary<string, string> OnlineConnections = new();

        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            if (OnlineConnections.TryRemove(Context.ConnectionId, out var userId))
            {
                // If this user has no other active connections left, broadcast they went offline
                if (!OnlineConnections.Values.Contains(userId))
                {
                    await Clients.All.SendAsync("OnUserOffline", userId);
                }
            }
            await base.OnDisconnectedAsync(exception);
        }

        // Call this when client establishes connection to register online status
        public async Task RegisterOnline(string userId)
        {
            OnlineConnections[Context.ConnectionId] = userId;
            
            // Broadcast to all clients that this user is online
            await Clients.All.SendAsync("OnUserOnline", userId);

            // Also send list of currently online user IDs back to the caller
            var onlineUsers = OnlineConnections.Values.Distinct().ToList();
            await Clients.Caller.SendAsync("OnOnlineUsersList", onlineUsers);
        }

        // Add user connection to a specific group channel (for chat rooms)
        public async Task JoinGroup(string groupId)
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, groupId);
            Console.WriteLine($"Connection {Context.ConnectionId} joined group {groupId}");
        }

        // Remove user connection from group channel
        public async Task LeaveGroup(string groupId)
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, groupId);
            Console.WriteLine($"Connection {Context.ConnectionId} left group {groupId}");
        }

        // Broadcast emoji reaction to the group
        public async Task OnEmojiFloat(string groupId, string emoji)
        {
            await Clients.Group(groupId).SendAsync("OnEmojiFloat", emoji);
        }
    }
}

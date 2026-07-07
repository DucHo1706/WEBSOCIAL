import React, { useState, useEffect, useRef } from "react";
import { HubConnectionBuilder, LogLevel } from "@microsoft/signalr";
import { apiRequest, getApiUrl } from "./api";
import Landing from "./components/Landing";
import Home from "./components/Home";
import Timeline from "./components/Timeline";
import Chat from "./components/Chat";
import Recap from "./components/Recap";
import Friends from "./components/Friends";
import Profile from "./components/Profile";
import Notifications from "./components/Notifications";
import { Camera, BookOpen, ChatCircle, Play, Users, UserCircle, Bell, Moon, Sun, MagnifyingGlass } from "@phosphor-icons/react";

export default function App() {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("user");
    return saved ? JSON.parse(saved) : null;
  });

  const [activeTab, setActiveTab] = useState(() => {
    const saved = localStorage.getItem("activeTab");
    return saved || "Home";
  });
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [memories, setMemories] = useState([]);
  const [chatMessages, setChatMessages] = useState([]); // Buffer for real-time messages
  const [onlineUsers, setOnlineUsers] = useState([]); // List of online userIds
  const [showRecap, setShowRecap] = useState(false);
  const [connection, setConnection] = useState(null);

  // Sync activeTab to localStorage
  useEffect(() => {
    localStorage.setItem("activeTab", activeTab);
  }, [activeTab]);

  // Search state
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState({ users: [], memories: [] });

  // Debounced search
  useEffect(() => {
    if (!searchQuery || searchQuery.length < 2 || !user) {
      setSearchResults({ users: [], memories: [] });
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const data = await apiRequest(`/api/search?q=${encodeURIComponent(searchQuery)}&userId=${user.UserId}`, "GET");
        setSearchResults(data || { users: [], memories: [] });
      } catch (err) {
        console.error("Search error:", err);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery, user?.UserId]);

  // Dark mode - follows system preference, can be toggled manually
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem("darkMode");
    if (saved !== null) return saved === "true";
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  // Sync .dark class
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("darkMode", isDark);
  }, [isDark]);

  // Listen for system color scheme changes (only if user hasn't manually toggled)
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e) => {
      if (localStorage.getItem("darkMode") === null) {
        setIsDark(e.matches);
      }
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const toggleDark = () => setIsDark(prev => !prev);

  // Real-time notification toast state
  const [toast, setToast] = useState({ text: "", visible: false });

  const triggerNotification = (text) => {
    setToast({ text, visible: true });
    // Auto hide after 4 seconds
    setTimeout(() => {
      setToast(prev => ({ ...prev, visible: false }));
    }, 4000);
  };

  // Fetch initial global feed of posts & notifications
  useEffect(() => {
    if (!user) return;

    const loadData = async () => {
      try {
        const feedData = await apiRequest(`/api/memory/feed?userId=${user.UserId}`);
        setMemories(feedData);
      } catch (err) {
        console.error("Failed to load initial feed:", err);
      }
    };

    // Expose refresh function for child components (edit/delete)
    window.refreshFeed = loadData;

    const loadNotificationsCount = async () => {
      try {
        const data = await apiRequest(`/api/notification/${user.UserId}`);
        const unread = (data || []).filter(n => !n.IsRead).length;
        setUnreadNotifications(unread);
      } catch (err) {
        console.error("Failed to load notifications count:", err);
      }
    };

    loadData();
    loadNotificationsCount();
  }, [user]);

  // Establish SignalR connection - use ref to avoid stale closures
  const connectionRef = useRef(null);
  const onlineUsersRef = useRef([]);

  useEffect(() => {
    if (!user) return;

    // Clean up old connection if exists
    if (connectionRef.current) {
      connectionRef.current.stop();
    }

    const newConnection = new HubConnectionBuilder()
      .withUrl("/hubs/memories")
      .configureLogging(LogLevel.Warning)
      .withAutomaticReconnect()
      .build();

    connectionRef.current = newConnection;
    setConnection(newConnection);
  }, [user]);

  // Handle SignalR event subscriptions - use functional state updates to avoid stale closures
  useEffect(() => {
    if (!connection) return;

    // Use ref for user to avoid stale closure
    const currentUserId = user.UserId;
    const handleOnlineUsersList = (list) => {
      setOnlineUsers(list);
    };

    const handleUserOnline = (uId) => {
      setOnlineUsers(prev => {
        if (prev.includes(uId)) return prev;
        return [...prev, uId];
      });
    };

    const handleUserOffline = (uId) => {
      setOnlineUsers(prev => prev.filter(id => id !== uId));
    };

    const handleNewMemory = (memory) => {
      setMemories(prev => {
        if (prev.some(m => m.MemoryId === memory.MemoryId)) return prev;
        
        // Notify user if post is not theirs
        if (memory.UserId !== currentUserId) {
          triggerNotification(`📢 ${memory.User?.Username} vừa chia sẻ một kỷ niệm mới!`);
        }
        return [memory, ...prev];
      });
    };

    const handleNewComment = (comment) => {
      setMemories(prev => prev.map(m => {
        if (m.MemoryId !== comment.MemoryId) return m;

        let updatedComments = m.Comments ? [...m.Comments] : [];

        // Avoid duplicate additions
        const checkExists = (list) => {
          return list.some(c => c.CommentId === comment.CommentId || (c.Replies && checkExists(c.Replies)));
        };
        if (checkExists(updatedComments)) {
          return m;
        }

        if (comment.ParentCommentId) {
          const addReply = (list) => {
            return list.map(c => {
              if (c.CommentId === comment.ParentCommentId) {
                const replies = c.Replies ? [...c.Replies] : [];
                if (!replies.some(r => r.CommentId === comment.CommentId)) {
                  replies.push(comment);
                }
                return { ...c, Replies: replies };
              }
              if (c.Replies && c.Replies.length > 0) {
                return { ...c, Replies: addReply(c.Replies) };
              }
              return c;
            });
          };
          updatedComments = addReply(updatedComments);
        } else {
          updatedComments.push(comment);
        }

        return { ...m, Comments: updatedComments };
      }));
    };

    const handleReactionUpdate = (reactionUpdate) => {
      setMemories(prev => prev.map(m => {
        if (m.MemoryId === reactionUpdate.memoryId) {
          let updatedReactions = m.Reactions ? [...m.Reactions] : [];
          if (reactionUpdate.isRemoved) {
            updatedReactions = updatedReactions.filter(r => 
              !(r.User?.UserId === reactionUpdate.userId && r.EmojiType === reactionUpdate.emojiType)
            );
          } else {
            updatedReactions.push({
              ReactionId: reactionUpdate.reactionId,
              EmojiType: reactionUpdate.emojiType,
              User: { UserId: reactionUpdate.userId, Username: reactionUpdate.username }
            });
          }
          return { ...m, Reactions: updatedReactions };
        }
        return m;
      }));
    };

    // Use activeTabRef to avoid stale closure
    const activeTabRef = activeTab;
    const handleNewMessage = (message) => {
      setChatMessages(prev => [...prev, message]);
      
      // Notify user only if sender is someone else AND user is not in the active Chat tab
      if (message.UserId !== currentUserId && activeTabRef !== "Chat") {
        const textPreview = message.MessageText ? message.MessageText.substring(0, 20) : "Đã gửi một ảnh";
        if (message.GroupChatId) {
          triggerNotification(`👥 [Nhóm: ${message.GroupChatName || "Trò chuyện"}] ${message.User?.Username}: "${textPreview}"`);
        } else {
          triggerNotification(`💬 ${message.User?.Username}: "${textPreview}"`);
        }
      }
    };

    const handleFriendRequestReceived = (req) => {
      triggerNotification(`👤 ${req.senderUsername} đã gửi lời mời kết bạn!`);
      if (window.refreshFriendsList) {
        window.refreshFriendsList();
      }
    };

    const handleFriendshipUpdated = () => {
      if (window.refreshFriendsList) {
        window.refreshFriendsList();
      }
    };

    const handleEmojiFloat = (emoji) => {
      if (window.spawnFloatingEmoji) {
        window.spawnFloatingEmoji(emoji);
      }
    };

    const handleNewNotification = (notification) => {
      // Increment unread count
      setUnreadNotifications(prev => prev + 1);

      // Trigger notification banner toast
      triggerNotification(`🔔 ${notification.SenderName} ${notification.Text}`);

      // Refresh list if user is on Notifications tab
      if (window.refreshNotificationsList) {
        window.refreshNotificationsList();
      }

      // Refresh friends list if it's a friend-related notification
      if (window.refreshFriendsList && (notification.Type === "FriendRequest" || notification.Type === "FriendAccept")) {
        window.refreshFriendsList();
      }
    };

    const handleNewStory = (story) => {
      if (window.refreshStoriesFeed) {
        window.refreshStoriesFeed();
      }
    };

    // Register all event handlers before starting the connection
    connection.on("OnOnlineUsersList", handleOnlineUsersList);
    connection.on("OnUserOnline", handleUserOnline);
    connection.on("OnUserOffline", handleUserOffline);
    connection.on("OnNewMemory", handleNewMemory);
    connection.on("OnNewComment", handleNewComment);
    connection.on("OnReactionUpdate", handleReactionUpdate);
    connection.on("OnNewMessage", handleNewMessage);
    connection.on("OnFriendRequestReceived", handleFriendRequestReceived);
    connection.on("OnFriendshipUpdated", handleFriendshipUpdated);
    connection.on("OnEmojiFloat", handleEmojiFloat);
    connection.on("OnNewNotification", handleNewNotification);
    connection.on("OnNewStory", handleNewStory);

    // Register reconnection recovery handler to re-join user groups
    const registerUserGroups = async () => {
      try {
        await connection.invoke("RegisterOnline", user.UserId);
        await connection.invoke("JoinGroup", user.UserId);

        const userGroupChats = await apiRequest(`/api/chat/conversations/${user.UserId}`);
        userGroupChats.forEach(async (gc) => {
          if (gc.IsGroup) {
            await connection.invoke("JoinGroup", gc.UserId);
          }
        });
      } catch (err) {
        console.error("SignalR failed to register groups:", err);
      }
    };

    connection.onreconnected(async (connectionId) => {
      console.log("SignalR reconnected. Re-registering user groups...");
      await registerUserGroups();
    });

    const startConnection = async () => {
      try {
        await connection.start();
        console.log("SignalR Connection established.");
        await registerUserGroups();
      } catch (err) {
        console.error("SignalR connection failed: ", err);
      }
    };

    startConnection();

    return () => {
      // Unsubscribe all listeners on unmount
      connection.off("OnOnlineUsersList", handleOnlineUsersList);
      connection.off("OnUserOnline", handleUserOnline);
      connection.off("OnUserOffline", handleUserOffline);
      connection.off("OnNewMemory", handleNewMemory);
      connection.off("OnNewComment", handleNewComment);
      connection.off("OnReactionUpdate", handleReactionUpdate);
      connection.off("OnNewMessage", handleNewMessage);
      connection.off("OnFriendRequestReceived", handleFriendRequestReceived);
      connection.off("OnFriendshipUpdated", handleFriendshipUpdated);
      connection.off("OnEmojiFloat", handleEmojiFloat);
      connection.off("OnNewNotification", handleNewNotification);
      connection.off("OnNewStory", handleNewStory);
      connection.stop();
    };
  }, [connection, user]);

  // Auth callback
  const handleAuthSuccess = (userData) => {
    setUser(userData);
  };

  // Profile update callback
  const handleProfileUpdated = (updatedUser) => {
    setUser(updatedUser);
    localStorage.setItem("user", JSON.stringify(updatedUser));
  };

  // Memory additions & updates
  const handleNewMemoryAdded = (memory) => {
    setMemories(prev => {
      const idx = prev.findIndex(m => m.MemoryId === memory.MemoryId);
      if (idx !== -1) {
        // Memory exists → replace it with updated version (for edit, comment, reaction)
        const updated = [...prev];
        updated[idx] = { ...updated[idx], ...memory };
        return updated;
      }
      // New memory → prepend to feed
      return [memory, ...prev];
    });
  };

  const handleSendMessage = (message) => {
    setChatMessages(prev => {
      if (prev.some(m => m.ChatMessageId === message.ChatMessageId)) return prev;
      return [...prev, message];
    });
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("activeTab");
    setUser(null);
  };

  if (!user) {
    return (
      <Landing 
        onAuthSuccess={handleAuthSuccess} 
        onGroupSuccess={() => {}} 
      />
    );
  }

  return (
    <div className="min-h-[100dvh] bg-app text-app font-sans flex flex-col justify-between relative overflow-x-hidden">
      {/* Immersive Slideshow Recap Overlay */}
      {showRecap && (
        <Recap 
          memories={memories} 
          onClose={() => setShowRecap(false)} 
        />
      )}

      {/* Real-Time Notification Toast Banner */}
      <div 
        className={`fixed top-4 left-4 right-4 bg-stone-900/90 backdrop-blur-md border border-stone-800 text-white p-4 rounded-2xl z-55 flex items-center justify-between shadow-2xl transition-all duration-300 transform max-w-sm mx-auto ${
          toast.visible ? "translate-y-0 opacity-100" : "-translate-y-12 opacity-0 pointer-events-none"
        }`}
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold leading-relaxed">{toast.text}</span>
        </div>
        <button 
          onClick={() => setToast(prev => ({ ...prev, visible: false }))} 
          className="text-stone-400 hover:text-white text-xs font-bold pl-2 cursor-pointer"
        >
          ✕
        </button>
      </div>

      {/* Search & Dark Mode Controls */}
      <div className="sticky top-0 z-50 bg-card-custom/80 backdrop-blur-md border-b border-custom px-4 py-2.5 flex items-center gap-2 max-w-md mx-auto w-full">
        <div className="relative flex-1">
          <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-custom" />
          <input
            type="text"
            placeholder="Tìm kiếm bài viết, bạn bè..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setShowSearch(true)}
            className="w-full pl-8 pr-3 py-2 rounded-full bg-stone-100 dark:bg-[#2C2C2E] border border-stone-200 dark:border-[#3A3A3C] focus:outline-none focus:ring-2 focus:ring-coral-500/20 text-xs text-app placeholder-secondary-custom"
          />
        </div>
        <button
          onClick={toggleDark}
          className="p-2 rounded-xl hover:bg-stone-100 dark:hover:bg-[#2C2C2E] text-secondary-custom transition-colors cursor-pointer"
          title={isDark ? "Chế độ sáng" : "Chế độ tối"}
        >
          {isDark ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>

      {/* Search Dropdown */}
      {showSearch && searchQuery.length >= 2 && (
        <div className="fixed inset-0 z-45 bg-black/20" onClick={() => setShowSearch(false)} />
      )}
      {showSearch && searchQuery.length >= 2 && (
        <div className="absolute top-[56px] left-4 right-4 max-w-md mx-auto z-50 bg-card-custom border border-custom rounded-2xl shadow-xl overflow-hidden max-h-[60vh] overflow-y-auto">
          <div className="p-3 space-y-2">
            {(searchResults?.users || []).length > 0 && (
              <div>
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-secondary-custom mb-1.5">Người dùng</h4>
                {(searchResults.users || []).map(u => (
                  <div key={u.UserId} className="flex items-center gap-2 p-2 hover:bg-stone-50 dark:hover:bg-[#2C2C2E] rounded-xl cursor-pointer transition-colors">
                    <img src={u.AvatarUrl} alt="" className="w-7 h-7 rounded-full" />
                    <span className="text-xs font-semibold text-app">{u.Username}</span>
                  </div>
                ))}
              </div>
            )}
            {(searchResults?.memories || []).length > 0 && (
              <div>
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-secondary-custom mb-1.5">Bài viết</h4>
                {(searchResults.memories || []).map(m => (
                  <div key={m.MemoryId} className="flex items-center gap-2 p-2 hover:bg-stone-50 dark:hover:bg-[#2C2C2E] rounded-xl cursor-pointer transition-colors">
                    <img src={getApiUrl(m.ImageUrl)} alt="" className="w-10 h-10 rounded-lg object-cover" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-app truncate">{m.Caption || "Bài viết không tiêu đề"}</p>
                      <span className="text-[9px] text-secondary-custom">{m.Username}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {(searchResults?.memories || []).length === 0 && (searchResults?.users || []).length === 0 && (
              <p className="text-xs text-secondary-custom text-center py-4">Không tìm thấy kết quả phù hợp</p>
            )}
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className={`flex-1 ${activeTab === "Chat" ? "overflow-hidden pb-0" : "overflow-y-auto pb-24"}`}>
        {activeTab === "Home" && (
          <Home 
            user={user} 
            group={{ GroupName: "Sunlit Social Feed", GroupId: "" }} 
            recentMemories={memories} 
            onNewMemoryAdded={handleNewMemoryAdded} 
            onTriggerRecap={() => setShowRecap(true)}
          />
        )}
        {activeTab === "Friends" && (
          <Friends 
            user={user} 
            onlineUsers={onlineUsers}
          />
        )}
        {activeTab === "Notifications" && (
          <Notifications 
            user={user} 
            onNotificationRead={() => setUnreadNotifications(0)}
          />
        )}
        {activeTab === "Chat" && (
          <Chat 
            user={user} 
            group={{ GroupId: "" }}
            chatMessages={chatMessages} 
            onSendMessage={handleSendMessage} 
            onEmojiReactionTriggered={() => {}} 
            connection={connection}
          />
        )}
        {activeTab === "Profile" && (
          <Profile
            user={user}
            memories={memories}
            onProfileUpdated={handleProfileUpdated}
            onLogout={handleLogout}
          />
        )}
      </div>

      {/* Modern Floating Bottom Nav Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-card-custom/85 backdrop-blur-md border-t border-custom py-3 px-6 shadow-lg flex items-center justify-between max-w-md mx-auto rounded-t-3xl">
        <button
          onClick={() => setActiveTab("Home")}
          className={`flex flex-col items-center gap-1 cursor-pointer transition-colors ${activeTab === "Home" ? "text-coral-500 font-bold" : "text-stone-400 hover:text-stone-600"}`}
        >
          <Camera size={22} weight={activeTab === "Home" ? "fill" : "regular"} />
          <span className="text-[10px]">Bảng Tin</span>
        </button>

        <button
          onClick={() => setActiveTab("Friends")}
          className={`flex flex-col items-center gap-1 cursor-pointer transition-colors ${activeTab === "Friends" ? "text-coral-500 font-bold" : "text-stone-400 hover:text-stone-600"}`}
        >
          <Users size={22} weight={activeTab === "Friends" ? "fill" : "regular"} />
          <span className="text-[10px]">Bạn Bè</span>
        </button>

        <button
          onClick={() => setActiveTab("Notifications")}
          className={`flex flex-col items-center gap-1 cursor-pointer transition-colors relative ${activeTab === "Notifications" ? "text-coral-500 font-bold" : "text-stone-400 hover:text-stone-600"}`}
        >
          <Bell size={22} weight={activeTab === "Notifications" ? "fill" : "regular"} />
          <span className="text-[10px]">Thông Báo</span>
          {unreadNotifications > 0 && (
            <span className="absolute -top-1 -right-2.5 bg-coral-500 text-white text-[8px] font-bold px-1 py-0.2 rounded-full min-w-[14px] text-center border border-white">
              {unreadNotifications}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("Chat")}
          className={`flex flex-col items-center gap-1 cursor-pointer transition-colors ${activeTab === "Chat" ? "text-coral-500 font-bold" : "text-stone-400 hover:text-stone-600"}`}
        >
          <ChatCircle size={22} weight={activeTab === "Chat" ? "fill" : "regular"} />
          <span className="text-[10px]">Trò Chuyện</span>
        </button>

        <button
          onClick={() => setActiveTab("Profile")}
          className={`flex flex-col items-center gap-1 cursor-pointer transition-colors ${activeTab === "Profile" ? "text-coral-500 font-bold" : "text-stone-400 hover:text-stone-600"}`}
        >
          <UserCircle size={22} weight={activeTab === "Profile" ? "fill" : "regular"} />
          <span className="text-[10px]">Cá Nhân</span>
        </button>
      </div>
    </div>
  );
}

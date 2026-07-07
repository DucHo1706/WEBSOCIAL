import React, { useState, useEffect, useRef } from "react";
import { apiRequest, getApiUrl } from "../api";
import { PaperPlaneRight, Image, Smiley, Users, Plus, CaretLeft, Sparkle, ChatCircle } from "@phosphor-icons/react";

export default function Chat({ user, chatMessages, onSendMessage, onEmojiReactionTriggered, connection }) {
  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv] = useState(null); // Selected conversation details
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [floatingEmojis, setFloatingEmojis] = useState([]);

  // Reply state
  const [replyToMsg, setReplyToMsg] = useState(null);
  const [openMsgMenuId, setOpenMsgMenuId] = useState(null);

  // Create Group Chat modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [friendsList, setFriendsList] = useState([]);
  const [selectedFriends, setSelectedFriends] = useState([]); // List of userIds

  const messageEndRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    loadConversations();
    loadFriends();
  }, []);

  // Poll for messages or when active conversation changes
  useEffect(() => {
    if (!activeConv) return;
    loadChatHistory();
  }, [activeConv]);

  // Scroll to bottom when message list changes
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Handle real-time incoming messages directly from SignalR connection
  useEffect(() => {
    if (!connection) return;

    const handleIncomingMessage = (lastMsg) => {
      // Refresh conversation list preview order
      loadConversations();

      // If message is for currently active conversation
      if (activeConv) {
        const isCurrentGroupMsg = activeConv.IsGroup && lastMsg.GroupChatId === activeConv.UserId;
        const isCurrentDirectMsg = !activeConv.IsGroup && !lastMsg.GroupChatId && 
          ((lastMsg.UserId === user.UserId && lastMsg.ReceiverId === activeConv.UserId) ||
           (lastMsg.UserId === activeConv.UserId && lastMsg.ReceiverId === user.UserId));

        if (isCurrentGroupMsg || isCurrentDirectMsg) {
          // Avoid duplicates
          setMessages(prev => {
            if (prev.some(m => m.ChatMessageId === lastMsg.ChatMessageId)) return prev;
            return [...prev, lastMsg];
          });
        }
      }
    };

    connection.on("OnNewMessage", handleIncomingMessage);

    return () => {
      connection.off("OnNewMessage", handleIncomingMessage);
    };
  }, [connection, activeConv]);

  const loadConversations = async () => {
    try {
      const data = await apiRequest(`/api/chat/conversations/${user.UserId}`);
      setConversations(data);
    } catch (err) {
      console.error("Failed to load conversations:", err);
    }
  };

  const loadFriends = async () => {
    try {
      const data = await apiRequest(`/api/friendship/friends/${user.UserId}`);
      setFriendsList(data);
    } catch (err) {
      console.error("Failed to load friends:", err);
    }
  };

  const loadChatHistory = async () => {
    try {
      let data = [];
      if (activeConv.IsGroup) {
        data = await apiRequest(`/api/chat/history/group/${activeConv.UserId}`);
      } else {
        data = await apiRequest(`/api/chat/history/direct/${user.UserId}/${activeConv.UserId}`);
      }
      setMessages(data);
      scrollToBottom();
    } catch (err) {
      console.error("Failed to load chat history:", err);
    }
  };

  const scrollToBottom = () => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!text.trim() && !selectedImage) return;

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("UserId", user.UserId);
      
      if (activeConv.IsGroup) {
        formData.append("GroupChatId", activeConv.UserId);
      } else {
        formData.append("ReceiverId", activeConv.UserId);
      }

      if (text.trim()) {
        formData.append("MessageText", text.trim());
      }
      if (selectedImage) {
        formData.append("Image", selectedImage);
      }
      // Reply support
      if (replyToMsg) {
        formData.append("ReplyToMessageId", replyToMsg.ChatMessageId);
        formData.append("ReplyToText", replyToMsg.MessageText || (replyToMsg.ImageUrl ? "[Hình ảnh]" : ""));
      }

      const data = await apiRequest("/api/chat/send", "POST", formData, true);
      
      // Update local message list directly (SignalR will also broadcast but this handles instant preview)
      setMessages(prev => {
        if (prev.some(m => m.ChatMessageId === data.ChatMessageId)) return prev;
        return [...prev, data];
      });

      // Clear fields
      setText("");
      setSelectedImage(null);
      setImagePreview(null);
      setReplyToMsg(null);
      scrollToBottom();
    } catch (err) {
      alert("Gửi tin nhắn thất bại: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGroupChat = async (e) => {
    e.preventDefault();
    if (!newGroupName.trim() || selectedFriends.length === 0) {
      alert("Vui lòng điền tên nhóm chat và chọn ít nhất 1 thành viên!");
      return;
    }

    try {
      // Add current user to group members list
      const members = [...selectedFriends, user.UserId];
      const data = await apiRequest("/api/chat/group/create", "POST", {
        groupName: newGroupName.trim(),
        memberIds: members
      });

      // Tell SignalR to join group room immediately if connection is active
      if (connection) {
        await connection.invoke("JoinGroup", data.GroupChatId);
      }

      setShowCreateModal(false);
      setNewGroupName("");
      setSelectedFriends([]);
      loadConversations();
      
      // Select new group chat directly
      setActiveConv({
        UserId: data.GroupChatId,
        Username: data.GroupName,
        AvatarUrl: "",
        IsGroup: true,
        Name: data.GroupName
      });
    } catch (err) {
      alert("Tạo nhóm chat thất bại: " + err.message);
    }
  };

  const toggleSelectFriend = (friendId) => {
    setSelectedFriends(prev => 
      prev.includes(friendId) ? prev.filter(id => id !== friendId) : [...prev, friendId]
    );
  };

  const triggerEmojiFloat = (emoji) => {
    if (onEmojiReactionTriggered) {
      onEmojiReactionTriggered(emoji);
    }
    
    // Broadcast emoji floating locally and to group via SignalR
    if (connection && activeConv) {
      connection.invoke("OnEmojiFloat", activeConv.UserId.ToString(), emoji);
    }
    
    spawnFloatingEmoji(emoji);
  };

  const spawnFloatingEmoji = (emoji) => {
    const newEmojis = Array.from({ length: 8 }).map((_, index) => {
      const id = `${Date.now()}-${Math.random()}`;
      const style = {
        left: `${30 + Math.random() * 40}%`,
        bottom: `80px`,
        transform: `rotate(${Math.random() * 40 - 20}deg) scale(${0.8 + Math.random() * 0.6})`,
        animationDelay: `${index * 0.1}s`,
        animationDuration: `${1.5 + Math.random() * 1}s`
      };
      return { id, emoji, style };
    });

    setFloatingEmojis(prev => [...prev, ...newEmojis]);

    setTimeout(() => {
      setFloatingEmojis(prev => prev.filter(e => !newEmojis.map(ne => ne.id).includes(e.id)));
    }, 3000);
  };

  useEffect(() => {
    window.spawnFloatingEmoji = spawnFloatingEmoji;
    return () => {
      delete window.spawnFloatingEmoji;
    };
  }, []);

  return (
    <div className="pb-[72px] pt-4 px-4 max-w-md mx-auto flex flex-col h-[100dvh] relative overflow-hidden">
      {/* Floating Emoji Layer */}
      <div className="absolute inset-0 pointer-events-none z-50">
        {floatingEmojis.map((e) => (
          <span
            key={e.id}
            style={e.style}
            className="absolute text-3xl animate-float-up opacity-0"
          >
            {e.emoji}
          </span>
        ))}
      </div>

      {/* Main Container */}
      {!activeConv ? (
        // 1. Conversations inbox list
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex justify-between items-center pb-4 border-b border-stone-150 shrink-0">
            <div>
              <h2 className="font-display text-2xl font-bold text-stone-900">Hộp Thư Chat</h2>
              <p className="text-[10px] text-stone-400 font-bold uppercase tracking-wider mt-0.5">Trò chuyện trực tuyến</p>
            </div>
            <button
              onClick={() => { setShowCreateModal(true); setIsCreating(true); }}
              className="p-2.5 bg-coral-50 dark:bg-coral-500/10 hover:bg-coral-100 dark:hover:bg-coral-500/20 text-coral-500 rounded-xl flex items-center justify-center gap-1 text-xs font-bold transition-all cursor-pointer active:scale-95"
            >
              <Plus size={16} /> Nhóm Chat
            </button>
          </div>

          <div className="flex-1 overflow-y-auto py-3 space-y-2.5 pr-1 scrollbar-none">
            {conversations.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-stone-400 space-y-2">
                <ChatCircle size={38} className="text-stone-300 mx-auto" />
                <p className="text-xs">Bạn chưa có hội thoại nào. Kết bạn để bắt đầu trò chuyện nhé!</p>
              </div>
            ) : (
              conversations.map((c) => (
                <div
                  key={c.UserId}
                  onClick={() => setActiveConv(c)}
                  className="flex items-center gap-3 p-3.5 bg-card-custom border border-custom rounded-2xl cursor-pointer hover:border-coral-100 hover:bg-coral-50 dark:hover:bg-coral-500/10 transition-all shadow-xs"
                >
                  <img
                    src={c.AvatarUrl || `https://api.dicebear.com/7.x/identicon/svg?seed=${c.Name}`}
                    alt={c.Name}
                    className={`w-10 h-10 rounded-full border bg-stone-50 ${c.IsGroup ? "border-amber-400" : "border-coral-300"}`}
                  />
                  <div className="flex-1">
                    <span className="text-xs font-bold text-stone-850 block">{c.Name}</span>
                    <span className="text-[9px] font-bold text-stone-400 uppercase tracking-wider block mt-0.5">
                      {c.IsGroup ? "👥 Nhóm Chat" : "👤 Cá Nhân"}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        // 2. Chat screen room (Messenger window)
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-3 pb-3 border-b border-stone-150 shrink-0">
            <button
              onClick={() => { setActiveConv(null); setMessages([]); }}
              className="p-1.5 hover:bg-hover-custom rounded-lg text-secondary-custom cursor-pointer"
            >
              <CaretLeft size={20} />
            </button>
            <img
              src={activeConv.AvatarUrl || `https://api.dicebear.com/7.x/identicon/svg?seed=${activeConv.Name}`}
              alt={activeConv.Name}
              className="w-8 h-8 rounded-full border bg-stone-50"
            />
            <div>
              <span className="text-xs font-bold text-stone-800 block leading-tight">{activeConv.Name}</span>
              <span className="text-[9px] text-stone-400 block mt-0.5">
                {activeConv.IsGroup ? "Nhóm chat riêng" : "Đang hoạt động"}
              </span>
            </div>
          </div>

          {/* Messages list */}
          <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1 scrollbar-none">
            {messages.length === 0 ? (
              <p className="text-center text-[10px] text-tertiary-custom py-12">Không có tin nhắn nào. Gửi lời chào trước đi nào!</p>
            ) : (
              messages.map((msg) => {
                const isSelf = msg.UserId === user.UserId;
                return (
                  <div
                    key={msg.ChatMessageId}
                    className={`flex gap-2.5 items-end ${isSelf ? "flex-row-reverse" : "flex-row"}`}
                  >
                    {!isSelf && (
                      <img
                        src={msg.User?.AvatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${msg.User?.Username}`}
                        alt={msg.User?.Username}
                        className="w-7 h-7 rounded-full bg-coral-50 shrink-0"
                      />
                    )}
                    <div className={`max-w-[70%] space-y-1 ${isSelf ? "items-end" : "items-start"}`}>
                      <span className="text-[8px] font-bold text-tertiary-custom block px-1">
                        {!isSelf && `${msg.User?.Username} • `}
                        {new Date(msg.CreatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {/* Reply context - show quoted message */}
                      {msg.ReplyToText && (
                        <div className={`text-[9px] px-3 py-1 rounded-lg border-l-2 border-coral-300 dark:border-coral-500 ${isSelf ? "bg-coral-400/20" : "bg-stone-200 dark:bg-stone-700"} ${isSelf ? "text-white" : "text-stone-500 dark:text-stone-400"}`}>
                          <span className="font-semibold">Đã phản hồi: </span>
                          {msg.ReplyToText}
                        </div>
                      )}
                      <div className="relative group">
                        <div
                          className={`rounded-2xl p-3 text-xs leading-relaxed ${
                            isSelf
                              ? "bg-coral-500 text-white rounded-br-xs"
                              : "bg-card-custom border border-custom text-app rounded-bl-xs shadow-xs"
                          }`}
                        >
                          {msg.ImageUrl && (
                            <div className="rounded-xl overflow-hidden mb-2 bg-stone-950 border border-stone-250 aspect-[4/3]">
                              <img
                                src={getApiUrl(msg.ImageUrl)}
                                alt="Gửi ảnh"
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}
                          {msg.MessageText && <p>{msg.MessageText}</p>}
                        </div>
                        {/* ... menu button appears on hover */}
                        <div className={`absolute top-0 ${isSelf ? "left-0 -translate-x-full pl-1" : "right-0 translate-x-full pr-1"} opacity-0 group-hover:opacity-100 transition-opacity`}>
                          <button
                            onClick={() => setReplyToMsg(replyToMsg?.ChatMessageId === msg.ChatMessageId ? null : msg)}
                            className="w-6 h-6 rounded-full bg-card-custom border border-custom shadow-md flex items-center justify-center text-[9px] text-secondary-custom hover:text-coral-500 cursor-pointer"
                            title="Phản hồi"
                          >
                            ↩
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messageEndRef} />
          </div>

          {/* Bottom input section */}
          <div className="pt-2 bg-app border-t border-custom shrink-0 space-y-2">
            {/* Reply indicator */}
            {replyToMsg && (
              <div className="flex items-center gap-2 bg-coral-50 dark:bg-coral-500/15 border border-coral-200 dark:border-coral-500/30 px-3 py-1.5 rounded-xl text-[10px]">
                <span className="font-bold text-coral-500 shrink-0">↩ Đang phản hồi:</span>
                <span className="text-stone-600 dark:text-stone-400 truncate flex-1">{replyToMsg.MessageText || (replyToMsg.ImageUrl ? "[Hình ảnh]" : "")}</span>
                <button onClick={() => setReplyToMsg(null)} className="text-tertiary-custom hover:text-app cursor-pointer shrink-0 text-xs">
                  ✕
                </button>
              </div>
            )}
            {imagePreview && (
              <div className="relative inline-block bg-card-custom p-1 rounded-xl border border-custom">
                <img src={imagePreview} className="h-16 w-16 object-cover rounded-lg" alt="Preview" />
                <button
                  onClick={() => { setSelectedImage(null); setImagePreview(null); }}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-stone-900 text-white rounded-full flex items-center justify-center text-[10px] border border-white cursor-pointer"
                >
                  ✕
                </button>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              {/* Floating Quick Emojis row above input */}
              <div className="flex justify-start">
                <div className="flex bg-card-custom border border-custom rounded-full px-2 py-0.5 items-center gap-1.5 shadow-xs">
                  {["❤️", "🔥", "🎉", "😆"].map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => triggerEmojiFloat(emoji)}
                      className="w-7 h-7 flex items-center justify-center text-base active:scale-125 transition-transform cursor-pointer"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              {/* Chat Input form */}
              <form onSubmit={handleSend} className="w-full flex gap-1.5 bg-card-custom border border-custom rounded-full px-3 py-1.5 items-center shadow-xs">
                <button
                  type="button"
                  onClick={() => fileInputRef.current.click()}
                  className="p-1 text-stone-450 hover:text-stone-650 active:scale-95 cursor-pointer shrink-0"
                >
                  <Image size={18} />
                </button>

                <input
                  type="text"
                  placeholder="Nhập tin nhắn..."
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  className="flex-1 min-w-0 border-none focus:outline-none text-xs text-stone-900 px-1 placeholder-stone-400 bg-transparent"
                />

                <button
                  type="submit"
                  disabled={loading || (!text.trim() && !selectedImage)}
                  className="p-1.5 bg-coral-500 hover:bg-coral-600 disabled:opacity-50 text-white rounded-full flex items-center justify-center active:scale-95 cursor-pointer shadow-md shadow-coral-500/10 shrink-0"
                >
                  <PaperPlaneRight size={14} weight="fill" />
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImageChange}
        accept="image/*"
        className="hidden"
      />

      {/* 3. Create Group Chat modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-6 z-50">
          <div className="w-full max-w-xs bg-white rounded-3xl p-6 shadow-xl border border-stone-100">
            <h3 className="font-display text-base font-bold text-stone-900 mb-4 flex items-center gap-1">
              👥 Tạo Nhóm Chat Mới
            </h3>
            <form onSubmit={handleCreateGroupChat} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-stone-500 uppercase mb-1">Tên nhóm chat</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Team Ăn Nhậu, Bạn Cấp 3..."
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-coral-500/20 focus:border-coral-500 text-xs bg-stone-50 text-stone-900"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-stone-500 uppercase mb-1">Chọn thành viên</label>
                {friendsList.length === 0 ? (
                  <p className="text-[10px] text-stone-400 py-1">Bạn cần có bạn bè trước khi lập nhóm chat!</p>
                ) : (
                  <div className="max-h-28 overflow-y-auto space-y-1.5 pr-1 border border-stone-150 rounded-xl p-2 bg-stone-50/50">
                    {friendsList.map((friend) => (
                      <label key={friend.UserId} className="flex items-center gap-2 text-xs text-stone-850 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={selectedFriends.includes(friend.UserId)}
                          onChange={() => toggleSelectFriend(friend.UserId)}
                          className="rounded text-coral-500 focus:ring-coral-500"
                        />
                        <span>{friend.Username}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-2 text-xs">
                <button
                  type="button"
                  onClick={() => { setShowCreateModal(false); setNewGroupName(""); setSelectedFriends([]); }}
                  className="flex-1 py-2 bg-stone-100 hover:bg-stone-200 text-stone-600 rounded-xl font-bold transition-all cursor-pointer"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-coral-500 hover:bg-coral-600 text-white rounded-xl font-bold transition-all cursor-pointer"
                >
                  Tạo Nhóm
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        @keyframes floatUp {
          0% {
            transform: translateY(0) scale(0.5) rotate(0deg);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 0.8;
          }
          100% {
            transform: translateY(-400px) scale(1.5) rotate(45deg);
            opacity: 0;
          }
        }
        .animate-float-up {
          animation: floatUp 1.8s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
        }
      `}</style>
    </div>
  );
}

import React, { useState, useEffect, useRef } from "react";
import { apiRequest, getApiUrl } from "../api";
import { PaperPlaneRight, Image, Smiley, Users, Plus, CaretLeft, Sparkle, ChatCircle, Trash } from "@phosphor-icons/react";
import { motion, AnimatePresence } from "framer-motion";

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

  useEffect(() => {
    const handleGlobalClick = (e) => {
      if (!e.target.closest(".group-msg-bubble")) {
        setOpenMsgMenuId(null);
      }
    };
    window.addEventListener("click", handleGlobalClick);
    return () => window.removeEventListener("click", handleGlobalClick);
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
      loadConversations();

      if (activeConv) {
        const isCurrentGroupMsg = activeConv.IsGroup && lastMsg.GroupChatId === activeConv.UserId;
        const isCurrentDirectMsg = !activeConv.IsGroup && !lastMsg.GroupChatId && 
          ((lastMsg.UserId === user.UserId && lastMsg.ReceiverId === activeConv.UserId) ||
           (lastMsg.UserId === activeConv.UserId && lastMsg.ReceiverId === user.UserId));

        if (isCurrentGroupMsg || isCurrentDirectMsg) {
          setMessages(prev => {
            if (prev.some(m => m.ChatMessageId === lastMsg.ChatMessageId)) return prev;
            return [...prev, lastMsg];
          });
        }
      }
    };

    const handleMessageRecalled = (recalledMsgId) => {
      setMessages(prev =>
        prev.map(m => m.ChatMessageId === recalledMsgId ? { ...m, IsDeleted: true } : m)
      );
    };

    connection.on("OnNewMessage", handleIncomingMessage);
    connection.on("OnMessageRecalled", handleMessageRecalled);

    return () => {
      connection.off("OnNewMessage", handleIncomingMessage);
      connection.off("OnMessageRecalled", handleMessageRecalled);
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
      if (replyToMsg) {
        formData.append("ReplyToMessageId", replyToMsg.ChatMessageId);
        formData.append("ReplyToText", replyToMsg.MessageText || (replyToMsg.ImageUrl ? "[Hình ảnh]" : ""));
      }

      const data = await apiRequest("/api/chat/send", "POST", formData, true);
      
      setMessages(prev => {
        if (prev.some(m => m.ChatMessageId === data.ChatMessageId)) return prev;
        return [...prev, data];
      });

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

  const handleRecall = async (messageId) => {
    if (!window.confirm("Bạn có chắc chắn muốn thu hồi tin nhắn này không?")) return;
    try {
      await apiRequest(`/api/chat/recall/${messageId}?userId=${user.UserId}`, "POST");
      setMessages(prev =>
        prev.map(m => m.ChatMessageId === messageId ? { ...m, IsDeleted: true } : m)
      );
      setOpenMsgMenuId(null);
    } catch (err) {
      alert("Thu hồi tin nhắn thất bại: " + err.message);
    }
  };

  const handleCreateGroupChat = async (e) => {
    e.preventDefault();
    if (!newGroupName.trim() || selectedFriends.length === 0) {
      alert("Vui lòng điền tên nhóm chat và chọn ít nhất 1 thành viên!");
      return;
    }

    try {
      const members = [...selectedFriends, user.UserId];
      const data = await apiRequest("/api/chat/group/create", "POST", {
        groupName: newGroupName.trim(),
        memberIds: members
      });

      if (connection) {
        await connection.invoke("JoinGroup", data.GroupChatId);
      }

      setShowCreateModal(false);
      setNewGroupName("");
      setSelectedFriends([]);
      loadConversations();
      
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
    
    if (connection && activeConv) {
      connection.invoke("OnEmojiFloat", activeConv.UserId, emoji);
    }
    
    spawnFloatingEmoji(emoji);
  };

  const spawnFloatingEmoji = (emoji) => {
    const newEmojis = Array.from({ length: 8 }).map((_, index) => {
      const id = `${Date.now()}-${Math.random()}`;
      const style = {
        left: `${35 + Math.random() * 30}%`,
        bottom: `80px`,
        transform: `rotate(${Math.random() * 40 - 20}deg) scale(${0.8 + Math.random() * 0.6})`,
        animationDelay: `${index * 0.08}s`,
        animationDuration: `${1.2 + Math.random() * 0.8}s`
      };
      return { id, emoji, style };
    });

    setFloatingEmojis(prev => [...prev, ...newEmojis]);

    setTimeout(() => {
      setFloatingEmojis(prev => prev.filter(e => !newEmojis.map(ne => ne.id).includes(e.id)));
    }, 2500);
  };

  useEffect(() => {
    window.spawnFloatingEmoji = spawnFloatingEmoji;
    return () => {
      delete window.spawnFloatingEmoji;
    };
  }, []);

  return (
    <div className="pb-0 pt-4 px-4 max-w-md mx-auto flex flex-col h-[100dvh] relative overflow-hidden bg-app">
      {/* Floating Emoji Layer */}
      <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden">
        {floatingEmojis.map((e) => (
          <span
            key={e.id}
            style={e.style}
            className="absolute text-3xl animate-float-up opacity-0 select-none"
          >
            {e.emoji}
          </span>
        ))}
      </div>

      {/* Main Container */}
      {!activeConv ? (
        // 1. Conversations list
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex justify-between items-center pb-4 border-b border-custom shrink-0">
            <div>
              <h2 className="font-display text-2xl font-bold text-stone-850 dark:text-stone-100">Hộp Thư Chat</h2>
              <p className="text-[10px] text-stone-400 dark:text-stone-500 font-bold uppercase tracking-wider mt-0.5">Trò chuyện trực tuyến</p>
            </div>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setShowCreateModal(true)}
              className="p-2.5 bg-coral-50 dark:bg-coral-500/10 hover:bg-coral-100 dark:hover:bg-coral-500/25 text-coral-500 rounded-xl flex items-center justify-center gap-1 text-xs font-bold transition-all cursor-pointer shadow-sm border border-coral-200/20"
            >
              <Plus size={16} weight="bold" />
              <span>Tạo nhóm</span>
            </motion.button>
          </div>

          <div className="flex-1 overflow-y-auto py-3 space-y-2 pr-1 scrollbar-none">
            {conversations.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-stone-400 space-y-2">
                <ChatCircle size={38} className="text-stone-300 dark:text-stone-700 mx-auto" />
                <p className="text-xs">Bạn chưa có cuộc trò chuyện nào. Hãy kết bạn để bắt đầu tán gẫu nhé!</p>
              </div>
            ) : (
              conversations.map((c) => (
                <motion.div
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.99 }}
                  key={c.UserId}
                  onClick={() => setActiveConv(c)}
                  className="flex items-center gap-3 p-3.5 bg-white/70 dark:bg-stone-900/50 backdrop-blur-md border border-white/20 dark:border-stone-850/50 rounded-2xl cursor-pointer hover:border-coral-200/50 hover:bg-coral-50/20 dark:hover:bg-coral-500/5 transition-all shadow-sm"
                >
                  <img
                    src={c.AvatarUrl || `https://api.dicebear.com/7.x/identicon/svg?seed=${c.Name}`}
                    alt={c.Name}
                    className={`w-10 h-10 rounded-full border bg-stone-50 shadow-inner ${c.IsGroup ? "border-amber-400" : "border-coral-300"}`}
                  />
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-bold text-stone-800 dark:text-stone-150 block truncate leading-tight">{c.Name}</span>
                    <span className="text-[9px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider block mt-1">
                      {c.IsGroup ? "👥 Nhóm Chat" : "👤 Bạn Bè"}
                    </span>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>
      ) : (
        // 2. Chat screen room
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-3 pb-3 border-b border-custom shrink-0">
            <button
              onClick={() => { setActiveConv(null); setMessages([]); }}
              className="p-1.5 hover:bg-stone-100 dark:hover:bg-stone-850 rounded-xl text-stone-500 dark:text-stone-400 cursor-pointer transition-colors active:scale-95"
            >
              <CaretLeft size={20} weight="bold" />
            </button>
            <img
              src={activeConv.AvatarUrl || `https://api.dicebear.com/7.x/identicon/svg?seed=${activeConv.Name}`}
              alt={activeConv.Name}
              className="w-8 h-8 rounded-full border border-coral-200/30 bg-stone-50 shadow-sm"
            />
            <div>
              <span className="text-xs font-bold text-stone-850 dark:text-stone-150 block leading-tight">{activeConv.Name}</span>
              <span className="text-[9px] text-stone-400 dark:text-stone-500 block mt-0.5">
                {activeConv.IsGroup ? "Nhóm trò chuyện" : "Đang hoạt động"}
              </span>
            </div>
          </div>

          {/* Messages list */}
          <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1 scrollbar-none">
            {messages.length === 0 ? (
              <p className="text-center text-[10px] text-stone-400 py-12 italic">Không có tin nhắn nào. Bắt đầu cuộc trò chuyện ngay!</p>
            ) : (
              messages.map((msg) => {
                const isSelf = msg.UserId === user.UserId;
                return (
                  <div
                    key={msg.ChatMessageId}
                    className={`flex gap-2 items-end ${isSelf ? "flex-row-reverse" : "flex-row"}`}
                  >
                    {!isSelf && (
                      <img
                        src={msg.User?.AvatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${msg.User?.Username}`}
                        alt={msg.User?.Username}
                        className="w-6 h-6 rounded-full bg-coral-50 shadow-sm shrink-0 border border-stone-200/20"
                      />
                    )}
                    <div className={`max-w-[75%] space-y-1 ${isSelf ? "items-end" : "items-start"}`}>
                      <span className="text-[8px] font-bold text-stone-400 block px-1 leading-none">
                        {!isSelf && `${msg.User?.Username} • `}
                        {new Date(msg.CreatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      
                      {/* Quoted Message */}
                      {msg.ReplyToText && (
                        <div className={`text-[9px] px-2.5 py-1 rounded-xl border-l-2 border-coral-400/80 ${isSelf ? "bg-coral-500/10" : "bg-stone-100 dark:bg-stone-900"} text-stone-500 dark:text-stone-400 max-w-full truncate`}>
                          <span className="font-bold">Đã phản hồi: </span>
                          {msg.ReplyToText}
                        </div>
                      )}

                      <div className="relative group cursor-pointer group-msg-bubble" onClick={(e) => {
                        e.stopPropagation();
                        setOpenMsgMenuId(openMsgMenuId === msg.ChatMessageId ? null : msg.ChatMessageId);
                      }}>
                        <div
                          className={`p-3 text-xs leading-relaxed transition-all shadow-sm ${
                            msg.IsDeleted
                              ? "bg-stone-100 dark:bg-stone-950/40 text-stone-400 dark:text-stone-600 border border-stone-200/30 dark:border-stone-850/50 rounded-2xl italic"
                              : isSelf
                                ? "bg-coral-500 text-white rounded-2xl rounded-br-sm"
                                : "bg-white dark:bg-stone-900 border border-stone-200/30 dark:border-stone-850/60 text-stone-800 dark:text-stone-200 rounded-2xl rounded-bl-sm"
                          }`}
                        >
                          {msg.IsDeleted ? (
                            <p className="flex items-center gap-1.5"><span className="text-[10px]">🚫</span> Tin nhắn đã bị thu hồi</p>
                          ) : (
                            <>
                              {msg.ImageUrl && (
                                <div className="rounded-xl overflow-hidden mb-1.5 max-w-[200px] border border-stone-100 dark:border-stone-800 bg-stone-50">
                                  <img
                                    src={getApiUrl(msg.ImageUrl)}
                                    alt="Sent media"
                                    className="max-w-full max-h-[160px] object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      window.open(getApiUrl(msg.ImageUrl), '_blank');
                                    }}
                                  />
                                </div>
                              )}
                              {msg.MessageText && <p className="whitespace-pre-wrap">{msg.MessageText}</p>}
                            </>
                          )}
                        </div>

                        {/* Hover Popup Actions */}
                        {!msg.IsDeleted && (
                          <div className={`absolute top-1/2 -translate-y-1/2 ${isSelf ? "left-0 -translate-x-full pl-2" : "right-0 translate-x-full pr-2"} flex gap-1.5 items-center ${openMsgMenuId === msg.ChatMessageId ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto"} transition-opacity duration-150 z-20`}>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setReplyToMsg(replyToMsg?.ChatMessageId === msg.ChatMessageId ? null : msg);
                                setOpenMsgMenuId(null);
                              }}
                              className="w-9 h-9 rounded-full bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 shadow-md flex items-center justify-center text-sm text-stone-500 hover:text-coral-500 cursor-pointer active:scale-90"
                              title="Phản hồi"
                            >
                              ↩
                            </button>
                            {isSelf && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRecall(msg.ChatMessageId);
                                }}
                                className="w-9 h-9 rounded-full bg-white dark:bg-stone-800 border border-rose-200 dark:border-rose-900/50 text-rose-500 hover:text-rose-600 hover:bg-rose-50 shadow-md flex items-center justify-center text-sm cursor-pointer active:scale-90"
                                title="Thu hồi"
                              >
                                <Trash size={16} />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messageEndRef} />
          </div>

          {/* Bottom input section */}
          <div className="pt-2 pb-4 bg-app border-t border-custom shrink-0 space-y-2.5">
            {/* Reply bar indicator */}
            <AnimatePresence>
              {replyToMsg && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-center gap-2 bg-coral-50 dark:bg-coral-500/10 border border-coral-200/40 dark:border-coral-500/20 px-3 py-2 rounded-xl text-[10px]"
                >
                  <span className="font-bold text-coral-500 shrink-0">↩ Đang trả lời:</span>
                  <span className="text-stone-600 dark:text-stone-400 truncate flex-1">{replyToMsg.MessageText || (replyToMsg.ImageUrl ? "[Hình ảnh]" : "")}</span>
                  <button onClick={() => setReplyToMsg(null)} className="text-stone-400 hover:text-stone-600 cursor-pointer shrink-0 text-xs font-bold">
                    ✕
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {imagePreview && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="relative inline-block bg-white dark:bg-stone-900 p-1 rounded-xl border border-stone-200/50 dark:border-stone-800"
                >
                  <img src={imagePreview} className="h-16 w-16 object-cover rounded-lg" alt="Preview" />
                  <button
                    onClick={() => { setSelectedImage(null); setImagePreview(null); }}
                    className="absolute -top-2 -right-2 w-5 h-5 bg-stone-900/90 text-white rounded-full flex items-center justify-center text-[10px] border border-white/20 cursor-pointer shadow"
                  >
                    ✕
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex flex-col gap-2">
              {/* Quick Emojis row */}
              <div className="flex justify-start">
                <div className="flex bg-white/85 dark:bg-stone-900/80 backdrop-blur-md border border-stone-200/40 dark:border-stone-800/80 rounded-full px-2 py-0.5 items-center gap-1.5 shadow-sm">
                  {["❤️", "🔥", "🎉", "😆"].map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => triggerEmojiFloat(emoji)}
                      className="w-7 h-7 flex items-center justify-center text-sm active:scale-130 hover:scale-115 transition-transform cursor-pointer"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              {/* Input box */}
              <form onSubmit={handleSend} className="w-full flex gap-2 bg-white/90 dark:bg-stone-900/60 backdrop-blur-xl border border-white/20 dark:border-stone-850/80 rounded-full px-3 py-2 items-center shadow-md">
                <button
                  type="button"
                  onClick={() => fileInputRef.current.click()}
                  className="p-1.5 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 active:scale-95 cursor-pointer shrink-0 transition-colors"
                >
                  <Image size={18} />
                </button>

                <input
                  type="text"
                  placeholder="Nhập tin nhắn..."
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  className="flex-1 min-w-0 border-none focus:outline-none text-xs text-stone-800 dark:text-stone-100 px-1 placeholder-stone-400 bg-transparent"
                />

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  type="submit"
                  disabled={loading || (!text.trim() && !selectedImage)}
                  className="p-2 bg-coral-500 hover:bg-coral-600 disabled:opacity-50 text-white rounded-full flex items-center justify-center cursor-pointer shadow-md shadow-coral-500/15 shrink-0"
                >
                  <PaperPlaneRight size={13} weight="fill" />
                </motion.button>
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
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-55 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-stone-900/60 backdrop-blur-xs" 
              onClick={() => { setShowCreateModal(false); setNewGroupName(""); setSelectedFriends([]); }}
            />

            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-xs bg-white/95 dark:bg-stone-900/90 backdrop-blur-xl rounded-3xl p-6 shadow-2xl border border-white/20 dark:border-stone-800/80 z-10 space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="font-display text-base font-bold text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
                👥 Tạo Nhóm Chat
              </h3>
              
              <form onSubmit={handleCreateGroupChat} className="space-y-4">
                <div className="space-y-1">
                  <label className="block text-[9px] font-bold text-stone-400 uppercase tracking-wider">Tên nhóm chat</label>
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: Team Ăn Nhậu, Bạn Cấp 3..."
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 dark:border-stone-800 focus:outline-none focus:ring-2 focus:ring-coral-500/20 focus:border-coral-500 text-xs bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 transition-all placeholder-stone-400"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[9px] font-bold text-stone-400 uppercase tracking-wider">Chọn thành viên</label>
                  {friendsList.length === 0 ? (
                    <p className="text-[10px] text-stone-450 dark:text-stone-550 italic py-1 text-center">Bạn cần kết bạn trước khi lập nhóm chat!</p>
                  ) : (
                    <div className="max-h-28 overflow-y-auto space-y-1.5 pr-1 border border-stone-200/50 dark:border-stone-800/80 rounded-xl p-2.5 bg-stone-50/50 dark:bg-stone-950/30">
                      {friendsList.map((friend) => (
                        <label key={friend.UserId} className="flex items-center gap-2 text-xs text-stone-700 dark:text-stone-300 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={selectedFriends.includes(friend.UserId)}
                            onChange={() => toggleSelectFriend(friend.UserId)}
                            className="rounded border-stone-300 dark:border-stone-700 text-coral-500 focus:ring-coral-500"
                          />
                          <span className="font-medium">{friend.Username}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => { setShowCreateModal(false); setNewGroupName(""); setSelectedFriends([]); }}
                    className="flex-1 py-2 bg-stone-50 dark:bg-stone-950/40 border border-stone-200/50 dark:border-stone-800/80 text-stone-500 dark:text-stone-400 rounded-xl text-xs font-semibold cursor-pointer active:scale-95 transition-all"
                  >
                    Đóng
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 bg-coral-500 hover:bg-coral-600 text-white rounded-xl text-xs font-semibold cursor-pointer active:scale-95 transition-all shadow-md shadow-coral-500/10"
                  >
                    Tạo Nhóm
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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

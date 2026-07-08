import React, { useState, useEffect } from "react";
import { apiRequest, getApiUrl } from "../api";
import { ChatCircle, Heart, Smiley, PaperPlaneRight, Calendar, X } from "@phosphor-icons/react";

export default function Timeline({ user, group, memories, onCommentAdded, onReactionUpdated }) {
  const [activeCategory, setActiveCategory] = useState("Tất Cả Kỷ Niệm");
  const [filteredMemories, setFilteredMemories] = useState([]);
  const [activeCommentMemoryId, setActiveCommentMemoryId] = useState(null);
  const [newCommentText, setNewCommentText] = useState("");
  const [loadingComments, setLoadingComments] = useState(false);

  const categories = [
    { label: "Tất Cả Kỷ Niệm", dbLabel: "All Snaps", icon: null },
    { label: "Sinh Nhật", dbLabel: "Birthdays", icon: "🎂" },
    { label: "Du Lịch", dbLabel: "Travels", icon: "✈️" },
    { label: "Đời Thường", dbLabel: "Daily Snaps", icon: "🏡" },
    { label: "Cột Mốc", dbLabel: "Milestones", icon: "🏆" }
  ];

  useEffect(() => {
    fetchMemories();
  }, [activeCategory, memories]);

  const fetchMemories = async () => {
    try {
      const selected = categories.find(c => c.label === activeCategory);
      const queryCategory = selected ? selected.dbLabel : "All Snaps";
      const data = await apiRequest(`/api/memory/feed?category=${encodeURIComponent(queryCategory)}`);
      setFilteredMemories(data);
    } catch (err) {
      console.error("Failed to load memories:", err);
    }
  };

  const handleAddComment = async (e, memoryId) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;

    setLoadingComments(true);
    try {
      const data = await apiRequest(`/api/comment/${memoryId}`, "POST", {
        memoryId,
        userId: user.UserId,
        text: newCommentText.trim()
      });
      onCommentAdded(memoryId, data);
      setNewCommentText("");
    } catch (err) {
      alert("Gửi bình luận thất bại: " + err.message);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleReaction = async (memoryId, emoji) => {
    try {
      const data = await apiRequest("/api/memory/react", "POST", {
        memoryId,
        userId: user.UserId,
        emojiType: emoji
      });
      onReactionUpdated(memoryId, data);
    } catch (err) {
      console.error("Failed to react:", err);
    }
  };

  const hasReacted = (reactions, emoji) => {
    return (reactions || []).some(r => r.User?.UserId === user.UserId && r.EmojiType === emoji);
  };

  const getReactionCount = (reactions, emoji) => {
    return (reactions || []).filter(r => r.EmojiType === emoji).length;
  };

  const getCategoryVietnamese = (cat) => {
    if (cat === "Birthday") return "🎂 Sinh Nhật";
    if (cat === "Travel") return "✈️ Du Lịch";
    if (cat === "Milestone") return "🏆 Cột Mốc";
    return "🏡 Đời Thường";
  };

  return (
    <div className="pb-24 pt-4 px-4 max-w-md mx-auto relative min-h-[100dvh]">
      <h2 className="font-display text-2xl font-bold text-stone-900 mb-4">Kho Ảnh Kỷ Niệm</h2>

      {/* Category filters */}
      <div className="flex gap-2 overflow-x-auto pb-4 -mx-4 px-4 scrollbar-none">
        {categories.map((cat) => {
          const labelWithEmoji = cat.icon ? `${cat.icon} ${cat.label}` : cat.label;
          const isActive = activeCategory === cat.label;
          return (
            <button
              key={cat.label}
              onClick={() => setActiveCategory(cat.label)}
              className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap cursor-pointer transition-all ${
                isActive 
                  ? "bg-coral-500 text-white shadow-md shadow-coral-500/20" 
                  : "bg-white border border-stone-200 text-stone-600 hover:bg-stone-50"
              }`}
            >
              {labelWithEmoji}
            </button>
          );
        })}
      </div>

      {/* Timeline post list */}
      {filteredMemories.length === 0 ? (
        <div className="text-center py-12 bg-white border border-stone-100 rounded-3xl p-6 text-stone-400 text-xs mt-4">
          Chưa tìm thấy kỷ niệm nào thuộc danh mục: <span className="font-semibold">{activeCategory}</span>.
        </div>
      ) : (
        <div className="space-y-8 mt-4">
          {filteredMemories.map((memory) => {
            const memoryComments = memory.Comments || [];
            const memoryReactions = memory.Reactions || [];

            return (
              <div 
                key={memory.MemoryId}
                className="polaroid-card rounded-3xl overflow-hidden space-y-4"
              >
                {/* Author Info */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <img 
                      src={memory.User?.AvatarUrl} 
                      alt={memory.User?.Username}
                      className="w-8 h-8 rounded-full bg-coral-50"
                    />
                    <div>
                      <span className="text-xs font-bold text-stone-800 block">{memory.User?.Username}</span>
                      <span className="text-[9px] text-stone-400 block flex items-center gap-1 mt-0.5">
                        <Calendar size={10} />
                        {new Date(memory.CreatedAt).toLocaleDateString("vi-VN", { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider text-coral-500 bg-coral-50">
                    {getCategoryVietnamese(memory.Category)}
                  </span>
                </div>

                {/* Photo Styled as Polaroid card */}
                <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-stone-900 border border-stone-200">
                  <img 
                    src={getApiUrl(memory.ImageUrl)} 
                    alt={memory.Caption}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Caption */}
                {memory.Caption && (
                  <p className="text-xs text-stone-700 leading-relaxed font-medium bg-stone-50/50 p-2.5 rounded-xl border border-stone-100">
                    {memory.Caption}
                  </p>
                )}

                {/* Actions & Interactions */}
                <div className="flex items-center justify-between border-t border-stone-100 pt-3">
                  {/* Reactions */}
                  <div className="flex gap-1.5">
                    {["❤️", "🔥", "🎉", "😆"].map((emoji) => {
                      const active = hasReacted(memoryReactions, emoji);
                      const count = getReactionCount(memoryReactions, emoji);
                      return (
                        <button
                          key={emoji}
                          onClick={() => handleReaction(memory.MemoryId, emoji)}
                          className={`flex items-center gap-1 px-2 py-1 rounded-xl text-xs border transition-all cursor-pointer ${
                            active 
                              ? "bg-coral-50 border-coral-200 text-coral-500 font-bold" 
                              : "bg-stone-50 border-stone-150 text-stone-500 hover:bg-stone-100"
                          }`}
                        >
                          <span>{emoji}</span>
                          {count > 0 && <span className="text-[9px]">{count}</span>}
                        </button>
                      );
                    })}
                  </div>

                  {/* Comments Toggle */}
                  <button
                    onClick={() => setActiveCommentMemoryId(activeCommentMemoryId === memory.MemoryId ? null : memory.MemoryId)}
                    className="flex items-center gap-1 text-[10px] font-bold text-stone-500 hover:text-stone-800 px-3 py-1.5 rounded-xl bg-stone-50 hover:bg-stone-100 transition-colors cursor-pointer"
                  >
                    <ChatCircle size={14} />
                    <span>{memoryComments.length} bình luận</span>
                  </button>
                </div>

                {/* Inline Comment Section */}
                {activeCommentMemoryId === memory.MemoryId && (
                  <div className="border-t border-stone-100 pt-4 space-y-4">
                    <div className="max-h-48 overflow-y-auto space-y-3 pr-1">
                      {memoryComments.length === 0 ? (
                        <p className="text-center text-[10px] text-stone-400 py-2">Chưa có bình luận nào. Hãy gửi lời chúc đầu tiên!</p>
                      ) : (
                        memoryComments.map((comment) => (
                          <div key={comment.CommentId} className="flex gap-2 items-start text-[11px] bg-stone-50/50 p-2 rounded-xl">
                            <img 
                              src={comment.User?.AvatarUrl} 
                              alt={comment.User?.Username}
                              className="w-6 h-6 rounded-full"
                            />
                            <div className="flex-1">
                              <div className="flex justify-between items-center mb-0.5">
                                <span className="font-bold text-stone-850">{comment.User?.Username}</span>
                                <span className="text-[8px] text-stone-400">
                                  {new Date(comment.CreatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              <p className="text-stone-600 leading-relaxed">{comment.Text}</p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    <form onSubmit={(e) => handleAddComment(e, memory.MemoryId)} className="flex gap-2">
                      <input 
                        type="text"
                        placeholder="Viết phản hồi của bạn..."
                        value={newCommentText}
                        onChange={(e) => setNewCommentText(e.target.value)}
                        className="flex-1 px-3 py-1.5 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-coral-500/20 focus:border-coral-500 text-xs bg-stone-50/50 text-stone-900"
                      />
                      <button 
                        type="submit"
                        disabled={loadingComments}
                        className="p-1.5 bg-coral-500 hover:bg-coral-600 text-white rounded-xl flex items-center justify-center active:scale-95 transition-all cursor-pointer shadow-md shadow-coral-500/10"
                      >
                        <PaperPlaneRight size={14} weight="fill" />
                      </button>
                    </form>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

import { useState, useRef, useCallback } from "react";
import { ChatCircle, DotsThreeVertical, Heart } from "@phosphor-icons/react";
import { getApiUrl } from "../../api";
import PostMenu from "./PostMenu";

const categories = {
  "Du Lịch": "✈️ Du Lịch",
  "Ẩm Thực": "🍜 Ẩm Thực",
  "Kỷ Niệm": "💝 Kỷ Niệm",
  "Bạn Bè": "👥 Bạn Bè",
  "Đời Thường": "🏡 Đời Thường",
};

function getRelativeTime(dateStr) {
  const now = new Date();
  const d = new Date(dateStr);
  const diff = now - d;
  const sec = Math.floor(diff / 1000);
  if (sec < 5) return "Vừa xong";
  if (sec < 60) return `${sec} giây trước`;
  const min = Math.floor(sec / 60);
  if (min === 1) return "1 phút trước";
  if (min < 60) return `${min} phút trước`;
  const hrs = Math.floor(min / 60);
  if (hrs === 1) return "1 giờ trước";
  if (hrs < 24) return `${hrs} giờ trước`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "Hôm qua";
  if (days < 7) return `${days} ngày trước`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks} tuần trước`;
  return d.toLocaleDateString("vi-VN");
}

export default function PostCard({
  memory, user, menuOpenId, onToggleMenu, onShare, onEdit, onDelete,
  onCommentClick, onImageClick, onDoubleTapReact, getReaction, getCount
}) {
  const [activeImgIdx, setActiveImgIdx] = useState(0);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const holdTimerRef = useRef(null);
  const didHoldRef = useRef(false);
  const pressingSourceRef = useRef(null);
  const images = memory.Images?.length > 0 ? memory.Images : (memory.ImageUrl ? [memory.ImageUrl] : []);
  const isOwner = memory.User?.UserId === user.UserId;

  const EMOJIS = ["❤️", "😂", "😮", "😢", "👍", "😡"];

  // Get user's current active reaction, if any
  const userReaction = (memory.Reactions || []).find(r => r.User?.UserId === user.UserId);
  const userEmoji = userReaction?.EmojiType || null;
  const totalReactions = (memory.Reactions || []).length;

  const handleReactionPick = (emoji) => {
    didHoldRef.current = true; // Prevent endPress from also firing a toggle
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    setShowReactionPicker(false);
    onDoubleTapReact?.(memory.MemoryId, emoji);
  };

  const startPress = () => {
    didHoldRef.current = false;
    holdTimerRef.current = setTimeout(() => {
      didHoldRef.current = true;
      setShowReactionPicker(true);
    }, 350);
  };

  const endPress = () => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    // If picker is showing, don't fire like toggle
    if (!didHoldRef.current) {
      // Quick tap: toggle like
      onDoubleTapReact?.(memory.MemoryId, userEmoji ? userEmoji : "❤️");
    }
    didHoldRef.current = false;
  };

  const cancelPress = () => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    didHoldRef.current = false;
  };

  // Reaction popup component
  const ReactionPopup = () => (
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-30">
      <div className="bg-white dark:bg-[#2C2C2E] rounded-full shadow-xl border border-stone-200 dark:border-stone-700 px-3 py-2 flex gap-1.5 items-center">
        {EMOJIS.map(emoji => (
          <button
            key={emoji}
            onClick={(e) => { e.stopPropagation(); handleReactionPick(emoji); }}
            className={`text-xl hover:scale-125 transition-transform cursor-pointer active:scale-150 ${userEmoji === emoji ? 'scale-125' : ''}`}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );

  // Polaroid card cho bài đăng có hình ảnh
  if (images.length > 0) {
    return (
      <div className="polaroid-card mb-6">
        {/* Header: Avatar + Username + Dots menu ở trên cùng */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <img src={memory.User?.AvatarUrl} alt={memory.User?.Username} className="w-7 h-7 rounded-full border border-stone-200 dark:border-stone-800 shadow-sm" />
            <div>
              <span className="text-xs font-bold text-stone-800 dark:text-stone-100 block leading-tight">{memory.User?.Username}</span>
              <span className="text-[8px] text-stone-400 block">{getRelativeTime(memory.CreatedAt)}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {memory.Category && categories[memory.Category] && (
              <span className="px-2 py-0.5 rounded-md text-[8px] font-bold text-coral-600 bg-coral-50 dark:bg-coral-500/10">
                {categories[memory.Category]}
              </span>
            )}
            <div className="relative">
              <button onClick={() => onToggleMenu(memory.MemoryId)} className="p-2 rounded-md hover:bg-stone-50 dark:hover:bg-stone-850 text-stone-400 hover:text-stone-600 transition-colors cursor-pointer">
                <DotsThreeVertical size={20} weight="bold" />
              </button>
              {menuOpenId === memory.MemoryId && (
                <PostMenu memoryId={memory.MemoryId} isOwner={isOwner} onClose={() => onToggleMenu(null)} onShare={onShare} onEdit={onEdit} onDelete={onDelete} />
              )}
            </div>
          </div>
        </div>

        {/* Image inside polaroid */}
        <div className="relative aspect-square rounded-sm overflow-hidden bg-stone-900 border border-stone-200/40 dark:border-stone-800/80" onClick={() => onImageClick(images[activeImgIdx])}>
          <img src={getApiUrl(images[activeImgIdx])} alt="" className="w-full h-full object-cover select-none" />
          {/* Privacy badge */}
          {memory.Privacy && memory.Privacy !== "Public" && (
            <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded-md text-[8px] font-bold bg-black/40 text-white backdrop-blur-sm">
              {memory.Privacy === "Friends" ? "👥 Bạn bè" : "🔒 Riêng tư"}
            </span>
          )}
        </div>

        {/* Image dots indicator if multiple images */}
        {images.length > 1 && (
          <div className="flex justify-center gap-1.5 mt-2">
            {images.map((_, idx) => (
              <button key={idx} onClick={(e) => { e.stopPropagation(); setActiveImgIdx(idx); }} className={`h-1.5 rounded-full transition-all cursor-pointer ${idx === activeImgIdx ? 'bg-stone-800 dark:bg-stone-300 w-3' : 'bg-stone-300 dark:bg-stone-700 w-1.5'}`} />
            ))}
          </div>
        )}

        {/* Polaroid caption */}
        {memory.Caption && (
          <p className="polaroid-caption">
            {memory.Caption}
          </p>
        )}

        {/* Reactions & Actions */}
        <div className="flex items-center justify-between mt-3 pt-2 border-t border-stone-50 dark:border-stone-900/30">
          {/* Single Like button with hold-to-pick popup */}
          <div className="relative"
            onMouseDown={startPress}
            onMouseUp={endPress}
            onMouseLeave={cancelPress}
            onTouchStart={startPress}
            onTouchEnd={endPress}
            onTouchCancel={cancelPress}
          >
            <button
              type="button"
              className={`flex items-center gap-2 text-sm font-bold transition-all cursor-pointer select-none px-4 py-2 rounded-xl ${
                userEmoji
                  ? 'bg-coral-50 dark:bg-coral-500/10 border border-coral-200 dark:border-coral-500/20 text-coral-600'
                  : 'bg-stone-50 dark:bg-[#2C2C2E]/30 text-stone-500 hover:bg-stone-100 dark:hover:bg-[#2C2C2E]/50'
              }`}
            >
              {userEmoji ? (
                <span className="text-xl">{userEmoji}</span>
              ) : (
                <Heart size={18} weight="regular" />
              )}
              <span>Thích</span>
              {totalReactions > 0 && <span className="text-stone-400 font-semibold">· {totalReactions}</span>}
            </button>
            {showReactionPicker && <ReactionPopup />}
          </div>

          <button onClick={() => onCommentClick(memory.MemoryId)} className="flex items-center gap-2 text-sm font-bold text-stone-500 hover:text-coral-500 transition-colors cursor-pointer px-4 py-2 rounded-xl bg-stone-50 dark:bg-[#2C2C2E]/30 hover:bg-stone-100 dark:hover:bg-[#2C2C2E]">
            <ChatCircle size={18} />
            <span>Bình luận</span>
          </button>
        </div>

        {/* Dismiss picker on outside click */}
        {showReactionPicker && <div className="fixed inset-0 z-20" onClick={() => { setShowReactionPicker(false); didHoldRef.current = false; }} />}
      </div>
    );
  }

  // Card hiện đại cho bài đăng nhiều chữ / không có hình ảnh
  return (
    <div className="bg-white/80 dark:bg-[#1C1C1E]/60 backdrop-blur-md border border-white/20 dark:border-stone-800/80 rounded-3xl p-5 shadow-lg shadow-stone-200/10 dark:shadow-none mb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <img src={memory.User?.AvatarUrl} alt={memory.User?.Username} className="w-9 h-9 rounded-full border border-coral-200/50 bg-stone-50 shadow-sm" />
          <div>
            <span className="text-xs font-bold text-stone-800 dark:text-stone-100 block leading-tight">{memory.User?.Username}</span>
            <span className="text-[9px] text-stone-400 flex items-center gap-1.5 mt-0.5">
              {getRelativeTime(memory.CreatedAt)}
              {memory.Category && categories[memory.Category] && (
                <span className="px-1.5 py-0.5 rounded-full text-[8px] font-extrabold text-coral-500 bg-coral-50 dark:bg-coral-500/10">
                  {categories[memory.Category]}
                </span>
              )}
            </span>
          </div>
        </div>
        {/* 3-dot menu */}
        <div className="relative">
          <button onClick={() => onToggleMenu(memory.MemoryId)} className="p-1.5 rounded-full hover:bg-stone-50 dark:hover:bg-stone-850 text-stone-400 hover:text-stone-700 transition-colors cursor-pointer">
            <DotsThreeVertical size={18} weight="bold" />
          </button>
          {menuOpenId === memory.MemoryId && (
            <PostMenu memoryId={memory.MemoryId} isOwner={isOwner} onClose={() => onToggleMenu(null)} onShare={onShare} onEdit={onEdit} onDelete={onDelete} />
          )}
        </div>
      </div>

      {/* Modern Card Body text */}
      {memory.Caption && (
        <p className="text-sm text-stone-800 dark:text-stone-200 leading-relaxed font-normal bg-stone-50/30 dark:bg-stone-950/20 p-4 rounded-2xl border border-stone-100/50 dark:border-stone-850/30 mb-4">
          {memory.Caption}
        </p>
      )}

      {/* Reactions & Actions Row */}
      <div className="flex items-center justify-between border-t border-stone-100 dark:border-stone-800/40 pt-3">
        {/* Single Like button with hold-to-pick popup */}
        <div className="relative"
          onMouseDown={startPress}
          onMouseUp={endPress}
          onMouseLeave={cancelPress}
          onTouchStart={startPress}
          onTouchEnd={endPress}
          onTouchCancel={cancelPress}
        >
          <button
            type="button"
            className={`flex items-center gap-2 text-sm font-bold transition-all cursor-pointer select-none px-5 py-2.5 rounded-full ${
              userEmoji
                ? 'bg-coral-500 text-white shadow-md shadow-coral-500/20'
                : 'bg-stone-50 dark:bg-[#2C2C2E]/50 text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-[#2C2C2E]'
            }`}
          >
            {userEmoji ? (
              <span className="text-xl">{userEmoji}</span>
            ) : (
              <Heart size={20} weight="regular" />
            )}
            <span>Thích</span>
            {totalReactions > 0 && <span className="opacity-70">· {totalReactions}</span>}
          </button>
          {showReactionPicker && <ReactionPopup />}
        </div>

        <button onClick={() => onCommentClick(memory.MemoryId)} className="flex items-center gap-2 text-sm font-semibold text-stone-500 hover:text-coral-500 px-5 py-2.5 rounded-full bg-stone-50 dark:bg-[#2C2C2E]/50 hover:bg-stone-100 dark:hover:bg-[#2C2C2E] transition-all cursor-pointer">
          <ChatCircle size={18} />
          <span>Bình luận</span>
        </button>
      </div>
      
      {/* Dismiss picker on outside click */}
      {showReactionPicker && <div className="fixed inset-0 z-20" onClick={() => { setShowReactionPicker(false); didHoldRef.current = false; }} />}
    </div>
  );
}

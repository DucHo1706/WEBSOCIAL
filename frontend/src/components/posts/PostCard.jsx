import { useState } from "react";
import { Heart, DotsThreeVertical, ChatCircle } from "@phosphor-icons/react";
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
  const [liking, setLiking] = useState(false);
  const [floatingHearts, setFloatingHearts] = useState([]);
  const images = memory.Images?.length > 0 ? memory.Images : (memory.ImageUrl ? [memory.ImageUrl] : []);
  const isOwner = memory.User?.UserId === user.UserId;

  const handleDoubleTap = (e) => {
    e.preventDefault();
    // Create a floating heart
    const id = Date.now();
    setFloatingHearts(prev => [...prev, id]);
    setTimeout(() => setFloatingHearts(prev => prev.filter(h => h !== id)), 1200);
    onDoubleTapReact?.(memory.MemoryId);
  };

  return (
    <div className="bg-card-custom rounded-3xl border border-coral-100/60 p-4 shadow-md shadow-coral-100/5 mb-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <img src={memory.User?.AvatarUrl} alt={memory.User?.Username} className="w-8 h-8 rounded-full border border-coral-250 bg-stone-50" />
          <div>
            <span className="text-xs font-bold text-app block">{memory.User?.Username}</span>
            <span className="text-[9px] text-secondary-custom flex items-center gap-1">
              {getRelativeTime(memory.CreatedAt)}
              {memory.Category && categories[memory.Category] && (
                <span className="px-1.5 py-0.5 rounded-full text-[8px] font-bold text-coral-500 bg-coral-50 dark:bg-coral-500/10 ml-1">
                  {categories[memory.Category]}
                </span>
              )}
            </span>
          </div>
        </div>
        {/* 3-dot menu */}
        <div className="relative">
          <button onClick={() => onToggleMenu(memory.MemoryId)} className="p-1.5 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-400 hover:text-stone-700 transition-colors cursor-pointer">
            <DotsThreeVertical size={18} weight="bold" />
          </button>
          {menuOpenId === memory.MemoryId && (
            <PostMenu memoryId={memory.MemoryId} isOwner={isOwner} onClose={() => onToggleMenu(null)} onShare={onShare} onEdit={onEdit} onDelete={onDelete} />
          )}
        </div>
      </div>

      {/* Caption */}
      {memory.Caption && (
        <p className="text-xs text-stone-700 dark:text-stone-400 leading-relaxed font-medium bg-stone-50/50 dark:bg-[#1C1C1E] p-2.5 rounded-xl border border-stone-100 dark:border-stone-700 mb-3">
          {memory.Caption}
        </p>
      )}

      {/* Image */}
      {images.length > 0 && (
        <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-stone-900 border border-custom group cursor-pointer mb-3" onClick={() => onImageClick(images[activeImgIdx])} onDoubleClick={handleDoubleTap}>
          <img src={getApiUrl(images[activeImgIdx])} alt="" className="w-full h-full object-cover" />
          {/* Privacy badge */}
          {memory.Privacy && memory.Privacy !== "Public" && (
            <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded-md text-[8px] font-bold bg-black/40 text-white backdrop-blur-sm">
              {memory.Privacy === "Friends" ? "👥 Bạn bè" : "🔒 Riêng tư"}
            </span>
          )}
          {/* Floating hearts */}
          {floatingHearts.map(id => (
            <span key={id} className="absolute bottom-4 left-1/2 -translate-x-1/2 animate-float-up pointer-events-none">❤️</span>
          ))}
        </div>
      )}

      {/* Image dots indicator */}
      {images.length > 1 && (
        <div className="flex justify-center gap-1.5 mb-3">
          {images.map((_, idx) => (
            <button key={idx} onClick={() => setActiveImgIdx(idx)} className={`h-1.5 rounded-full transition-all cursor-pointer ${idx === activeImgIdx ? 'bg-white dark:bg-stone-400 w-3' : 'bg-white/50 dark:bg-stone-600 w-1.5'}`} />
          ))}
        </div>
      )}

      {/* Reactions row */}
      <div className="flex flex-wrap gap-1 mb-2">
        {["❤️", "😂", "😮", "😢", "👍", "😡"].map(emoji => {
          const count = getCount?.(memory.Reactions, emoji) || 0;
          const active = getReaction?.(memory.Reactions, emoji) || false;
          return (
            <button key={emoji} onClick={() => onDoubleTapReact?.(memory.MemoryId, emoji)} className={`px-2 py-0.5 rounded-full text-[10px] transition-all cursor-pointer ${active ? 'bg-coral-50 dark:bg-coral-500/10 border border-coral-200 dark:border-coral-500/30' : 'bg-stone-50 dark:bg-[#2C2C2E] border border-transparent hover:bg-stone-100 dark:hover:bg-stone-700'}`}>
              {emoji} {count > 0 && <span className="text-[9px] font-bold text-app ml-0.5">{count}</span>}
            </button>
          );
        })}
      </div>

      {/* Action buttons */}
      <div className="flex gap-1.5">
        <button onClick={() => onCommentClick(memory.MemoryId)} className="flex items-center gap-1 text-[10px] font-bold text-stone-500 hover:text-stone-800 px-2.5 py-1 rounded-xl bg-stone-50 dark:bg-[#2C2C2E] hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors cursor-pointer">
          <ChatCircle size={14} />
          <span>Bình luận</span>
        </button>
      </div>
    </div>
  );
}

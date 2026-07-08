import { useState } from "react";
import { ChatCircle, DotsThreeVertical } from "@phosphor-icons/react";
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
  const [floatingHearts, setFloatingHearts] = useState([]);
  const images = memory.Images?.length > 0 ? memory.Images : (memory.ImageUrl ? [memory.ImageUrl] : []);
  const isOwner = memory.User?.UserId === user.UserId;

  const handleDoubleTap = (e) => {
    e.preventDefault();
    const id = Date.now();
    setFloatingHearts(prev => [...prev, id]);
    setTimeout(() => setFloatingHearts(prev => prev.filter(h => h !== id)), 1200);
    onDoubleTapReact?.(memory.MemoryId);
  };

  // Polaroid cổ điển cho bài đăng có hình ảnh
  if (images.length > 0) {
    return (
      <div className="polaroid-card mb-6">
        {/* Image inside polaroid */}
        <div className="relative aspect-square rounded-sm overflow-hidden bg-stone-900 border border-stone-200/40 dark:border-stone-800/80 group cursor-pointer" onClick={() => onImageClick(images[activeImgIdx])} onDoubleClick={handleDoubleTap}>
          <img src={getApiUrl(images[activeImgIdx])} alt="" className="w-full h-full object-cover select-none" />
          {/* Privacy badge */}
          {memory.Privacy && memory.Privacy !== "Public" && (
            <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded-md text-[8px] font-bold bg-black/40 text-white backdrop-blur-sm">
              {memory.Privacy === "Friends" ? "👥 Bạn bè" : "🔒 Riêng tư"}
            </span>
          )}
          {/* Floating hearts */}
          {floatingHearts.map(id => (
            <span key={id} className="absolute bottom-4 left-1/2 -translate-x-1/2 animate-float-up pointer-events-none text-2xl select-none">❤️</span>
          ))}
        </div>

        {/* Image dots indicator if multiple images */}
        {images.length > 1 && (
          <div className="flex justify-center gap-1.5 mt-2">
            {images.map((_, idx) => (
              <button key={idx} onClick={(e) => { e.stopPropagation(); setActiveImgIdx(idx); }} className={`h-1.5 rounded-full transition-all cursor-pointer ${idx === activeImgIdx ? 'bg-stone-800 dark:bg-stone-300 w-3' : 'bg-stone-300 dark:bg-stone-700 w-1.5'}`} />
            ))}
          </div>
        )}

        {/* Polaroid caption - handwritten style font */}
        {memory.Caption && (
          <p className="polaroid-caption">
            {memory.Caption}
          </p>
        )}

        {/* Footer info (owner, date, category) in simple handwriting/classic style */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-stone-100 dark:border-stone-800/50">
          <div className="flex items-center gap-2">
            <img src={memory.User?.AvatarUrl} alt={memory.User?.Username} className="w-6 h-6 rounded-full border border-stone-200 dark:border-stone-800 shadow-sm" />
            <div>
              <span className="text-[10px] font-bold text-stone-700 dark:text-stone-300 block leading-tight">{memory.User?.Username}</span>
              <span className="text-[8px] text-stone-400 block leading-none">{getRelativeTime(memory.CreatedAt)}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {memory.Category && categories[memory.Category] && (
              <span className="px-2 py-0.5 rounded-md text-[8px] font-bold text-coral-600 bg-coral-50 dark:bg-coral-500/10">
                {categories[memory.Category]}
              </span>
            )}
            {/* Menu button */}
            <div className="relative">
              <button onClick={() => onToggleMenu(memory.MemoryId)} className="p-1 rounded-md hover:bg-stone-50 dark:hover:bg-stone-850 text-stone-400 hover:text-stone-600 transition-colors cursor-pointer">
                <DotsThreeVertical size={16} weight="bold" />
              </button>
              {menuOpenId === memory.MemoryId && (
                <PostMenu memoryId={memory.MemoryId} isOwner={isOwner} onClose={() => onToggleMenu(null)} onShare={onShare} onEdit={onEdit} onDelete={onDelete} />
              )}
            </div>
          </div>
        </div>

        {/* Reactions & Actions in clean, subtle layout */}
        <div className="flex items-center justify-between mt-3 pt-2 border-t border-stone-50 dark:border-stone-900/30">
          <div className="flex flex-wrap gap-1">
            {["❤️", "😂", "😮", "😢", "👍", "😡"].map(emoji => {
              const count = getCount?.(memory.Reactions, emoji) || 0;
              const active = getReaction?.(memory.Reactions, emoji) || false;
              return (
                <button key={emoji} onClick={() => onDoubleTapReact?.(memory.MemoryId, emoji)} className={`px-1.5 py-0.5 rounded text-[10px] transition-all cursor-pointer ${active ? 'bg-coral-50 dark:bg-coral-500/10 border border-coral-200 dark:border-coral-500/20' : 'bg-transparent text-stone-500 hover:bg-stone-50 dark:hover:bg-stone-800'}`}>
                  {emoji} {count > 0 && <span className="font-bold ml-0.5">{count}</span>}
                </button>
              );
            })}
          </div>
          <button onClick={() => onCommentClick(memory.MemoryId)} className="flex items-center gap-1 text-[10px] font-bold text-stone-500 hover:text-coral-500 transition-colors cursor-pointer">
            <ChatCircle size={13} />
            <span>Bình luận</span>
          </button>
        </div>
      </div>
    );
  }

  // Card hiện đại cho bài đăng nhiều chữ / không có hình ảnh
  return (
    <div className="bg-white/80 dark:bg-[#1C1C1E]/60 backdrop-blur-md border border-white/20 dark:border-stone-800/80 rounded-3xl p-5 shadow-lg shadow-stone-200/10 dark:shadow-none mb-6 transition-all duration-300 hover:shadow-xl">
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
        <div className="flex flex-wrap gap-1.5">
          {["❤️", "😂", "😮", "😢", "👍", "😡"].map(emoji => {
            const count = getCount?.(memory.Reactions, emoji) || 0;
            const active = getReaction?.(memory.Reactions, emoji) || false;
            return (
              <button key={emoji} onClick={() => onDoubleTapReact?.(memory.MemoryId, emoji)} className={`px-2.5 py-1 rounded-full text-[10px] transition-all cursor-pointer ${active ? 'bg-coral-500 text-white font-semibold' : 'bg-stone-50 dark:bg-[#2C2C2E]/50 hover:bg-stone-100 dark:hover:bg-[#2C2C2E] text-stone-600 dark:text-stone-400'}`}>
                {emoji} {count > 0 && <span className="ml-0.5">{count}</span>}
              </button>
            );
          })}
        </div>

        <button onClick={() => onCommentClick(memory.MemoryId)} className="flex items-center gap-1.5 text-xs font-semibold text-stone-500 hover:text-coral-500 px-3.5 py-1.5 rounded-full bg-stone-50 dark:bg-[#2C2C2E]/50 hover:bg-stone-100 dark:hover:bg-[#2C2C2E] transition-all cursor-pointer">
          <ChatCircle size={15} />
          <span>Bình luận</span>
        </button>
      </div>
    </div>
  );
}

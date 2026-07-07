import { useState } from "react";
import { DotsThreeVertical, PencilSimple, Trash } from "@phosphor-icons/react";

export default function CommentItem({ comment, user, onEdit, onDelete, onPinToggle, onReact, onReply, getRelativeTime, isReply }) {
  const [openMenu, setOpenMenu] = useState(false);
  const [openEmoji, setOpenEmoji] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(comment.Text);

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editText.trim()) return;
    await onEdit(comment, editText);
    setEditing(false);
  };

  return (
    <div className={`flex gap-2 items-start text-[11px] ${isReply ? 'mt-1 pl-1 bg-stone-50/20 dark:bg-[#1C1C1E]/20' : 'bg-stone-50/50 dark:bg-[#1C1C1E]'} p-2 rounded-xl`}>
      <img
        src={comment.User?.AvatarUrl}
        alt={comment.User?.Username}
        className={`${isReply ? 'w-5 h-5' : 'w-6 h-6'} rounded-full shrink-0`}
      />
      <div className="flex-1 min-w-0">
        {editing ? (
          <form onSubmit={handleSaveEdit} className="flex gap-1.5">
            <input type="text" value={editText} onChange={(e) => setEditText(e.target.value)}
              className="flex-1 px-2 py-1 rounded-lg border border-coral-200 text-xs focus:outline-none focus:ring-2 focus:ring-coral-500/20" autoFocus />
            <button type="submit" className="p-1 text-coral-500 hover:text-coral-600 text-xs font-bold cursor-pointer">Lưu</button>
            <button type="button" onClick={() => setEditing(false)} className="p-1 text-stone-400 hover:text-stone-600 text-xs cursor-pointer">Hủy</button>
          </form>
        ) : (
          <>
            <div className="flex justify-between items-center mb-0.5 gap-1">
              <span className={`font-bold text-stone-800 dark:text-stone-300 truncate ${isReply ? 'text-[10px]' : ''}`}>{comment.User?.Username}</span>
              <div className="flex items-center gap-1 shrink-0">
                <span className="text-[8px] text-stone-400">{getRelativeTime(comment.CreatedAt)}</span>
                <div className="relative">
                  <button onClick={() => setOpenMenu(!openMenu)} className="p-1 text-stone-400 hover:text-stone-600 rounded-full hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer">
                    <DotsThreeVertical size={14} />
                  </button>
                  {openMenu && (
                    <div className="absolute right-0 top-6 z-20 bg-white dark:bg-[#1C1C1E] border border-custom rounded-xl shadow-xl py-1 w-36 text-[11px]">
                      {comment.User?.UserId === user.UserId && (
                        <>
                          <button onClick={() => { setOpenMenu(false); setEditing(true); setEditText(comment.Text); }} className="w-full text-left px-3 py-1.5 hover:bg-stone-50 dark:hover:bg-stone-800 text-app cursor-pointer flex items-center gap-2">
                            <PencilSimple size={12} /> Sửa
                          </button>
                          <button onClick={() => { setOpenMenu(false); onDelete(comment.CommentId); }} className="w-full text-left px-3 py-1.5 hover:bg-stone-50 dark:hover:bg-stone-800 text-rose-500 cursor-pointer flex items-center gap-2">
                            <Trash size={12} /> Xóa
                          </button>
                        </>
                      )}
                      <button onClick={() => { setOpenMenu(false); onPinToggle(comment.CommentId, !comment.IsPinned); }} className="w-full text-left px-3 py-1.5 hover:bg-stone-50 dark:hover:bg-stone-800 text-app cursor-pointer flex items-center gap-2">
                        📌 {comment.IsPinned ? "Bỏ ghim" : "Ghim"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
            {comment.Text && <p className="text-stone-600 dark:text-stone-400 leading-relaxed">{comment.Text}</p>}
            {/* Reactions */}
            {comment.Reactions?.length > 0 && (
              <div className="flex gap-1 mt-1 flex-wrap">
                {[...new Set(comment.Reactions.map(r => r.EmojiType))].map(emoji => (
                  <span key={emoji} className="text-[10px] bg-stone-100 dark:bg-[#2C2C2E] px-1.5 py-0.5 rounded-full">
                    {emoji} {comment.Reactions.filter(r => r.EmojiType === emoji).length}
                  </span>
                ))}
              </div>
            )}
            {/* Action buttons */}
            <div className="flex items-center gap-2 mt-1">
              <div className="relative">
                <button onClick={() => setOpenEmoji(!openEmoji)} className="text-[10px] text-stone-400 hover:text-coral-500 cursor-pointer p-0.5">😊</button>
                {openEmoji && (
                  <div className="absolute left-0 top-5 z-20 bg-white dark:bg-[#1C1C1E] border border-custom rounded-full shadow-xl px-2 py-1 flex gap-1 text-lg whitespace-nowrap">
                    {["❤️", "😂", "😮", "😢", "👍", "😡"].map(emoji => (
                      <button key={emoji} onClick={() => { setOpenEmoji(false); onReact(comment.CommentId, emoji); }} className="hover:scale-125 transition-transform cursor-pointer">{emoji}</button>
                    ))}
                  </div>
                )}
              </div>
              <button onClick={() => onReply(comment)} className="text-[9px] font-semibold text-coral-500 hover:text-coral-600 cursor-pointer">Phản hồi</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

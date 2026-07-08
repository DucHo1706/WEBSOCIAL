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
    <div className={`flex gap-3 items-start text-sm ${isReply ? 'mt-2 pl-2 bg-stone-50/20 dark:bg-[#1C1C1E]/20' : 'bg-stone-50/50 dark:bg-[#1C1C1E]'} p-3.5 rounded-xl`}>
      <img
        src={comment.User?.AvatarUrl}
        alt={comment.User?.Username}
        className={`${isReply ? 'w-6 h-6' : 'w-8 h-8'} rounded-full shrink-0`}
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
              <span className={`font-bold text-stone-800 dark:text-stone-300 truncate ${isReply ? 'text-xs' : 'text-sm'}`}>{comment.User?.Username}</span>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-[10px] text-stone-400">{getRelativeTime(comment.CreatedAt)}</span>
                <div className="relative">
                  <button onClick={() => setOpenMenu(!openMenu)} className="p-1.5 text-stone-400 hover:text-stone-600 rounded-full hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer">
                    <DotsThreeVertical size={18} />
                  </button>
                  {openMenu && (
                    <div className="absolute right-0 top-7 z-20 bg-white dark:bg-[#1C1C1E] border border-custom rounded-xl shadow-xl py-1 w-40 text-xs">
                      {comment.User?.UserId === user.UserId && (
                        <>
                          <button onClick={() => { setOpenMenu(false); setEditing(true); setEditText(comment.Text); }} className="w-full text-left px-3 py-2 hover:bg-stone-50 dark:hover:bg-stone-800 text-app cursor-pointer flex items-center gap-2">
                            <PencilSimple size={14} /> Sửa
                          </button>
                          <button onClick={() => { setOpenMenu(false); onDelete(comment.CommentId); }} className="w-full text-left px-3 py-2 hover:bg-stone-50 dark:hover:bg-stone-800 text-rose-500 cursor-pointer flex items-center gap-2">
                            <Trash size={14} /> Xóa
                          </button>
                        </>
                      )}
                      <button onClick={() => { setOpenMenu(false); onPinToggle(comment.CommentId, !comment.IsPinned); }} className="w-full text-left px-3 py-2 hover:bg-stone-50 dark:hover:bg-stone-800 text-app cursor-pointer flex items-center gap-2 text-xs">
                        📌 {comment.IsPinned ? "Bỏ ghim" : "Ghim"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
            {comment.Text && <p className="text-stone-600 dark:text-stone-400 leading-relaxed text-sm">{comment.Text}</p>}
            {/* Reactions */}
            {comment.Reactions?.length > 0 && (
              <div className="flex gap-1.5 mt-1.5 flex-wrap">
                {[...new Set(comment.Reactions.map(r => r.EmojiType))].map(emoji => (
                  <span key={emoji} className="text-sm bg-stone-100 dark:bg-[#2C2C2E] px-2 py-1 rounded-full">
                    {emoji} {comment.Reactions.filter(r => r.EmojiType === emoji).length}
                  </span>
                ))}
              </div>
            )}
            {/* Action buttons */}
            <div className="flex items-center gap-3 mt-1.5">
              <div className="relative">
                <button onClick={() => setOpenEmoji(!openEmoji)} className="text-sm text-stone-400 hover:text-coral-500 cursor-pointer p-1">😊</button>
                {openEmoji && (
                  <div className="absolute left-0 top-6 z-20 bg-white dark:bg-[#1C1C1E] border border-custom rounded-full shadow-xl px-3 py-1.5 flex gap-1.5 text-2xl whitespace-nowrap">
                    {["❤️", "😂", "😮", "😢", "👍", "😡"].map(emoji => (
                      <button key={emoji} onClick={() => { setOpenEmoji(false); onReact(comment.CommentId, emoji); }} className="hover:scale-125 transition-transform cursor-pointer">{emoji}</button>
                    ))}
                  </div>
                )}
              </div>
              <button onClick={() => onReply(comment)} className="text-xs font-semibold text-coral-500 hover:text-coral-600 cursor-pointer px-3 py-1.5 rounded-lg bg-coral-50 hover:bg-coral-100">Phản hồi</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

import { useState } from "react";
import { X, PaperPlaneRight } from "@phosphor-icons/react";
import CommentItem from "./CommentItem";

export default function CommentModal({ memory, comments, user, onClose, onAddComment, onEditComment, onDeleteComment, onPinToggle, onReact, onReply, replyToComment, cancelReply, loading, getRelativeTime }) {
  const [newText, setNewText] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!newText.trim()) return;
    onAddComment(newText);
    setNewText("");
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card-custom rounded-3xl p-4 w-full max-w-sm shadow-2xl border border-custom max-h-[70vh] h-[70vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-custom">
          <h4 className="text-base font-bold text-app">💬 Bình luận</h4>
          <button onClick={onClose} className="p-1.5 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-full cursor-pointer text-secondary-custom">
            <X size={20} />
          </button>
        </div>

        {/* Comments list */}
        <div className="overflow-y-auto space-y-3 pr-1 flex-1">
          {comments.length === 0 ? (
            <p className="text-center text-xs text-stone-400 py-6">Chưa có bình luận nào.</p>
          ) : (
            comments.map((comment) => (
              <div key={comment.CommentId}>
                <CommentItem
                  comment={comment}
                  user={user}
                  onEdit={onEditComment}
                  onDelete={(id) => onDeleteComment(id)}
                  onPinToggle={onPinToggle}
                  onReact={onReact}
                  onReply={onReply}
                  getRelativeTime={getRelativeTime}
                  isReply={false}
                />
                {/* Nested replies */}
                {comment.Replies?.length > 0 && (
                  <div className="relative pl-4 ml-3.5 border-l border-stone-200 dark:border-stone-800 space-y-1.5 mt-1">
                    {comment.Replies.map(reply => (
                      <div key={reply.CommentId} className="relative">
                        {/* Hook/elbow line connector */}
                        <div className="absolute left-[-16px] top-4 w-3.5 h-[1px] bg-stone-250 dark:bg-stone-850"></div>
                        <CommentItem
                          comment={reply}
                          user={user}
                          onEdit={onEditComment}
                          onDelete={(id) => onDeleteComment(id)}
                          onPinToggle={onPinToggle}
                          onReact={onReact}
                          onReply={onReply}
                          getRelativeTime={getRelativeTime}
                          isReply={true}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Reply context bar */}
        {replyToComment && (
          <div className="flex items-center gap-2 text-xs text-coral-500 bg-coral-50 dark:bg-coral-500/10 px-4 py-2.5 rounded-lg flex-wrap mt-2">
            <span className="font-bold shrink-0">↩ Đang phản hồi:</span>
            <span className="text-stone-500 dark:text-stone-400 truncate flex-1">{replyToComment.User?.Username}: {replyToComment.Text}</span>
            <button type="button" onClick={cancelReply} className="text-stone-400 hover:text-stone-600 cursor-pointer shrink-0">
              <X size={14} />
            </button>
          </div>
        )}

        {/* Input form */}
        <form onSubmit={handleSubmit} className="flex gap-2 mt-3 pt-2 border-t border-custom">
          <input
            type="text"
            placeholder="Viết phản hồi của bạn..."
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            className="flex-1 px-4 py-3 rounded-xl border border-custom focus:outline-none focus:ring-2 focus:ring-coral-500/20 focus:border-coral-500 text-sm input-bg text-app"
          />
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-3 bg-coral-500 hover:bg-coral-600 text-white rounded-xl flex items-center justify-center active:scale-95 transition-all cursor-pointer shadow-md shadow-coral-500/10"
          >
            <PaperPlaneRight size={18} weight="fill" />
          </button>
        </form>
      </div>
    </div>
  );
}

import { PencilSimple, Trash, PaperPlaneRight } from "@phosphor-icons/react";

export default function PostMenu({ memoryId, isOwner, onClose, onShare, onEdit, onDelete }) {
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="absolute right-0 top-full mt-1 bg-card-custom border border-custom rounded-2xl shadow-xl z-50 py-2 min-w-[150px]">
        <button
          onClick={() => { onClose(); onShare(memoryId); }}
          className="w-full px-4 py-2.5 text-xs font-semibold text-app hover:bg-hover-custom flex items-center gap-2 cursor-pointer transition-colors"
        >
          <PaperPlaneRight size={14} /> Chia sẻ bài viết
        </button>
        {isOwner && (
          <>
            <button
              onClick={() => { onClose(); onEdit(memoryId); }}
              className="w-full px-4 py-2.5 text-xs font-semibold text-app hover:bg-hover-custom flex items-center gap-2 cursor-pointer transition-colors"
            >
              <PencilSimple size={14} /> Sửa bài viết
            </button>
            <button
              onClick={() => { onClose(); onDelete(memoryId); }}
              className="w-full px-4 py-2.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 flex items-center gap-2 cursor-pointer transition-colors"
            >
              <Trash size={14} /> Xóa bài viết
            </button>
          </>
        )}
      </div>
    </>
  );
}

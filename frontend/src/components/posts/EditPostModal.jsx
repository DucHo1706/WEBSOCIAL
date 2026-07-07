import { useState, useEffect, useRef } from "react";
import { X } from "@phosphor-icons/react";
import { getApiUrl } from "../../api";

export default function EditPostModal({ memory, user, editText, onTextChange, onImageChange, onUpdate, onCancel, loading }) {
  const fileRef = useRef(null);
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    if (memory?.Images?.[0] || memory?.ImageUrl) {
      setPreview(getApiUrl(memory.Images?.[0] || memory.ImageUrl));
    }
  }, [memory]);

  const handleImage = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      onImageChange(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onCancel}>
      <div className="bg-card-custom rounded-3xl p-5 w-full max-w-sm shadow-2xl border border-custom" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-bold text-app">✏️ Sửa bài viết</h4>
          <button type="button" onClick={onCancel} className="p-1 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-full cursor-pointer text-secondary-custom">
            <X size={16} />
          </button>
        </div>

        <div className="flex items-center gap-3 mb-3">
          <img src={user?.AvatarUrl} alt="" className="w-8 h-8 rounded-full" />
          <span className="text-xs font-bold text-app">{user?.Username}</span>
        </div>

        <textarea
          value={editText}
          onChange={(e) => onTextChange(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 rounded-xl border border-custom focus:outline-none focus:ring-2 focus:ring-coral-500/20 text-xs input-bg text-app resize-none"
        />

        {preview && (
          <div className="mt-2">
            <img src={preview} className="w-full rounded-xl max-h-40 object-cover" alt="Preview" />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="mt-1 text-[10px] font-semibold text-coral-500 hover:text-coral-600 cursor-pointer"
            >
              Đổi ảnh
            </button>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleImage} className="hidden" />
          </div>
        )}

        <div className="flex gap-2 mt-4">
          <button type="button" onClick={onCancel} className="flex-1 py-2 bg-stone-100 dark:bg-[#2C2C2E] text-secondary-custom rounded-xl text-xs font-semibold cursor-pointer active:scale-95 transition-all">
            Hủy
          </button>
          <button onClick={onUpdate} disabled={loading} className="flex-1 py-2 bg-coral-500 hover:bg-coral-600 disabled:opacity-50 text-white rounded-xl text-xs font-semibold cursor-pointer active:scale-95 transition-all shadow-md shadow-coral-500/10">
            {loading ? "Đang lưu..." : "Lưu thay đổi"}
          </button>
        </div>
      </div>
    </div>
  );
}

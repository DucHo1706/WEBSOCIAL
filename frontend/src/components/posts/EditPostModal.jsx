import { useState, useEffect, useRef } from "react";
import { X, ImageIcon, Globe, Users, Lock } from "@phosphor-icons/react";
import { getApiUrl } from "../../api";
import { motion, AnimatePresence } from "framer-motion";

const categoriesList = ["Đời Thường", "Sinh Nhật", "Du Lịch", "Cột Mốc"];

const privacyOptions = [
  { id: "Public", text: "Công Khai", icon: Globe },
  { id: "Friends", text: "Bạn Bè", icon: Users },
  { id: "Private", text: "Chỉ Mình Tôi", icon: Lock }
];

export default function EditPostModal({ 
  memory, user, editText, onTextChange, onImageChange, 
  category, onCategoryChange, privacy, onPrivacyChange,
  onUpdate, onCancel, loading 
}) {
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
    <AnimatePresence>
      <div className="fixed inset-0 z-55 flex items-center justify-center p-4">
        {/* Backdrop overlay */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onCancel}
          className="absolute inset-0 bg-stone-900/60 backdrop-blur-xs" 
        />

        {/* Modal content */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-white/95 dark:bg-stone-900/90 backdrop-blur-xl border border-white/20 dark:border-stone-800/80 rounded-3xl p-5 w-full max-w-sm shadow-2xl relative z-10 space-y-4"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between">
            <h4 className="font-display text-sm font-bold text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
              ✏️ Sửa bài viết
            </h4>
            <button type="button" onClick={onCancel} className="p-1.5 hover:bg-stone-100 dark:hover:bg-stone-850 rounded-full cursor-pointer text-stone-400 hover:text-stone-600 transition-colors">
              <X size={15} />
            </button>
          </div>

          <div className="flex items-center gap-3">
            <img src={user?.AvatarUrl} alt="" className="w-8 h-8 rounded-full border border-coral-200/50 bg-stone-50 shadow-sm" />
            <span className="text-xs font-bold text-stone-800 dark:text-stone-150">{user?.Username}</span>
          </div>

          <textarea
            value={editText}
            onChange={(e) => onTextChange(e.target.value)}
            rows={3}
            className="w-full px-3 py-2.5 rounded-2xl border border-stone-200/60 dark:border-stone-800/60 focus:outline-none focus:ring-2 focus:ring-coral-500/25 focus:border-coral-500 text-xs bg-stone-50/50 dark:bg-stone-950/40 text-stone-800 dark:text-stone-200 resize-none shadow-inner transition-all"
            placeholder="Nhập nội dung kỷ niệm..."
          />

          {/* Image preview and change button */}
          <div className="space-y-2">
            <span className="block text-[9px] font-bold text-stone-400 uppercase tracking-wider">Hình ảnh</span>
            <div className="flex items-center gap-3">
              {preview ? (
                <div className="relative w-16 h-16 rounded-xl overflow-hidden border border-stone-200/40 dark:border-stone-800 shadow-md">
                  <img src={preview} alt="" className="w-full h-full object-cover" />
                  <button 
                    type="button" 
                    onClick={() => { onImageChange(null); setPreview(null); }} 
                    className="absolute top-0.5 right-0.5 w-4 h-4 bg-stone-900/90 text-white rounded-full flex items-center justify-center text-[8px] border border-white/20"
                  >
                    ✕
                  </button>
                </div>
              ) : null}
              <button 
                type="button" 
                onClick={() => fileRef.current?.click()} 
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-50 dark:bg-stone-950/40 border border-stone-200/50 dark:border-stone-800/80 text-stone-600 dark:text-stone-400 text-[10px] font-semibold cursor-pointer hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
              >
                <ImageIcon size={14} />
                <span>Đổi ảnh</span>
              </button>
              <input ref={fileRef} type="file" accept="image/*" onChange={handleImage} className="hidden" />
            </div>
          </div>

          {/* Categories */}
          <div className="space-y-2">
            <span className="block text-[9px] font-bold text-stone-400 uppercase tracking-wider">Chủ đề</span>
            <div className="flex flex-wrap gap-1.5">
              {categoriesList.map((cat) => (
                <button 
                  key={cat} 
                  type="button" 
                  onClick={() => onCategoryChange(cat)}
                  className={`px-2.5 py-1 rounded-full text-[9px] font-semibold cursor-pointer transition-all ${
                    category === cat 
                      ? "bg-coral-500 text-white shadow-sm shadow-coral-500/10" 
                      : "bg-stone-50 dark:bg-stone-950/40 border border-stone-200/30 dark:border-stone-800/50 text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Privacy */}
          <div className="space-y-2">
            <span className="block text-[9px] font-bold text-stone-400 uppercase tracking-wider">Quyền xem</span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {privacyOptions.map((item) => (
                <button 
                  key={item.id} 
                  type="button" 
                  onClick={() => onPrivacyChange(item.id)}
                  className={`px-2.5 py-1 rounded-full text-[9px] font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                    privacy === item.id 
                      ? "bg-coral-500 text-white shadow-sm shadow-coral-500/10" 
                      : "bg-stone-50 dark:bg-stone-950/40 border border-stone-200/30 dark:border-stone-800/50 text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800"
                  }`}
                >
                  <item.icon size={11} />
                  <span>{item.text}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Footer buttons */}
          <div className="flex gap-2 pt-2">
            <button 
              type="button" 
              onClick={onCancel} 
              className="flex-1 py-2 bg-stone-50 dark:bg-stone-950/40 border border-stone-200/50 dark:border-stone-800/80 text-stone-500 dark:text-stone-400 rounded-2xl text-xs font-semibold cursor-pointer active:scale-95 transition-all"
            >
              Hủy
            </button>
            <button 
              onClick={onUpdate} 
              disabled={loading} 
              className="flex-1 py-2 bg-coral-500 hover:bg-coral-600 disabled:opacity-50 text-white rounded-2xl text-xs font-semibold cursor-pointer active:scale-95 transition-all shadow-md shadow-coral-500/15"
            >
              {loading ? "Đang lưu..." : "Lưu thay đổi"}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

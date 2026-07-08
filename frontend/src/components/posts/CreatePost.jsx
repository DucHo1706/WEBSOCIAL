import { useState } from "react";
import { Check, X, Globe, Users, Lock, Tag, Image } from "@phosphor-icons/react";
import { motion, AnimatePresence } from "framer-motion";

const categories = [
  { id: "Tất Cả Kỷ Niệm", label: "📸 Tất Cả" },
  { id: "Du Lịch", label: "✈️ Du Lịch" },
  { id: "Ẩm Thực", label: "🍜 Ẩm Thực" },
  { id: "Kỷ Niệm", label: "💝 Kỷ Niệm" },
  { id: "Bạn Bè", label: "👥 Bạn Bè" },
  { id: "Đời Thường", label: "🏡 Đời Thường" },
];

const privacyOptions = [
  { id: "Public", label: "Công khai", icon: Globe },
  { id: "Friends", label: "Bạn bè", icon: Users },
  { id: "Private", label: "Chỉ mình tôi", icon: Lock },
];

export default function CreatePost({ user, onCancel, onSubmit, uploading }) {
  const [caption, setCaption] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Kỷ Niệm");
  const [privacy, setPrivacy] = useState("Friends");
  const [selectedImage, setSelectedImage] = useState(null);
  const [preview, setPreview] = useState(null);

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async () => {
    if (!caption.trim() && !selectedImage) return;
    await onSubmit(caption, selectedCategory, privacy, selectedImage);
    setCaption("");
    setSelectedImage(null);
    setPreview(null);
  };

  const activePrivacy = privacyOptions.find(p => p.id === privacy);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      className="w-full bg-white/90 dark:bg-stone-900/60 backdrop-blur-xl border border-white/20 dark:border-stone-800/80 rounded-3xl p-5 shadow-xl mb-6"
    >
      <div className="flex items-center gap-3 mb-4">
        <img src={user?.AvatarUrl} alt="" className="w-9 h-9 rounded-full border border-coral-200/50 bg-stone-50 shadow-sm" />
        <div className="flex-1">
          <span className="text-xs font-bold text-stone-800 dark:text-stone-150 block leading-tight">{user?.Username}</span>
          <span className="text-[9px] text-stone-400 flex items-center gap-1.5 mt-0.5">
            {activePrivacy && <activePrivacy.icon size={10} />}
            {activePrivacy?.label}
          </span>
        </div>
        <button onClick={onCancel} className="p-2 hover:bg-stone-50 dark:hover:bg-stone-850 rounded-full cursor-pointer text-stone-400 hover:text-stone-600 transition-colors">
          <X size={15} />
        </button>
      </div>

      <textarea
        placeholder="Hôm nay bạn có kỷ niệm nào thú vị?"
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        rows={3}
        className="w-full px-4 py-3 rounded-2xl border border-stone-200/60 dark:border-stone-800/60 focus:outline-none focus:ring-2 focus:ring-coral-500/25 focus:border-coral-500 text-stone-800 dark:text-stone-200 bg-stone-50/50 dark:bg-stone-950/40 text-xs transition-all resize-none shadow-inner placeholder-stone-400 dark:placeholder-stone-500"
      />

      <AnimatePresence>
        {preview && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative mt-3 inline-block"
          >
            <img src={preview} className="h-28 rounded-2xl object-cover shadow-md border border-stone-200/20" alt="Preview" />
            <button 
              onClick={() => { setSelectedImage(null); setPreview(null); }} 
              className="absolute -top-2 -right-2 w-6 h-6 bg-stone-900/90 text-white rounded-full flex items-center justify-center text-xs border border-white/20 shadow-md cursor-pointer hover:bg-stone-950 transition-colors"
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center gap-2 mt-4">
        <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-stone-50 dark:bg-stone-950/40 border border-stone-200/50 dark:border-stone-800/80 text-stone-600 dark:text-stone-400 hover:text-coral-500 hover:border-coral-500/35 text-[10px] font-bold cursor-pointer transition-all">
          <Image size={13} />
          <span>Thêm ảnh kỷ niệm</span>
          <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
        </label>
      </div>

      <div className="mt-4">
        <span className="block text-[9px] font-bold text-stone-400 uppercase tracking-wider mb-2">Chủ đề bài đăng</span>
        <div className="flex flex-wrap gap-1.5">
          {categories.filter(c => c.id !== "Tất Cả Kỷ Niệm").map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1 rounded-full text-[10px] font-semibold transition-all cursor-pointer ${
                selectedCategory === cat.id 
                  ? "bg-coral-500 text-white shadow-sm shadow-coral-500/20" 
                  : "bg-stone-50 dark:bg-stone-950/40 border border-stone-200/30 dark:border-stone-800/50 text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4">
        <span className="block text-[9px] font-bold text-stone-400 uppercase tracking-wider mb-2">Ai có thể xem?</span>
        <div className="flex items-center gap-1.5 flex-wrap">
          {privacyOptions.map(item => (
            <button
              key={item.id}
              onClick={() => setPrivacy(item.id)}
              className={`px-3 py-1 rounded-full text-[10px] font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                privacy === item.id 
                  ? "bg-coral-500 text-white shadow-sm shadow-coral-500/20" 
                  : "bg-stone-50 dark:bg-stone-950/40 border border-stone-200/30 dark:border-stone-800/50 text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800"
              }`}
            >
              <item.icon size={11} />
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      <motion.button
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
        onClick={handleSubmit}
        disabled={uploading}
        className="w-full mt-5 py-2.5 bg-coral-500 hover:bg-coral-600 disabled:opacity-50 text-white rounded-2xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-md shadow-coral-500/20"
      >
        {uploading ? (
          "Đang tải ảnh và đăng bài..."
        ) : (
          <>
            <Check size={14} weight="bold" />
            <span>Chia Sẻ Kỷ Niệm</span>
          </>
        )}
      </motion.button>
    </motion.div>
  );
}

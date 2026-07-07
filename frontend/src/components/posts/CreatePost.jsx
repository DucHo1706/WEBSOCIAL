import { useState } from "react";
import { Check, X, Globe, Users, Lock, Tag } from "@phosphor-icons/react";

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

export default function CreatePost({ user, onCancel, onSubmit, onSubmitStory, uploading, uploadingStory }) {
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

  return (
    <div className="w-full bg-card-custom rounded-3xl border border-coral-100/60 p-4 shadow-md shadow-coral-100/5 mb-4">
      <div className="flex items-center gap-3 mb-3">
        <img src={user?.AvatarUrl} alt="" className="w-9 h-9 rounded-full border border-coral-250 bg-stone-50" />
        <div className="flex-1">
          <span className="text-xs font-bold text-app block">{user?.Username}</span>
          <span className="text-[9px] text-secondary-custom flex items-center gap-1">
            {privacy === "Public" ? <Globe size={10} /> : privacy === "Friends" ? <Users size={10} /> : <Lock size={10} />}
            {privacyOptions.find(p => p.id === privacy)?.label}
          </span>
        </div>
        <button onClick={onCancel} className="p-1.5 hover:bg-hover-custom rounded-full cursor-pointer text-secondary-custom">
          <X size={16} />
        </button>
      </div>

      <textarea
        placeholder="Hôm nay của bạn thế nào?"
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        rows={2}
        className="w-full px-4 py-3 rounded-xl border border-custom focus:outline-none focus:ring-2 focus:ring-coral-500/20 focus:border-coral-500 text-app input-bg text-xs resize-none"
      />

      {preview && (
        <div className="relative mt-2 inline-block">
          <img src={preview} className="h-20 rounded-xl object-cover" alt="Preview" />
          <button onClick={() => { setSelectedImage(null); setPreview(null); }} className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-stone-900 text-white rounded-full flex items-center justify-center text-[10px] border border-white cursor-pointer">
            ✕
          </button>
        </div>
      )}

      <div className="flex items-center gap-1.5 mt-3">
        <label className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-stone-100 dark:bg-[#2C2C2E] text-secondary-custom hover:text-coral-500 text-[10px] font-bold cursor-pointer transition-colors">
          <Tag size={12} /> Ảnh
          <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
        </label>
      </div>

      <div className="flex flex-wrap gap-1.5 mt-2">
        <Tag size={14} className="text-stone-400" />
        {categories.filter(c => c.id !== "Tất Cả Kỷ Niệm").map(cat => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition-colors cursor-pointer ${
              selectedCategory === cat.id ? "bg-coral-500 text-white" : "bg-stone-100 dark:bg-[#2C2C2E] text-secondary-custom hover:bg-stone-200 dark:hover:bg-stone-700"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
        {privacyOptions.map(item => (
          <button
            key={item.id}
            onClick={() => setPrivacy(item.id)}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
              privacy === item.id ? "bg-coral-500 text-white" : "bg-stone-100 dark:bg-[#2C2C2E] text-secondary-custom hover:bg-stone-200 dark:hover:bg-stone-700"
            }`}
          >
            <item.icon size={12} /> {item.label}
          </button>
        ))}
      </div>

      <button
        onClick={handleSubmit}
        disabled={uploading}
        className="w-full mt-3 py-2 bg-coral-500 hover:bg-coral-600 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer active:scale-98 transition-all shadow-md shadow-coral-500/10"
      >
        {uploading ? "Đang đăng..." : <><Check size={14} /> Chia Sẻ Kỷ Niệm</>}
      </button>
    </div>
  );
}

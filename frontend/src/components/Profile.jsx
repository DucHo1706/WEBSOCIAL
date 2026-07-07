import React, { useState, useEffect } from "react";
import { apiRequest, getApiUrl } from "../api";
import {
  UserCircle, PencilSimple, Check, X, SignOut,
  Smiley, Clock, Camera, ChatCircle, Heart, UserPlus, Users,
  PaperPlaneRight, LockSimple, Eye, EyeSlash, Star, Image, Info
} from "@phosphor-icons/react";

const ACHIEVEMENTS = [
  { id: "newbie",        icon: "🌟", label: "Thành Viên",     desc: "Chào mừng bạn tham gia!",     condition: () => true },
  { id: "photographer", icon: "📸", label: "Nhiếp Ảnh Gia",  desc: "Đã đăng 5+ bài viết",          condition: (s) => s.posts >= 5 },
  { id: "social",       icon: "❤️", label: "Được Yêu Quý",   desc: "Nhận 10+ lượt thả tim",        condition: (s) => s.reactions >= 10 },
  { id: "connector",    icon: "👥", label: "Kết Nối Rộng",   desc: "Có 3+ người bạn",              condition: (s) => s.friends >= 3 },
  { id: "storyteller",  icon: "💬", label: "Kể Chuyện Hay",  desc: "Viết 10+ bình luận",           condition: (s) => s.comments >= 10 },
  { id: "prolific",     icon: "🏆", label: "Năng Suất",      desc: "Đã đăng 20+ bài viết",         condition: (s) => s.posts >= 20 },
  { id: "famous",       icon: "🔥", label: "Nổi Tiếng",      desc: "Nhận 50+ lượt thả tim",        condition: (s) => s.reactions >= 50 },
];

const Skeleton = ({ className }) => (
  <div className={`animate-pulse bg-stone-200 dark:bg-[#3A3A3C] rounded-lg ${className}`} />
);

const PhotoItem = ({ memory, onClick }) => {
  const imgSrc = memory.ImagesJson
    ? (() => { try { return JSON.parse(memory.ImagesJson)[0] || getApiUrl(memory.ImageUrl); } catch { return getApiUrl(memory.ImageUrl); } })()
    : getApiUrl(memory.ImageUrl);
  return (
    <div className="aspect-square rounded-xl overflow-hidden cursor-pointer relative group bg-stone-100 dark:bg-[#2C2C2E]" onClick={() => onClick(memory)}>
      <img src={imgSrc} alt={memory.Caption || ""} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" onError={(e) => { e.target.style.display = "none"; }} />
      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center gap-1">
        <Heart size={18} className="text-white" weight="fill" />
        <span className="text-white text-[10px] font-bold">{(memory.Reactions || []).length}</span>
      </div>
    </div>
  );
};

export default function Profile({ user, memories, onProfileUpdated, onLogout }) {
  const [activeTab, setActiveTab] = useState("posts");
  const [isEditing, setIsEditing] = useState(false);
  const [newUsername, setNewUsername] = useState(user.Username);
  const [newAvatar, setNewAvatar] = useState(user.AvatarUrl || "");
  const [newCover, setNewCover] = useState(user.CoverImageUrl || "");
  const [newBio, setNewBio] = useState(user.Bio || "");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showChangePwd, setShowChangePwd] = useState(false);
  const [oldPwd, setOldPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdError, setPwdError] = useState("");
  const [pwdSuccess, setPwdSuccess] = useState(false);
  const [friends, setFriends] = useState([]);
  const [statsLoading, setStatsLoading] = useState(true);
  const [showLogs, setShowLogs] = useState(false);
  const [logs, setLogs] = useState([]);
  const [lightboxMemory, setLightboxMemory] = useState(null);
  const [toast, setToast] = useState({ text: "", visible: false, type: "success" });

  const myMemories = memories.filter((m) => m.UserId === user.UserId);
  const totalReactions = myMemories.reduce((sum, m) => sum + (m.Reactions || []).length, 0);
  const totalComments = myMemories.reduce((sum, m) => sum + (m.Comments || []).length, 0);
  const stats = { posts: myMemories.length, friends: friends.length, reactions: totalReactions, comments: totalComments };
  const earnedAchievements = ACHIEVEMENTS.filter((a) => a.condition(stats));

  const showToast = (text, type = "success") => {
    setToast({ text, visible: true, type });
    setTimeout(() => setToast((p) => ({ ...p, visible: false })), 3500);
  };

  const joinedDate = user.CreatedAt
    ? new Date(user.CreatedAt).toLocaleDateString("vi-VN", { month: "long", year: "numeric" })
    : "Chưa rõ";

  const getCategoryEmoji = (cat) => {
    if (cat === "Birthday") return "🎂";
    if (cat === "Travel") return "✈️";
    if (cat === "Milestone") return "🏆";
    return "🏡";
  };

  useEffect(() => {
    const fetchFriends = async () => {
      setStatsLoading(true);
      try {
        const data = await apiRequest(`/api/friendship/friends/${user.UserId}`);
        setFriends(data || []);
      } catch (err) {
        console.error("Lỗi tải bạn bè:", err);
      } finally {
        setStatsLoading(false);
      }
    };
    fetchFriends();
  }, [user.UserId]);

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const data = await apiRequest("/api/auth/upload-image", "POST", formData, true);
      setNewAvatar(data.url);
    } catch (err) { showToast("Tải ảnh đại diện thất bại: " + err.message, "error"); } finally { setUploadingAvatar(false); }
  };

  const handleCoverUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingCover(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const data = await apiRequest("/api/auth/upload-image", "POST", formData, true);
      setNewCover(data.url);
    } catch (err) { showToast("Tải ảnh bìa thất bại: " + err.message, "error"); } finally { setUploadingCover(false); }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!newUsername.trim()) return;
    setLoading(true);
    try {
      const updatedUser = await apiRequest("/api/auth/update", "POST", {
        userId: user.UserId, username: newUsername.trim(),
        avatarUrl: newAvatar.trim(), coverImageUrl: newCover.trim(), bio: newBio.trim(),
      });
      onProfileUpdated(updatedUser);
      setIsEditing(false);
      showToast("Cập nhật trang cá nhân thành công! ✨");
    } catch (err) { showToast("Cập nhật thất bại: " + err.message, "error"); } finally { setLoading(false); }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwdError("");
    if (newPwd !== confirmPwd) { setPwdError("Mật khẩu xác nhận không khớp."); return; }
    if (newPwd.length < 6) { setPwdError("Mật khẩu mới phải có ít nhất 6 ký tự."); return; }
    setPwdLoading(true);
    try {
      await apiRequest("/api/auth/change-password", "POST", { userId: user.UserId, oldPassword: oldPwd, newPassword: newPwd });
      setPwdSuccess(true);
      setOldPwd(""); setNewPwd(""); setConfirmPwd("");
      showToast("Đổi mật khẩu thành công! 🔒");
      setTimeout(() => { setShowChangePwd(false); setPwdSuccess(false); }, 2000);
    } catch (err) { setPwdError(err.message || "Đổi mật khẩu thất bại."); } finally { setPwdLoading(false); }
  };

  const fetchLogs = async () => {
    try {
      const data = await apiRequest(`/api/activitylog/${user.UserId}`);
      setLogs(data); setShowLogs(true);
    } catch (err) { console.error("Failed to load logs:", err); }
  };

  return (
    <div className="pb-24 min-h-[100dvh] bg-bg-custom relative">
      {/* Toast */}
      <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[99] px-5 py-3 rounded-2xl text-xs font-bold shadow-2xl transition-all duration-300 flex items-center gap-2 whitespace-nowrap ${toast.visible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4 pointer-events-none"} ${toast.type === "error" ? "bg-red-500 text-white" : "bg-emerald-500 text-white"}`}>
        {toast.type === "error" ? "❌" : "✅"} {toast.text}
      </div>

      {/* Cover Photo */}
      <div className="relative h-44 w-full bg-gradient-to-br from-coral-400 via-amber-300 to-rose-400 overflow-hidden">
        {(isEditing ? newCover : user.CoverImageUrl) && (
          <img src={isEditing ? newCover : user.CoverImageUrl} alt="Cover" className="w-full h-full object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        {isEditing && (
          <label htmlFor="cover-upload-hero" className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-sm text-white text-[10px] font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 cursor-pointer hover:bg-black/80 transition-all">
            <Camera size={13} />{uploadingCover ? "Đang tải..." : "Đổi ảnh bìa"}
            <input type="file" accept="image/*" id="cover-upload-hero" className="hidden" onChange={handleCoverUpload} />
          </label>
        )}
      </div>

      <div className="px-4 max-w-md mx-auto">
        {/* Avatar + Name */}
        <div className="flex items-end gap-4 -mt-14 mb-3">
          <div className="relative shrink-0">
            <img
              src={isEditing ? (newAvatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${newUsername}`) : (user.AvatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${user.Username}`)}
              alt={user.Username} className="w-24 h-24 rounded-full border-4 border-white dark:border-[#1C1C1E] shadow-xl object-cover bg-white dark:bg-[#2C2C2E]"
            />
            <div className="absolute bottom-1.5 right-1.5 w-4 h-4 bg-emerald-400 rounded-full border-2 border-white dark:border-[#1C1C1E]" />
            {isEditing && (
              <label htmlFor="avatar-upload-hero" className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full cursor-pointer opacity-0 hover:opacity-100 transition-all">
                <Camera size={22} className="text-white" />
                <input type="file" accept="image/*" id="avatar-upload-hero" className="hidden" onChange={handleAvatarUpload} />
              </label>
            )}
          </div>
          <div className="flex-1 pb-2">
            {!isEditing ? (
              <>
                <h2 className="font-display text-xl font-bold text-stone-900 dark:text-white leading-tight">{user.Username}</h2>
                <p className="text-[10px] text-stone-500 dark:text-stone-400">{user.Email}</p>
              </>
            ) : (
              <div>
                <label className="text-[9px] font-bold uppercase text-stone-400 dark:text-stone-500 tracking-wider">Tên hiển thị</label>
                <input type="text" required value={newUsername} onChange={(e) => setNewUsername(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-xl border border-stone-200 dark:border-[#3A3A3C] focus:outline-none focus:ring-2 focus:ring-coral-500/30 text-sm font-bold bg-white dark:bg-[#2C2C2E] text-stone-900 dark:text-white" />
              </div>
            )}
          </div>
        </div>

        {/* Bio */}
        {!isEditing ? (
          <div className="mb-4 text-center">
            {user.Bio ? <p className="text-sm text-stone-600 dark:text-stone-300 leading-relaxed italic">"{user.Bio}"</p>
              : <p className="text-xs text-stone-400 dark:text-stone-600 italic">Chưa có tiểu sử...</p>}
          </div>
        ) : (
          <div className="mb-4">
            <label className="text-[9px] font-bold uppercase text-stone-400 dark:text-stone-500 tracking-wider">Tiểu sử</label>
            <textarea value={newBio} onChange={(e) => setNewBio(e.target.value)}
              placeholder="Viết vài dòng giới thiệu về bản thân..." rows={2} maxLength={120}
              className="w-full mt-1 px-3 py-2 rounded-xl border border-stone-200 dark:border-[#3A3A3C] focus:outline-none focus:ring-2 focus:ring-coral-500/30 text-xs bg-white dark:bg-[#2C2C2E] text-stone-900 dark:text-white resize-none" />
            <p className="text-right text-[9px] text-stone-400 mt-0.5">{newBio.length}/120</p>
          </div>
        )}

        {/* Stats Bar */}
        <div className="grid grid-cols-4 gap-1.5 mb-4">
          {[
            { label: "Bài viết", value: myMemories.length, icon: "📷" },
            { label: "Bạn bè",   value: statsLoading ? "…" : friends.length, icon: "👥" },
            { label: "Lượt ❤️",  value: totalReactions, icon: "💗" },
            { label: "Bình luận",value: totalComments,   icon: "💬" },
          ].map((s) => (
            <div key={s.label} className="bg-white dark:bg-[#2C2C2E] border border-stone-100 dark:border-[#3A3A3C] rounded-2xl p-2 text-center shadow-sm">
              <div className="text-base leading-none mb-0.5">{s.icon}</div>
              <div className="text-sm font-display font-extrabold text-coral-500">{s.value}</div>
              <div className="text-[8px] text-stone-400 dark:text-stone-500 font-semibold leading-tight mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        {!isEditing ? (
          <div className="flex gap-2 mb-5">
            <button onClick={() => setIsEditing(true)}
              className="flex-1 py-2.5 bg-stone-100 dark:bg-[#2C2C2E] hover:bg-stone-200 dark:hover:bg-[#3A3A3C] text-stone-700 dark:text-stone-200 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-95">
              <PencilSimple size={14} /> Chỉnh sửa
            </button>
            <button onClick={() => setShowChangePwd(true)} title="Đổi mật khẩu"
              className="py-2.5 px-3.5 bg-stone-100 dark:bg-[#2C2C2E] hover:bg-stone-200 dark:hover:bg-[#3A3A3C] text-stone-700 dark:text-stone-200 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 active:scale-95">
              <LockSimple size={14} />
            </button>
            <button onClick={fetchLogs} title="Nhật ký hoạt động"
              className="py-2.5 px-3.5 bg-stone-100 dark:bg-[#2C2C2E] hover:bg-stone-200 dark:hover:bg-[#3A3A3C] text-stone-700 dark:text-stone-200 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 active:scale-95">
              <Clock size={14} />
            </button>
          </div>
        ) : (
          <div className="flex gap-2 mb-5">
            <button type="button"
              onClick={() => { setIsEditing(false); setNewUsername(user.Username); setNewAvatar(user.AvatarUrl || ""); setNewCover(user.CoverImageUrl || ""); setNewBio(user.Bio || ""); }}
              className="flex-1 py-2.5 bg-stone-100 dark:bg-[#2C2C2E] text-stone-600 dark:text-stone-300 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-95">
              <X size={14} /> Hủy
            </button>
            <button onClick={handleUpdate} disabled={loading || uploadingAvatar || uploadingCover}
              className="flex-1 py-2.5 bg-coral-500 hover:bg-coral-600 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-coral-500/20 active:scale-95 disabled:opacity-60">
              <Check size={14} /> {loading ? "Đang lưu..." : "Lưu lại"}
            </button>
          </div>
        )}

        {/* Achievements */}
        <div className="mb-5">
          <h4 className="text-[10px] font-bold uppercase tracking-wider text-stone-400 dark:text-stone-600 mb-2 flex items-center gap-1.5">
            <Star size={11} className="text-amber-400" /> Huy Hiệu ({earnedAchievements.length}/{ACHIEVEMENTS.length})
          </h4>
          <div className="flex gap-2 flex-wrap">
            {ACHIEVEMENTS.map((a) => {
              const earned = a.condition(stats);
              return (
                <div key={a.id} title={a.desc}
                  className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-2xl text-center transition-all ${earned ? "bg-gradient-to-b from-amber-50 to-amber-100 dark:from-amber-900/30 dark:to-amber-800/20 border border-amber-200 dark:border-amber-700/50 shadow-sm" : "bg-stone-100 dark:bg-[#2C2C2E] border border-stone-200 dark:border-[#3A3A3C] opacity-35 grayscale"}`}>
                  <span className="text-lg leading-none">{a.icon}</span>
                  <span className={`text-[8px] font-bold leading-tight ${earned ? "text-amber-700 dark:text-amber-400" : "text-stone-400"}`}>{a.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex bg-stone-100 dark:bg-[#2C2C2E] rounded-2xl p-1 mb-4 gap-1">
          {[
            { id: "posts",   label: "Bài viết",   icon: <Image size={13} /> },
            { id: "about",   label: "Giới thiệu", icon: <Info size={13} /> },
            { id: "friends", label: "Bạn bè",     icon: <Users size={13} /> },
          ].map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${activeTab === tab.id ? "bg-white dark:bg-[#3A3A3C] text-coral-500 shadow-sm" : "text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"}`}>
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Tab: Posts */}
        {activeTab === "posts" && (
          myMemories.length === 0 ? (
            <div className="text-center py-14 bg-white dark:bg-[#2C2C2E] border border-stone-100 dark:border-[#3A3A3C] rounded-3xl">
              <Smiley size={36} className="text-stone-300 dark:text-stone-600 mx-auto mb-2" />
              <p className="text-xs text-stone-400 dark:text-stone-500 leading-relaxed px-6">Bạn chưa đăng tải bài viết nào!</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-1.5">
              {myMemories.map((memory) => <PhotoItem key={memory.MemoryId} memory={memory} onClick={setLightboxMemory} />)}
            </div>
          )
        )}

        {/* Tab: About */}
        {activeTab === "about" && (
          <div className="space-y-3">
            <div className="bg-white dark:bg-[#2C2C2E] border border-stone-100 dark:border-[#3A3A3C] rounded-2xl p-4 space-y-3">
              <h4 className="text-xs font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider flex items-center gap-1.5">
                <UserCircle size={15} className="text-coral-500" /> Thông tin cá nhân
              </h4>
              {[
                { icon: "📧", label: user.Email },
                { icon: "📅", label: <span>Tham gia từ <strong>{joinedDate}</strong></span> },
                { icon: "✍️", label: user.Bio || <em className="text-stone-400">Chưa có tiểu sử</em> },
                { icon: "📷", label: <span>Đã đăng <strong>{myMemories.length}</strong> kỷ niệm</span> },
                { icon: "🏆", label: <span>Đạt được <strong>{earnedAchievements.length}</strong> / {ACHIEVEMENTS.length} huy hiệu</span> },
              ].map((row, i) => (
                <div key={i} className="flex items-start gap-3 text-xs text-stone-600 dark:text-stone-300">
                  <span className="w-6 text-center shrink-0 mt-0.5">{row.icon}</span>
                  <span className="font-medium leading-relaxed">{row.label}</span>
                </div>
              ))}
            </div>
            <div className="bg-white dark:bg-[#2C2C2E] border border-stone-100 dark:border-[#3A3A3C] rounded-2xl p-4">
              <h4 className="text-xs font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Star size={13} className="text-coral-500" /> Phân loại bài viết
              </h4>
              {[
                { cat: "Birthday", label: "🎂 Sinh Nhật" },
                { cat: "Travel",   label: "✈️ Du Lịch" },
                { cat: "Milestone",label: "🏆 Cột Mốc" },
                { cat: "Daily",    label: "🏡 Đời Thường" },
              ].map(({ cat, label }) => {
                const count = myMemories.filter((m) => cat === "Daily" ? !["Birthday","Travel","Milestone"].includes(m.Category) : m.Category === cat).length;
                const pct = myMemories.length > 0 ? Math.round((count / myMemories.length) * 100) : 0;
                return (
                  <div key={cat} className="mb-3 last:mb-0">
                    <div className="flex justify-between text-[10px] mb-1">
                      <span className="text-stone-600 dark:text-stone-400 font-medium">{label}</span>
                      <span className="text-stone-400 dark:text-stone-500">{count} bài ({pct}%)</span>
                    </div>
                    <div className="h-1.5 bg-stone-100 dark:bg-[#3A3A3C] rounded-full overflow-hidden">
                      <div className="h-full bg-coral-400 rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab: Friends */}
        {activeTab === "friends" && (
          statsLoading ? (
            <div className="grid grid-cols-3 gap-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="flex flex-col items-center gap-2 bg-white dark:bg-[#2C2C2E] rounded-2xl p-3">
                  <Skeleton className="w-14 h-14 rounded-full" />
                  <Skeleton className="w-16 h-2" />
                </div>
              ))}
            </div>
          ) : friends.length === 0 ? (
            <div className="text-center py-14 bg-white dark:bg-[#2C2C2E] border border-stone-100 dark:border-[#3A3A3C] rounded-3xl">
              <Users size={36} className="text-stone-300 dark:text-stone-600 mx-auto mb-2" />
              <p className="text-xs text-stone-400 dark:text-stone-500">Bạn chưa có người bạn nào.</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {friends.map((f, idx) => (
                <div key={f.UserId || f.FriendId || idx}
                  className="flex flex-col items-center gap-1.5 bg-white dark:bg-[#2C2C2E] border border-stone-100 dark:border-[#3A3A3C] rounded-2xl p-3 hover:shadow-md transition-all active:scale-95 cursor-pointer">
                  <img src={f.AvatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${f.Username || f.FriendUsername}`}
                    alt={f.Username || f.FriendUsername} className="w-14 h-14 rounded-full object-cover border-2 border-stone-100 dark:border-[#3A3A3C]" />
                  <span className="text-[10px] font-bold text-stone-700 dark:text-stone-300 text-center leading-tight truncate w-full">{f.Username || f.FriendUsername}</span>
                  <span className="text-[8px] text-emerald-500 font-semibold">Bạn bè ✓</span>
                </div>
              ))}
            </div>
          )
        )}

        {/* Logout */}
        <button onClick={onLogout}
          className="w-full mt-8 py-3.5 bg-stone-100 dark:bg-[#2C2C2E] hover:bg-rose-50 dark:hover:bg-rose-900/20 text-stone-600 dark:text-stone-400 hover:text-rose-600 border border-stone-200 dark:border-[#3A3A3C] hover:border-rose-200 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]">
          <SignOut size={16} /> Đăng Xuất Tài Khoản
        </button>
      </div>

      {/* Modal: Change Password */}
      {showChangePwd && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-[70] p-4">
          <div className="w-full max-w-sm bg-white dark:bg-[#1C1C1E] rounded-3xl overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-stone-100 dark:border-[#3A3A3C]">
              <h3 className="font-display text-sm font-bold text-stone-900 dark:text-white flex items-center gap-2"><LockSimple size={16} className="text-coral-500" /> Đổi Mật Khẩu</h3>
              <button onClick={() => { setShowChangePwd(false); setPwdError(""); setPwdSuccess(false); }} className="text-stone-400 hover:text-stone-600 cursor-pointer"><X size={18} /></button>
            </div>
            {pwdSuccess ? (
              <div className="p-8 text-center"><div className="text-5xl mb-3">🔐</div><p className="text-sm font-bold text-emerald-600">Đổi mật khẩu thành công!</p></div>
            ) : (
              <form onSubmit={handleChangePassword} className="p-5 space-y-4">
                {pwdError && <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 text-red-600 text-xs rounded-xl px-3 py-2.5 font-medium">{pwdError}</div>}
                <div>
                  <label className="block text-[10px] font-bold text-stone-500 uppercase mb-1.5 tracking-wider">Mật khẩu hiện tại</label>
                  <div className="relative">
                    <input type={showOld ? "text" : "password"} required value={oldPwd} onChange={(e) => setOldPwd(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 dark:border-[#3A3A3C] focus:outline-none focus:ring-2 focus:ring-coral-500/20 text-xs bg-stone-50 dark:bg-[#2C2C2E] text-stone-900 dark:text-white pr-9" />
                    <button type="button" onClick={() => setShowOld(!showOld)} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 cursor-pointer">{showOld ? <EyeSlash size={14} /> : <Eye size={14} />}</button>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-stone-500 uppercase mb-1.5 tracking-wider">Mật khẩu mới (≥ 6 ký tự)</label>
                  <div className="relative">
                    <input type={showNew ? "text" : "password"} required value={newPwd} onChange={(e) => setNewPwd(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 dark:border-[#3A3A3C] focus:outline-none focus:ring-2 focus:ring-coral-500/20 text-xs bg-stone-50 dark:bg-[#2C2C2E] text-stone-900 dark:text-white pr-9" />
                    <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 cursor-pointer">{showNew ? <EyeSlash size={14} /> : <Eye size={14} />}</button>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-stone-500 uppercase mb-1.5 tracking-wider">Xác nhận mật khẩu mới</label>
                  <input type="password" required value={confirmPwd} onChange={(e) => setConfirmPwd(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 dark:border-[#3A3A3C] focus:outline-none focus:ring-2 focus:ring-coral-500/20 text-xs bg-stone-50 dark:bg-[#2C2C2E] text-stone-900 dark:text-white" />
                </div>
                <button type="submit" disabled={pwdLoading}
                  className="w-full py-2.5 bg-coral-500 hover:bg-coral-600 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 shadow-md disabled:opacity-60 active:scale-95">
                  <LockSimple size={14} /> {pwdLoading ? "Đang xử lý..." : "Đổi mật khẩu"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Modal: Activity Log */}
      {showLogs && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 z-[70]">
          <div className="w-full max-w-sm bg-white dark:bg-[#1C1C1E] rounded-3xl shadow-2xl border border-stone-100 dark:border-[#3A3A3C] flex flex-col max-h-[75vh]">
            <div className="flex justify-between items-center px-5 pt-5 pb-4 border-b border-stone-100 dark:border-[#3A3A3C] shrink-0">
              <h3 className="font-display text-sm font-bold text-stone-900 dark:text-white flex items-center gap-1.5"><Clock size={16} className="text-coral-500" /> Nhật Ký Hoạt Động</h3>
              <button onClick={() => setShowLogs(false)} className="text-stone-400 hover:text-stone-600 cursor-pointer"><X size={18} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-none">
              {logs.length === 0 ? <p className="text-center text-[10px] text-stone-400 py-8">Chưa có hoạt động nào.</p> : logs.map((log) => (
                <div key={log.ActivityLogId} className="flex gap-3 items-start text-xs border-b border-stone-50 dark:border-[#2C2C2E] pb-3 last:border-0 last:pb-0">
                  <div className="p-2 bg-stone-100 dark:bg-[#2C2C2E] rounded-xl text-stone-500 shrink-0 mt-0.5">
                    {log.ActionType === "Post" && <Camera size={13} />}
                    {log.ActionType === "Comment" && <ChatCircle size={13} />}
                    {log.ActionType === "Reaction" && <Heart size={13} />}
                    {log.ActionType === "FriendRequest" && <UserPlus size={13} />}
                    {log.ActionType === "FriendAccept" && <Users size={13} />}
                    {log.ActionType === "Message" && <PaperPlaneRight size={13} />}
                    {log.ActionType === "ProfileUpdate" && <PencilSimple size={13} />}
                    {log.ActionType === "ChangePassword" && <LockSimple size={13} />}
                    {!["Post","Comment","Reaction","FriendRequest","FriendAccept","Message","ProfileUpdate","ChangePassword"].includes(log.ActionType) && <UserCircle size={13} />}
                  </div>
                  <div className="flex-1">
                    <p className="text-stone-700 dark:text-stone-300 leading-normal font-medium">{log.Detail}</p>
                    <span className="text-[9px] text-stone-400 block mt-0.5">{new Date(log.CreatedAt).toLocaleString("vi-VN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightboxMemory && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center z-[80] p-4" onClick={() => setLightboxMemory(null)}>
          <button onClick={() => setLightboxMemory(null)} className="absolute top-5 right-5 bg-white/10 hover:bg-white/20 text-white rounded-full p-2 cursor-pointer transition-all"><X size={20} /></button>
          <div className="max-w-sm w-full bg-white dark:bg-[#1C1C1E] rounded-3xl overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="relative aspect-square bg-stone-900">
              <img src={lightboxMemory.ImagesJson ? (() => { try { return JSON.parse(lightboxMemory.ImagesJson)[0] || getApiUrl(lightboxMemory.ImageUrl); } catch { return getApiUrl(lightboxMemory.ImageUrl); } })() : getApiUrl(lightboxMemory.ImageUrl)}
                alt={lightboxMemory.Caption || ""} className="w-full h-full object-contain" />
            </div>
            <div className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <img src={user.AvatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${user.Username}`} alt="" className="w-8 h-8 rounded-full object-cover" />
                <div>
                  <p className="text-xs font-bold text-stone-900 dark:text-white">{user.Username}</p>
                  <p className="text-[9px] text-stone-400">{new Date(lightboxMemory.CreatedAt).toLocaleDateString("vi-VN", { weekday: "short", month: "short", day: "numeric" })}</p>
                </div>
                <span className="ml-auto text-base">{getCategoryEmoji(lightboxMemory.Category)}</span>
              </div>
              {lightboxMemory.Caption && <p className="text-xs text-stone-700 dark:text-stone-300 leading-relaxed">{lightboxMemory.Caption}</p>}
              <div className="flex items-center gap-3 mt-3 pt-3 border-t border-stone-100 dark:border-[#3A3A3C] text-xs text-stone-500">
                <span className="flex items-center gap-1"><Heart size={13} className="text-coral-400" /> {(lightboxMemory.Reactions || []).length} lượt tim</span>
                <span className="flex items-center gap-1"><ChatCircle size={13} className="text-blue-400" /> {(lightboxMemory.Comments || []).length} bình luận</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState } from "react";
import { apiRequest, getApiUrl } from "../api";
import { Calendar, UserCircle, PencilSimple, Check, X, SignOut, Smiley, Clock, Camera, ChatCircle, Heart, UserPlus, Users, PaperPlaneRight } from "@phosphor-icons/react";

export default function Profile({ user, memories, onProfileUpdated, onLogout }) {
  const [isEditing, setIsEditing] = useState(false);
  const [newUsername, setNewUsername] = useState(user.Username);
  const [newAvatar, setNewAvatar] = useState(user.AvatarUrl);
  const [loading, setLoading] = useState(false);

  // Activity Log States
  const [showLogs, setShowLogs] = useState(false);
  const [logs, setLogs] = useState([]);

  // Filter memories to show only posts by this user (Personal profile timeline!)
  const myMemories = memories.filter(m => m.UserId === user.UserId);

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!newUsername.trim()) return;

    setLoading(true);
    try {
      const updatedUser = await apiRequest("/api/auth/update", "POST", {
        userId: user.UserId,
        username: newUsername.trim(),
        avatarUrl: newAvatar.trim()
      });

      // Update state in App.jsx
      onProfileUpdated(updatedUser);
      setIsEditing(false);
    } catch (err) {
      alert("Cập nhật thông tin thất bại: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async () => {
    try {
      const data = await apiRequest(`/api/activitylog/${user.UserId}`);
      setLogs(data);
      setShowLogs(true);
    } catch (err) {
      console.error("Failed to load activity logs:", err);
    }
  };

  const getCategoryVietnamese = (cat) => {
    if (cat === "Birthday") return "🎂 Sinh Nhật";
    if (cat === "Travel") return "✈️ Du Lịch";
    if (cat === "Milestone") return "🏆 Cột Mốc";
    return "🏡 Đời Thường";
  };

  return (
    <div className="pb-24 pt-4 px-4 max-w-md mx-auto min-h-[100dvh]">
      <h2 className="font-display text-2xl font-bold text-stone-900 mb-4">Trang Cá Nhân</h2>

      {/* User Info Card */}
      <div className="bg-white border border-stone-100 rounded-3xl p-5 shadow-xs mb-6 text-center relative overflow-hidden">
        {!isEditing ? (
          <div className="space-y-3">
            <button
              onClick={() => setIsEditing(true)}
              className="absolute top-4 right-4 p-2 text-stone-400 hover:text-coral-500 hover:bg-stone-50 rounded-xl transition-colors cursor-pointer"
            >
              Hiệu chỉnh
            </button>

            <img
              src={user.AvatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${user.Username}`}
              alt={user.Username}
              className="w-18 h-18 rounded-full mx-auto border-2 border-coral-500 p-0.5 bg-white"
            />
            <div>
              <h3 className="font-display text-lg font-bold text-stone-900">{user.Username}</h3>
              <p className="text-xs text-stone-450 mt-0.5">{user.Email}</p>
            </div>

            <button
              onClick={fetchLogs}
              className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-600 rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1 mt-1 shadow-xs"
            >
              <Clock size={14} /> Nhật ký hoạt động
            </button>
          </div>
        ) : (
          <form onSubmit={handleUpdate} className="space-y-4 text-left">
            <div>
              <label className="block text-[10px] font-bold text-stone-500 uppercase mb-1">Tên tài khoản</label>
              <input
                type="text"
                required
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-coral-500/20 focus:border-coral-500 text-xs bg-stone-50 text-stone-900"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-stone-500 uppercase mb-1">Ảnh đại diện (URL)</label>
              <input
                type="text"
                value={newAvatar}
                onChange={(e) => setNewAvatar(e.target.value)}
                placeholder="https://..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-coral-500/20 focus:border-coral-500 text-xs bg-stone-50 text-stone-900"
              />
            </div>

            <div className="flex gap-2 text-xs pt-1">
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false);
                  setNewUsername(user.Username);
                  setNewAvatar(user.AvatarUrl);
                }}
                className="flex-1 py-2 bg-stone-100 hover:bg-stone-200 text-stone-600 rounded-xl font-bold transition-all cursor-pointer flex items-center justify-center gap-1"
              >
                <X size={14} /> Hủy
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-2 bg-coral-500 hover:bg-coral-600 text-white rounded-xl font-bold transition-all cursor-pointer flex items-center justify-center gap-1 shadow-md shadow-coral-500/10"
              >
                <Check size={14} /> {loading ? "Lưu..." : "Lưu lại"}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* User's Own Posts Feed (Facebook Profile style) */}
      <div className="space-y-4">
        <h3 className="font-display text-sm font-bold text-stone-900 uppercase tracking-wider mb-2">Bài viết của bạn ({myMemories.length})</h3>

        {myMemories.length === 0 ? (
          <div className="text-center py-12 bg-white border border-stone-100 rounded-3xl p-6 text-stone-400 text-xs">
            <Smiley size={32} className="text-stone-300 mx-auto mb-2" />
            Bạn chưa đăng tải bài viết nào. Hãy ra Bảng Tin để đăng khoảnh khắc đầu tiên!
          </div>
        ) : (
          myMemories.map((memory) => (
            <div key={memory.MemoryId} className="polaroid-card rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[9px] text-stone-450 block flex items-center gap-1">
                  <Calendar size={11} />
                  {new Date(memory.CreatedAt).toLocaleDateString("vi-VN", { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold text-coral-500 bg-coral-50">
                  {getCategoryVietnamese(memory.Category)}
                </span>
              </div>

              {memory.Caption && (
                <p className="text-xs text-stone-700 leading-relaxed font-semibold">{memory.Caption}</p>
              )}

              <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-stone-900 border border-stone-200">
                <img src={getApiUrl(memory.ImageUrl)} alt="" className="w-full h-full object-cover" />
              </div>
            </div>
          ))
        )}
      </div>

      {/* Logout button */}
      <button
        onClick={onLogout}
        className="w-full mt-8 py-3.5 bg-stone-100 hover:bg-rose-50 text-stone-600 hover:text-rose-600 border border-stone-200 hover:border-rose-200 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-[0.98]"
      >
        <SignOut size={16} /> Đăng Xuất Tài Khoản
      </button>

      {/* Activity Log Modal overlay */}
      {showLogs && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-6 z-55">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-xl border border-stone-100 flex flex-col max-h-[70vh]">
            <div className="flex justify-between items-center pb-3 border-b border-stone-150 shrink-0">
              <h3 className="font-display text-sm font-bold text-stone-900 flex items-center gap-1.5">
                <Clock size={16} /> Nhật Ký Hoạt Động
              </h3>
              <button onClick={() => setShowLogs(false)} className="text-stone-400 hover:text-stone-600 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-3 space-y-3.5 pr-1 scrollbar-none mt-2">
              {logs.length === 0 ? (
                <p className="text-center text-[10px] text-stone-400 py-8">Bạn chưa có hoạt động nào được lưu vết.</p>
              ) : (
                logs.map((log) => (
                  <div key={log.ActivityLogId} className="flex gap-2.5 items-start text-xs border-b border-stone-50 pb-2 last:border-0 last:pb-0">
                    <div className="p-1.5 bg-stone-100 rounded-xl text-stone-500 shrink-0 mt-0.5">
                      {log.ActionType === "Post" && <Camera size={14} />}
                      {log.ActionType === "Comment" && <ChatCircle size={14} />}
                      {log.ActionType === "Reaction" && <Heart size={14} />}
                      {log.ActionType === "FriendRequest" && <UserPlus size={14} />}
                      {log.ActionType === "FriendAccept" && <Users size={14} />}
                      {log.ActionType === "Message" && <PaperPlaneRight size={14} />}
                      {log.ActionType === "ProfileUpdate" && <PencilSimple size={14} />}
                      {!["Post", "Comment", "Reaction", "FriendRequest", "FriendAccept", "Message", "ProfileUpdate"].includes(log.ActionType) && <UserCircle size={14} />}
                    </div>
                    <div className="flex-1">
                      <p className="text-stone-700 leading-normal font-medium">{log.Detail}</p>
                      <span className="text-[8px] text-stone-450 block mt-0.5">
                        {new Date(log.CreatedAt).toLocaleString("vi-VN", { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

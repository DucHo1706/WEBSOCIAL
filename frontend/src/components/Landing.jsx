import React, { useState } from "react";
import { apiRequest } from "../api";
import { Sparkle, Users, Plus, ArrowRight } from "@phosphor-icons/react";

export default function Landing({ onAuthSuccess, onGroupSuccess }) {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Group forms
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("user");
    return saved ? JSON.parse(saved) : null;
  });
  const [groupName, setGroupName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [isJoin, setIsJoin] = useState(true); // true = join, false = create

  const handleAuth = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isRegister) {
        const data = await apiRequest("/api/auth/register", "POST", { username, email, password });
        localStorage.setItem("user", JSON.stringify(data));
        setUser(data);
        onAuthSuccess(data);
      } else {
        const data = await apiRequest("/api/auth/login", "POST", { email, password });
        localStorage.setItem("user", JSON.stringify(data));
        setUser(data);
        onAuthSuccess(data);
      }
    } catch (err) {
      setError(
        err.message === "Email already registered." ? "Email này đã được đăng ký." :
        err.message === "Username already taken." ? "Tên tài khoản này đã có người sử dụng." :
        err.message === "Invalid email or password." ? "Email hoặc mật khẩu không chính xác." :
        "Xác thực thất bại. Vui lòng kiểm tra lại thông tin."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGroupAction = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!user) return;

    try {
      if (isJoin) {
        const data = await apiRequest("/api/group/join", "POST", { inviteCode, userId: user.UserId });
        onGroupSuccess(data);
      } else {
        const data = await apiRequest("/api/group/create", "POST", { groupName, creatorId: user.UserId });
        onGroupSuccess(data);
      }
    } catch (err) {
      setError(
        err.message === "Group not found with the provided invite code." ? "Không tìm thấy nhóm với mã mời này." :
        err.message === "User is already a member of this group." ? "Bạn đã là thành viên của nhóm này rồi." :
        "Không thể thực hiện yêu cầu nhóm. Vui lòng thử lại."
      );
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center p-6 bg-gradient-to-br from-coral-50 via-stone-50 to-mint-50">
        <div className="w-full max-w-md bg-white rounded-3xl p-8 border border-coral-100 shadow-xl shadow-coral-100/30">
          <div className="flex flex-col items-center mb-8">
            <div className="w-14 h-14 bg-coral-500 rounded-2xl flex items-center justify-center text-white mb-4 shadow-lg shadow-coral-500/20">
              <Sparkle size={28} weight="fill" />
            </div>
            <h1 className="font-display text-3xl font-extrabold text-stone-900 tracking-tight text-center">
              Sunlit Memories
            </h1>
            <p className="text-sm text-stone-500 mt-2 text-center max-w-[32ch]">
              Giữ những người thân thương gần nhau hơn. Chia sẻ mọi kỷ niệm đáng nhớ của nhóm bạn.
            </p>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            {isRegister && (
              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1 uppercase tracking-wider">Tên Tài Khoản</label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Ví dụ: nguyenvana"
                  className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-coral-500/20 focus:border-coral-500 text-stone-900 bg-stone-50/50 text-sm"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1 uppercase tracking-wider">Địa Chỉ Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tenban@vi-du.com"
                className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-coral-500/20 focus:border-coral-500 text-stone-900 bg-stone-50/50 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1 uppercase tracking-wider">Mật Khẩu</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-coral-500/20 focus:border-coral-500 text-stone-900 bg-stone-50/50 text-sm"
              />
            </div>

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-rose-600 text-xs font-medium">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-coral-500 hover:bg-coral-600 text-white rounded-xl font-semibold shadow-lg shadow-coral-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer text-sm"
            >
              {loading ? "Đang xử lý..." : isRegister ? "Đăng Ký Tài Khoản" : "Đăng Nhập"}
              <ArrowRight size={18} weight="bold" />
            </button>
          </form>

          <div className="mt-6 text-center text-sm">
            <span className="text-stone-500">
              {isRegister ? "Đã có tài khoản? " : "Bạn mới tham gia? "}
            </span>
            <button
              onClick={() => {
                setIsRegister(!isRegister);
                setError("");
              }}
              className="text-coral-500 font-semibold hover:underline cursor-pointer"
            >
              {isRegister ? "Đăng Nhập Ngay" : "Đăng Ký Miễn Phí"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // If user is authenticated but needs to select/join a group
  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center p-6 bg-gradient-to-br from-coral-50 via-stone-50 to-mint-50">
      <div className="w-full max-w-md bg-white rounded-3xl p-8 border border-coral-100 shadow-xl shadow-coral-100/30">
        <div className="flex flex-col items-center mb-8">
          <img
            src={user.AvatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${user.Username}`}
            alt={user.Username}
            className="w-16 h-16 rounded-full border-2 border-coral-500 mb-4 bg-coral-50"
          />
          <h2 className="font-display text-2xl font-bold text-stone-900 text-center">
            Chào mừng, {user.Username}!
          </h2>
          <p className="text-sm text-stone-500 mt-1 text-center">
            Hãy tạo một nhóm kỷ niệm mới hoặc gia nhập nhóm đã có.
          </p>
        </div>

        {/* Toggle between Join and Create */}
        <div className="flex bg-stone-100 rounded-xl p-1 mb-6">
          <button
            onClick={() => {
              setIsJoin(true);
              setError("");
            }}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all cursor-pointer ${
              isJoin ? "bg-white text-coral-500 shadow-sm" : "text-stone-500 hover:text-stone-800"
            }`}
          >
            <span className="flex items-center justify-center gap-1.5">
              <Users size={16} />
              Gia Nhập Nhóm
            </span>
          </button>
          <button
            onClick={() => {
              setIsJoin(false);
              setError("");
            }}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all cursor-pointer ${
              !isJoin ? "bg-white text-coral-500 shadow-sm" : "text-stone-500 hover:text-stone-800"
            }`}
          >
            <span className="flex items-center justify-center gap-1.5">
              <Plus size={16} />
              Tạo Nhóm Mới
            </span>
          </button>
        </div>

        <form onSubmit={handleGroupAction} className="space-y-4">
          {isJoin ? (
            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1 uppercase tracking-wider text-center">Nhập Mã Mời 6 Chữ Số</label>
              <input
                type="text"
                required
                maxLength={6}
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.replace(/\D/g, ""))}
                placeholder="Ví dụ: 123456"
                className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-coral-500/20 focus:border-coral-500 text-stone-900 bg-stone-50/50 text-center text-lg font-bold tracking-widest"
              />
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1 uppercase tracking-wider">Tên Nhóm Kỷ Niệm</label>
              <input
                type="text"
                required
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Ví dụ: Gia Đình Thân Yêu, Bạn Cấp 3..."
                className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-coral-500/20 focus:border-coral-500 text-stone-900 bg-stone-50/50 text-sm"
              />
            </div>
          )}

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-rose-600 text-xs font-medium">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-coral-500 hover:bg-coral-600 text-white rounded-xl font-semibold shadow-lg shadow-coral-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer text-sm"
          >
            {loading ? "Đang xử lý..." : isJoin ? "Vào Nhóm Kỷ Niệm" : "Tạo Nhóm Kỷ Niệm"}
            <ArrowRight size={18} weight="bold" />
          </button>
        </form>

        <button
          onClick={() => {
            localStorage.removeItem("user");
            setUser(null);
            setError("");
          }}
          className="w-full mt-6 text-center text-xs text-stone-400 hover:text-stone-600 cursor-pointer font-medium"
        >
          Đăng xuất tài khoản
        </button>
      </div>
    </div>
  );
}

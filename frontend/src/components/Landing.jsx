import React, { useState } from "react";
import { apiRequest } from "../api";
import { Sparkle, Users, Plus, ArrowRight, Envelope, Lock, User } from "@phosphor-icons/react";
import { motion, AnimatePresence } from "framer-motion";

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
      <div className="min-h-[100dvh] flex flex-col items-center justify-center p-6 relative overflow-hidden bg-[#FAF9F6] dark:bg-[#09090b] transition-colors duration-300">
        {/* Animated background glow circles */}
        <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-coral-500/10 blur-[100px] pointer-events-none" />
        <div className="absolute bottom-[-15%] right-[-10%] w-[60vw] h-[60vw] rounded-full bg-coral-600/10 dark:bg-coral-500/5 blur-[120px] pointer-events-none" />

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="w-full max-w-md bg-white/80 dark:bg-stone-900/60 backdrop-blur-xl border border-white/20 dark:border-stone-800 shadow-2xl rounded-3xl p-8 z-10"
        >
          <div className="flex flex-col items-center mb-8">
            <motion.div 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="w-14 h-14 bg-coral-500 rounded-2xl flex items-center justify-center text-white mb-4 shadow-lg shadow-coral-500/25 cursor-pointer"
            >
              <Sparkle size={28} weight="fill" />
            </motion.div>
            <h1 className="font-display text-3xl font-extrabold text-stone-900 dark:text-stone-50 tracking-tight text-center">
              Sunlit Memories
            </h1>
            <p className="text-sm text-stone-500 dark:text-stone-400 mt-2 text-center max-w-[32ch]">
              Giữ những người thân thương gần nhau hơn. Chia sẻ mọi kỷ niệm đáng nhớ của nhóm bạn.
            </p>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            <AnimatePresence mode="wait">
              {isRegister && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <label className="block text-xs font-semibold text-stone-500 dark:text-stone-400 mb-1 uppercase tracking-wider">Tên Tài Khoản</label>
                  <div className="relative">
                    <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                    <input
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Ví dụ: nguyenvana"
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-stone-200 dark:border-stone-800 focus:outline-none focus:ring-2 focus:ring-coral-500/20 focus:border-coral-500 text-stone-900 dark:text-stone-100 bg-stone-50/50 dark:bg-stone-950/50 text-sm transition-all"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div>
              <label className="block text-xs font-semibold text-stone-500 dark:text-stone-400 mb-1 uppercase tracking-wider">Địa Chỉ Email</label>
              <div className="relative">
                <Envelope size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tenban@vi-du.com"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-stone-200 dark:border-stone-800 focus:outline-none focus:ring-2 focus:ring-coral-500/20 focus:border-coral-500 text-stone-900 dark:text-stone-100 bg-stone-50/50 dark:bg-stone-950/50 text-sm transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-500 dark:text-stone-400 mb-1 uppercase tracking-wider">Mật Khẩu</label>
              <div className="relative">
                <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-stone-200 dark:border-stone-800 focus:outline-none focus:ring-2 focus:ring-coral-500/20 focus:border-coral-500 text-stone-900 dark:text-stone-100 bg-stone-50/50 dark:bg-stone-950/50 text-sm transition-all"
                />
              </div>
            </div>

            {error && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/50 rounded-xl text-rose-600 dark:text-rose-400 text-xs font-medium"
              >
                {error}
              </motion.div>
            )}

            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-coral-500 hover:bg-coral-600 text-white rounded-xl font-semibold shadow-lg shadow-coral-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer text-sm"
            >
              {loading ? "Đang xử lý..." : isRegister ? "Đăng Ký Tài Khoản" : "Đăng Nhập"}
              <ArrowRight size={18} weight="bold" />
            </motion.button>
          </form>

          <div className="mt-6 text-center text-sm">
            <span className="text-stone-500 dark:text-stone-400">
              {isRegister ? "Đã có tài khoản? " : "Bạn mới tham gia? "}
            </span>
            <button
              onClick={() => {
                setIsRegister(!isRegister);
                setError("");
              }}
              className="text-coral-500 font-semibold hover:underline cursor-pointer transition-all"
            >
              {isRegister ? "Đăng Nhập Ngay" : "Đăng Ký Miễn Phí"}
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // If user is authenticated but needs to select/join a group
  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center p-6 relative overflow-hidden bg-[#FAF9F6] dark:bg-[#09090b] transition-colors duration-300">
      {/* Animated background glow circles */}
      <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-coral-500/10 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-15%] right-[-10%] w-[60vw] h-[60vw] rounded-full bg-coral-600/10 dark:bg-coral-500/5 blur-[120px] pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-md bg-white/80 dark:bg-stone-900/60 backdrop-blur-xl border border-white/20 dark:border-stone-800 shadow-2xl rounded-3xl p-8 z-10"
      >
        <div className="flex flex-col items-center mb-8">
          <motion.img
            whileHover={{ scale: 1.05 }}
            src={user.AvatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${user.Username}`}
            alt={user.Username}
            className="w-16 h-16 rounded-full border-2 border-coral-500 mb-4 bg-coral-50 shadow-md object-cover"
          />
          <h2 className="font-display text-2xl font-bold text-stone-900 dark:text-stone-50 text-center">
            Chào mừng, {user.Username}!
          </h2>
          <p className="text-sm text-stone-500 dark:text-stone-400 mt-1 text-center">
            Hãy tạo một nhóm kỷ niệm mới hoặc gia nhập nhóm đã có.
          </p>
        </div>

        {/* Toggle between Join and Create */}
        <div className="flex bg-stone-100 dark:bg-stone-950 p-1 rounded-xl mb-6 relative">
          <button
            onClick={() => {
              setIsJoin(true);
              setError("");
            }}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all cursor-pointer relative z-10 ${
              isJoin ? "bg-white dark:bg-stone-900 text-coral-500 shadow-sm" : "text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200"
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
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all cursor-pointer relative z-10 ${
              !isJoin ? "bg-white dark:bg-stone-900 text-coral-500 shadow-sm" : "text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200"
            }`}
          >
            <span className="flex items-center justify-center gap-1.5">
              <Plus size={16} />
              Tạo Nhóm Mới
            </span>
          </button>
        </div>

        <form onSubmit={handleGroupAction} className="space-y-4">
          <AnimatePresence mode="wait">
            {isJoin ? (
              <motion.div
                key="join-group"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.2 }}
              >
                <label className="block text-xs font-semibold text-stone-500 dark:text-stone-400 mb-2.5 uppercase tracking-wider text-center">Nhập Mã Mời 6 Chữ Số</label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="Ví dụ: 123456"
                  className="w-full px-4 py-3 rounded-xl border border-stone-200 dark:border-stone-800 focus:outline-none focus:ring-2 focus:ring-coral-500/20 focus:border-coral-500 text-stone-900 dark:text-stone-100 bg-stone-50 dark:bg-stone-950 text-center text-lg font-bold tracking-widest transition-all"
                />
              </motion.div>
            ) : (
              <motion.div
                key="create-group"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
              >
                <label className="block text-xs font-semibold text-stone-500 dark:text-stone-400 mb-2 uppercase tracking-wider">Tên Nhóm Kỷ Niệm</label>
                <input
                  type="text"
                  required
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="Ví dụ: Gia Đình Thân Yêu, Bạn Cấp 3..."
                  className="w-full px-4 py-3 rounded-xl border border-stone-200 dark:border-stone-800 focus:outline-none focus:ring-2 focus:ring-coral-500/20 focus:border-coral-500 text-stone-900 dark:text-stone-100 bg-stone-50 dark:bg-stone-950 text-sm transition-all"
                />
              </motion.div>
            )}
          </AnimatePresence>

          {error && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/50 rounded-xl text-rose-600 dark:text-rose-400 text-xs font-medium"
            >
              {error}
            </motion.div>
          )}

          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-coral-500 hover:bg-coral-600 text-white rounded-xl font-semibold shadow-lg shadow-coral-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer text-sm"
          >
            {loading ? "Đang xử lý..." : isJoin ? "Vào Nhóm Kỷ Niệm" : "Tạo Nhóm Kỷ Niệm"}
            <ArrowRight size={18} weight="bold" />
          </motion.button>
        </form>

        <button
          onClick={() => {
            localStorage.removeItem("user");
            setUser(null);
            setError("");
          }}
          className="w-full mt-6 text-center text-xs text-stone-400 hover:text-stone-500 dark:hover:text-stone-300 cursor-pointer font-medium transition-colors"
        >
          Đăng xuất tài khoản
        </button>
      </motion.div>
    </div>
  );
}

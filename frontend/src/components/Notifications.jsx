// React UI component
import React, { useEffect, useState } from "react";
import { apiRequest } from "../api";
import { Bell, Check, Clock, Globe } from "@phosphor-icons/react";

export default function Notifications({ user, onNotificationRead }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    try {
      const data = await apiRequest(`/api/notification/${user.UserId}`);
      setNotifications(data || []);
    } catch (err) {
      console.error("Lỗi khi tải thông báo:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();

    // Hook to window to allow global re-fetch on new message/signalr event
    window.refreshNotificationsList = fetchNotifications;
    return () => {
      delete window.refreshNotificationsList;
    };
  }, [user.UserId]);

  const handleMarkAllRead = async () => {
    try {
      await apiRequest(`/api/notification/read/${user.UserId}`, "POST");
      setNotifications(prev => prev.map(n => ({ ...n, IsRead: true })));
      if (onNotificationRead) onNotificationRead();
    } catch (err) {
      console.error("Lỗi khi đánh dấu đã đọc:", err);
    }
  };

  const getNotificationIcon = (type) => {
    if (type === "Comment") return "💬";
    if (type === "Reaction") return "❤️";
    if (type === "FriendRequest") return "👤";
    if (type === "FriendAccept") return "🤝";
    return "🔔";
  };

  const formatTimeAgo = (dateStr) => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffMins < 1) return "Vừa xong";
      if (diffMins < 60) return `${diffMins} phút trước`;
      if (diffHours < 24) return `${diffHours} giờ trước`;
      return `${diffDays} ngày trước`;
    } catch {
      return "";
    }
  };

  return (
    <div className="pb-24 pt-4 px-4 max-w-md mx-auto space-y-4">
      {/* Branding Header */}
      <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-coral-100/40 shadow-xs">
        <div>
          <h2 className="font-display text-xl font-bold text-coral-500 flex items-center gap-1.5">
            <Bell size={20} weight="fill" className="text-coral-500 animate-bounce" />
            Thông Báo
          </h2>
          <p className="text-[10px] text-stone-400 font-bold uppercase tracking-wider mt-0.5 font-sans">
            Tương tác & Hoạt động
          </p>
        </div>

        {notifications.some(n => !n.IsRead) && (
          <button
            onClick={handleMarkAllRead}
            className="flex items-center gap-1 text-[10px] font-bold text-coral-500 hover:text-coral-600 bg-coral-50 px-3 py-1.5 rounded-full transition-colors cursor-pointer"
          >
            <Check size={12} weight="bold" /> Đọc tất cả
          </button>
        )}
      </div>

      {/* Notifications List */}
      <div className="bg-white rounded-3xl border border-stone-150 overflow-hidden divide-y divide-stone-100 shadow-sm">
        {loading ? (
          <div className="text-center py-12 text-stone-400 text-xs">Đang tải thông báo...</div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-16 text-stone-400 text-xs flex flex-col items-center justify-center gap-2">
            <Bell size={32} className="text-stone-300" />
            <span>Chưa có thông báo nào dành cho bạn.</span>
          </div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.NotificationId}
              className={`p-3.5 flex gap-3 items-start transition-colors relative ${
                n.IsRead ? "bg-white hover:bg-stone-50/50" : "bg-coral-50/20 hover:bg-coral-50/30"
              }`}
            >
              {/* Sender Avatar */}
              <div className="relative">
                <img
                  src={n.SenderAvatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${n.SenderName}`}
                  alt={n.SenderName}
                  className="w-10 h-10 rounded-full border border-stone-100 object-cover"
                />
                <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-stone-100 border border-white rounded-full flex items-center justify-center text-[10px] shadow-sm">
                  {getNotificationIcon(n.Type)}
                </span>
              </div>

              {/* Notification Text */}
              <div className="flex-1 space-y-1">
                <p className="text-xs text-stone-850 leading-relaxed">
                  <span className="font-bold text-stone-900 mr-1">{n.SenderName}</span>
                  {n.Text}
                </p>
                <span className="text-[9px] text-stone-400 flex items-center gap-1 font-sans">
                  <Clock size={10} />
                  {formatTimeAgo(n.CreatedAt)}
                </span>
              </div>

              {/* Blue dot indicator for Unread */}
              {!n.IsRead && (
                <div className="w-2.5 h-2.5 bg-coral-500 rounded-full shrink-0 mt-2 shadow-xs shadow-coral-500/30" />
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

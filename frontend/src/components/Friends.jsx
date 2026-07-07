import React, { useState, useEffect } from "react";
import { apiRequest } from "../api";
import { UserPlus, UserCheck, Trash, Users, Smiley, MagnifyingGlass } from "@phosphor-icons/react";

export default function Friends({ user, onlineUsers }) {
  const [activeTab, setActiveTab] = useState("find"); // find, list
  const [usersList, setUsersList] = useState([]);
  const [friendsList, setFriendsList] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadUsers();
    loadFriends();

    window.refreshFriendsList = () => {
      loadUsers();
      loadFriends();
    };

    return () => {
      delete window.refreshFriendsList;
    };
  }, [activeTab, user.UserId]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await apiRequest(`/api/friendship/users/${user.UserId}`);
      setUsersList(data);
    } catch (err) {
      console.error("Failed to load users:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadFriends = async () => {
    try {
      const data = await apiRequest(`/api/friendship/friends/${user.UserId}`);
      setFriendsList(data);
    } catch (err) {
      console.error("Failed to load friends:", err);
    }
  };

  const handleAddFriend = async (targetUserId) => {
    try {
      await apiRequest("/api/friendship/request", "POST", {
        senderId: user.UserId,
        receiverId: targetUserId
      });
      loadUsers();
    } catch (err) {
      alert("Gửi lời mời kết bạn thất bại: " + err.message);
    }
  };

  const handleAcceptRequest = async (friendshipId) => {
    try {
      await apiRequest("/api/friendship/accept", "POST", {
        friendshipId
      });
      loadUsers();
      loadFriends();
    } catch (err) {
      alert("Đồng ý kết bạn thất bại: " + err.message);
    }
  };

  const handleRemoveFriend = async (friendshipId) => {
    if (!window.confirm("Bạn có chắc chắn muốn hủy kết bạn?")) return;
    try {
      await apiRequest("/api/friendship/remove", "POST", {
        friendshipId
      });
      loadUsers();
      loadFriends();
    } catch (err) {
      alert("Hủy kết bạn thất bại: " + err.message);
    }
  };

  const isOnline = (targetUserId) => {
    return (onlineUsers || []).includes(targetUserId);
  };

  const pendingRequests = usersList.filter(u => u.FriendshipStatus === "Received");
  const nonFriends = usersList.filter(u => u.FriendshipStatus !== "Accepted" && u.FriendshipStatus !== "Received");

  // Search filter
  const filteredNonFriends = nonFriends.filter(u => 
    u.Username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.Email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredFriends = friendsList.filter(u =>
    u.Username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.Email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="pb-24 pt-4 px-4 max-w-md mx-auto min-h-[100dvh]">
      <h2 className="font-display text-2xl font-bold text-stone-900 mb-4">Mạng Lưới Bạn Bè</h2>

      {/* Toggle between Find and List */}
      <div className="flex bg-stone-100 rounded-xl p-1 mb-4">
        <button
          onClick={() => { setActiveTab("find"); setSearchTerm(""); }}
          className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all cursor-pointer ${
            activeTab === "find" ? "bg-white text-coral-500 shadow-sm" : "text-stone-500 hover:text-stone-800"
          }`}
        >
          Gợi Ý & Lời Mời
        </button>
        <button
          onClick={() => { setActiveTab("list"); setSearchTerm(""); }}
          className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all cursor-pointer ${
            activeTab === "list" ? "bg-white text-coral-500 shadow-sm" : "text-stone-500 hover:text-stone-800"
          }`}
        >
          Bạn Bè ({friendsList.length})
        </button>
      </div>

      {/* Friends Search Input */}
      <div className="relative mb-5">
        <input
          type="text"
          placeholder={activeTab === "find" ? "Tìm kiếm thành viên khác..." : "Tìm kiếm bạn bè..."}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-full border border-stone-200 focus:outline-none focus:ring-2 focus:ring-coral-500/20 focus:border-coral-500 text-xs bg-white text-stone-900 shadow-xs"
        />
        <MagnifyingGlass size={16} className="absolute left-3.5 top-3.5 text-stone-400" />
      </div>

      {activeTab === "find" && (
        <div className="space-y-6">
          {/* Pending Requests */}
          {pendingRequests.length > 0 && !searchTerm && (
            <div className="bg-coral-50/50 border border-coral-100 rounded-3xl p-4 space-y-3">
              <h3 className="text-xs font-bold text-coral-600 uppercase tracking-wider flex items-center gap-1.5">
                <Users size={16} weight="fill" />
                Lời Mời Kết Bạn Đang Chờ ({pendingRequests.length})
              </h3>
              <div className="divide-y divide-coral-100/50">
                {pendingRequests.map((req) => (
                  <div key={req.UserId} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
                    <div className="flex items-center gap-2">
                      <img src={req.AvatarUrl} alt={req.Username} className="w-8 h-8 rounded-full bg-stone-50" />
                      <div>
                        <span className="text-xs font-bold text-stone-800 block">{req.Username}</span>
                        {req.MutualFriendsCount > 0 && (
                          <span className="text-[9px] font-semibold text-coral-500 block">{req.MutualFriendsCount} bạn chung</span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleAcceptRequest(req.FriendshipId)}
                      className="px-3 py-1.5 bg-coral-500 hover:bg-coral-600 text-white rounded-lg text-xs font-bold shadow active:scale-95 transition-all cursor-pointer"
                    >
                      Đồng Ý
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Mutual Friends & Neighbors Finder */}
          <div>
            <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-3">Tìm kiếm & Gợi ý kết nối</h3>
            {loading ? (
              <p className="text-xs text-stone-400 text-center py-4">Đang tải thành viên...</p>
            ) : filteredNonFriends.length === 0 ? (
              <p className="text-xs text-stone-400 text-center py-4">Không tìm thấy thành viên nào phù hợp.</p>
            ) : (
              <div className="bg-white border border-stone-100 rounded-3xl p-4 divide-y divide-stone-100 shadow-xs">
                {filteredNonFriends.map((u) => {
                  const online = isOnline(u.UserId);
                  return (
                    <div key={u.UserId} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                      <div className="flex items-center gap-2.5">
                        <div className="relative">
                          <img src={u.AvatarUrl} alt={u.Username} className="w-9 h-9 rounded-full bg-stone-50 border border-stone-100" />
                          {online && (
                            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border border-white rounded-full"></span>
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-stone-800">{u.Username}</span>
                            {online && (
                              <span className="text-[8px] font-bold text-emerald-600 bg-emerald-50 px-1 py-0.5 rounded">Online</span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 text-[9px] text-stone-400 block mt-0.5">
                            {u.MutualFriendsCount > 0 && (
                              <span className="font-bold text-coral-500">{u.MutualFriendsCount} bạn chung</span>
                            )}
                            {u.MutualFriendsCount > 0 && <span>•</span>}
                            <span>Lân cận: {u.Location}</span>
                          </div>
                        </div>
                      </div>

                      {u.FriendshipStatus === "Sent" ? (
                        <span className="text-[10px] font-bold text-stone-400 bg-stone-50 border border-stone-150 px-2.5 py-1.5 rounded-lg flex items-center gap-1 select-none">
                          Đã Gửi
                        </span>
                      ) : (
                        <button
                          onClick={() => handleAddFriend(u.UserId)}
                          className="px-3 py-1.5 bg-coral-50 hover:bg-coral-100 text-coral-500 rounded-lg text-[10px] font-bold active:scale-95 transition-all flex items-center gap-1 cursor-pointer"
                        >
                          <UserPlus size={14} /> Thêm Bạn
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "list" && (
        <div className="space-y-4">
          {filteredFriends.length === 0 ? (
            <div className="text-center py-12 bg-white border border-stone-100 rounded-3xl p-6 text-stone-400 text-xs">
              <Smiley size={36} className="text-stone-300 mx-auto mb-2" />
              Bạn chưa có người bạn nào. Hãy qua phần gợi ý để kết nối nhé!
            </div>
          ) : (
            <div className="bg-white border border-stone-100 rounded-3xl p-4 divide-y divide-stone-100 shadow-xs">
              {filteredFriends.map((f) => {
                const online = isOnline(f.UserId);
                return (
                  <div key={f.UserId} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                    <div className="flex items-center gap-2.5">
                      <div className="relative">
                        <img src={f.AvatarUrl} alt={f.Username} className="w-9 h-9 rounded-full bg-stone-50 border border-stone-100" />
                        {online && (
                          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border border-white rounded-full"></span>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-stone-800">{f.Username}</span>
                          {online && (
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                          )}
                        </div>
                        <span className="text-[9px] text-stone-400 block mt-0.5">
                          {online ? "Đang hoạt động" : "Ngoại tuyến"}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        const uRelation = usersList.find(u => u.UserId === f.UserId);
                        if (uRelation && uRelation.FriendshipId) {
                          handleRemoveFriend(uRelation.FriendshipId);
                        }
                      }}
                      className="p-1.5 text-stone-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                    >
                      <Trash size={16} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

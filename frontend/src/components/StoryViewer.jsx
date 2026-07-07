import React, { useState, useEffect, useRef } from "react";
import { apiRequest, getApiUrl } from "../api";
import { X, CaretLeft, CaretRight, PaperPlaneRight, Heart } from "@phosphor-icons/react";

export default function StoryViewer({ user, storyGroups, initialGroupIndex, onClose }) {
  const [groupIndex, setGroupIndex] = useState(initialGroupIndex);
  const [itemIndex, setItemIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Comment panel
  const [commentText, setCommentText] = useState("");
  const [sendingComment, setSendingComment] = useState(false);
  const [commentSent, setCommentSent] = useState(false);

  // Reaction panel (for story owner to view stats)
  const [showReactionPanel, setShowReactionPanel] = useState(false);
  const [reactions, setReactions] = useState([]);
  const [loadingReactions, setLoadingReactions] = useState(false);
  const [myReaction, setMyReaction] = useState(null); // Track user's own reaction

  const progressIntervalRef = useRef(null);
  const timerRef = useRef(null);
  const STORY_DURATION = 5000;

  const currentGroup = storyGroups[groupIndex];
  const currentStory = currentGroup?.Items[itemIndex];
  const isOwnStory = currentGroup?.UserId === user?.UserId;

  // Navigation
  const handleNext = () => {
    if (!currentGroup) return;
    if (itemIndex < currentGroup.Items.length - 1) {
      setItemIndex(i => i + 1); setProgress(0);
    } else if (groupIndex < storyGroups.length - 1) {
      setGroupIndex(g => g + 1); setItemIndex(0); setProgress(0);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (itemIndex > 0) {
      setItemIndex(i => i - 1); setProgress(0);
    } else if (groupIndex > 0) {
      const prevGroup = storyGroups[groupIndex - 1];
      setGroupIndex(g => g - 1); setItemIndex(prevGroup.Items.length - 1); setProgress(0);
    } else {
      setProgress(0);
    }
  };

  // Auto-play timer
  useEffect(() => {
    if (!currentStory || isPaused) return;

    setProgress(0);
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    if (timerRef.current) clearTimeout(timerRef.current);

    const startTime = Date.now();
    progressIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      setProgress(Math.min((elapsed / STORY_DURATION) * 100, 100));
    }, 50);

    timerRef.current = setTimeout(() => handleNext(), STORY_DURATION);

    return () => {
      clearInterval(progressIntervalRef.current);
      clearTimeout(timerRef.current);
    };
  }, [groupIndex, itemIndex, isPaused]);

  // Fetch reactions when viewing own story or opening reaction panel
  const fetchReactions = async (storyId) => {
    setLoadingReactions(true);
    try {
      const data = await apiRequest(`/api/story/${storyId}/reactions`);
      setReactions(data || []);
      // Find own reaction
      const mine = data?.find(r => r.UserId === user?.UserId);
      setMyReaction(mine ? mine.EmojiType : null);
    } catch (err) {
      console.error("Lỗi tải reactions:", err);
    } finally {
      setLoadingReactions(false);
    }
  };

  useEffect(() => {
    if (currentStory) {
      setReactions([]);
      setMyReaction(null);
      setShowReactionPanel(false);
      fetchReactions(currentStory.StoryId);
    }
  }, [currentStory?.StoryId]);

  // React to Story (saves to DB, no DM spam)
  const handleReact = async (emoji) => {
    if (!currentStory || isOwnStory) return;
    try {
      await apiRequest("/api/story/react", "POST", {
        StoryId: currentStory.StoryId,
        UserId: user.UserId,
        EmojiType: emoji
      });
      setMyReaction(emoji);
      // Refresh reactions count
      fetchReactions(currentStory.StoryId);
    } catch (err) {
      console.error("Lỗi thả cảm xúc:", err);
    }
  };

  // Comment/Reply → sends as DM WITH story image attached (for context)
  const handleSendComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim() || sendingComment) return;

    setSendingComment(true);
    // Pause autoplay while user types
    setIsPaused(true);
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    if (timerRef.current) clearTimeout(timerRef.current);

    try {
      await apiRequest("/api/story/comment", "POST", {
        StoryId: currentStory.StoryId,
        UserId: user.UserId,
        Text: commentText.trim()
      });

      setCommentText("");
      setCommentSent(true);
      setTimeout(() => {
        setCommentSent(false);
        setIsPaused(false);
      }, 2000);
    } catch (err) {
      alert("Không thể gửi phản hồi: " + err.message);
      setIsPaused(false);
    } finally {
      setSendingComment(false);
    }
  };

  // Group reactions by emoji for display
  const groupedReactions = reactions.reduce((acc, r) => {
    acc[r.EmojiType] = (acc[r.EmojiType] || []).concat(r);
    return acc;
  }, {});

  if (!currentGroup || !currentStory) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-black flex items-center justify-center">
      <div className="relative w-full max-w-sm h-full flex flex-col">

        {/* ─── HEADER: Progress bars + user info ─── */}
        <div className="absolute top-0 left-0 right-0 z-20 p-3 pb-2 bg-gradient-to-b from-black/70 to-transparent">
          {/* Progress bars */}
          <div className="flex gap-1 mb-3">
            {currentGroup.Items.map((item, idx) => (
              <div key={item.StoryId} className="flex-1 h-[2px] bg-white/30 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white transition-none"
                  style={{
                    width: idx < itemIndex ? "100%" : idx === itemIndex ? `${progress}%` : "0%",
                    transition: idx === itemIndex ? "width 50ms linear" : "none"
                  }}
                />
              </div>
            ))}
          </div>

          {/* User row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img
                src={currentGroup.AvatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${currentGroup.Username}`}
                alt={currentGroup.Username}
                className="w-8 h-8 rounded-full border-2 border-white/40 object-cover"
              />
              <div>
                <p className="text-white text-xs font-bold leading-none">
                  {isOwnStory ? "Tin của bạn" : currentGroup.Username}
                </p>
                <p className="text-white/60 text-[10px]">
                  {new Date(currentStory.CreatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-white cursor-pointer"
            >
              <X size={16} weight="bold" />
            </button>
          </div>
        </div>

        {/* ─── MAIN IMAGE ─── */}
        <div className="flex-1 relative overflow-hidden bg-stone-950">
          <img
            src={getApiUrl(currentStory.ImageUrl)}
            alt="Story"
            className="w-full h-full object-contain"
          />

          {/* Caption */}
          {currentStory.Caption && (
            <div className="absolute bottom-4 left-4 right-4 bg-black/60 backdrop-blur-sm text-white text-xs text-center px-3 py-2 rounded-2xl border border-white/10">
              {currentStory.Caption}
            </div>
          )}

          {/* Tap zones */}
          <button onClick={handlePrev} className="absolute left-0 top-0 bottom-0 w-1/3 cursor-pointer" />
          <button onClick={handleNext} className="absolute right-0 top-0 bottom-0 w-2/3 cursor-pointer" />
        </div>

        {/* ─── BOTTOM INTERACTION AREA ─── */}
        <div className="bg-gradient-to-t from-black/80 to-transparent p-3 pt-2 space-y-2">

          {/* Reaction Stats Button (only for story owner) */}
          {isOwnStory && reactions.length > 0 && (
            <button
              onClick={() => setShowReactionPanel(!showReactionPanel)}
              className="w-full flex items-center gap-2 bg-white/10 hover:bg-white/15 rounded-2xl px-3 py-2 cursor-pointer transition-colors"
            >
              <Heart size={14} className="text-rose-400" weight="fill" />
              <span className="text-white text-xs font-medium flex-1 text-left">
                {reactions.length} người đã thả cảm xúc
              </span>
              <div className="flex gap-1">
                {Object.entries(groupedReactions).slice(0, 3).map(([emoji, list]) => (
                  <span key={emoji} className="text-sm">{emoji}</span>
                ))}
              </div>
              <span className="text-white/50 text-xs">{showReactionPanel ? "▲" : "▼"}</span>
            </button>
          )}

          {/* Quick Emoji Reactions (for non-owner, not spam DM) */}
          {!isOwnStory && (
            <div className="flex justify-around items-center bg-white/10 backdrop-blur-md rounded-2xl py-2 px-3 border border-white/10">
              {["❤️", "😂", "😮", "😢", "🙏"].map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => handleReact(emoji)}
                  className={`text-2xl transition-transform cursor-pointer hover:scale-110 active:scale-125 ${
                    myReaction === emoji ? "scale-125 drop-shadow-lg" : ""
                  }`}
                  title={myReaction === emoji ? "Đã thả cảm xúc này" : "Thả cảm xúc"}
                >
                  {emoji}
                  {myReaction === emoji && (
                    <div className="w-1 h-1 bg-white rounded-full mx-auto mt-0.5" />
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Comment Reply → DM with story image context (non-owner only) */}
          {!isOwnStory && (
            <form onSubmit={handleSendComment} className="flex gap-2 items-center">
              <input
                type="text"
                placeholder={commentSent ? "✓ Đã gửi vào Trò chuyện!" : "Gửi tin nhắn riêng kèm ảnh Tin..."}
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onFocus={() => setIsPaused(true)}
                onBlur={() => { if (!commentText) setIsPaused(false); }}
                disabled={sendingComment || commentSent}
                className="flex-1 bg-white/15 focus:bg-white/20 border border-white/10 focus:outline-none rounded-full px-4 py-2.5 text-xs text-white placeholder-white/50 focus:ring-1 focus:ring-white/25 transition-all"
              />
              <button
                type="submit"
                disabled={sendingComment || !commentText.trim() || commentSent}
                className="w-9 h-9 rounded-full bg-coral-500 hover:bg-coral-600 disabled:opacity-50 text-white flex items-center justify-center cursor-pointer active:scale-95 transition-transform shrink-0"
              >
                <PaperPlaneRight size={16} weight="fill" />
              </button>
            </form>
          )}

          {/* Own story hint */}
          {isOwnStory && reactions.length === 0 && (
            <p className="text-center text-white/40 text-[10px] italic py-1">
              Chưa có ai tương tác với Tin này.
            </p>
          )}
        </div>

        {/* ─── REACTION STATS PANEL (slide up) ─── */}
        {showReactionPanel && (
          <div className="absolute inset-0 z-30 bg-black/80 backdrop-blur-sm flex flex-col justify-end">
            <div className="bg-stone-900 rounded-t-3xl p-4 max-h-[70%] overflow-y-auto border-t border-white/10">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-white font-bold text-sm flex items-center gap-2">
                  <Heart size={16} weight="fill" className="text-rose-400" />
                  Người đã xem & tương tác ({reactions.length})
                </h3>
                <button onClick={() => setShowReactionPanel(false)} className="text-white/60 hover:text-white cursor-pointer">
                  <X size={18} />
                </button>
              </div>

              {/* Emoji breakdown summary */}
              {Object.entries(groupedReactions).length > 0 && (
                <div className="flex gap-3 mb-4 flex-wrap">
                  {Object.entries(groupedReactions).map(([emoji, list]) => (
                    <div key={emoji} className="flex items-center gap-1 bg-white/10 rounded-full px-3 py-1">
                      <span className="text-base">{emoji}</span>
                      <span className="text-white text-xs font-bold">{list.length}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Individual list: grouped by user, 1 row per person */}
              {loadingReactions ? (
                <p className="text-white/50 text-xs text-center py-4">Đang tải...</p>
              ) : (
                <div className="space-y-2">
                  {/* Group by userId, show each person once with their emoji */}
                  {Object.values(
                    reactions.reduce((acc, r) => {
                      if (!acc[r.UserId]) {
                        acc[r.UserId] = { ...r, emojis: [r.EmojiType] };
                      } else {
                        acc[r.UserId].emojis.push(r.EmojiType);
                      }
                      return acc;
                    }, {})
                  ).map((r) => (
                    <div key={r.UserId} className="flex items-center gap-3 py-1.5 border-b border-white/5 last:border-0">
                      <img
                        src={r.AvatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${r.Username}`}
                        alt={r.Username}
                        className="w-9 h-9 rounded-full object-cover border border-white/10 shrink-0"
                      />
                      <span className="text-white text-xs font-medium flex-1 truncate">{r.Username}</span>
                      <div className="flex gap-0.5 shrink-0">
                        {r.emojis.map((e, i) => (
                          <span key={i} className="text-lg">{e}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Prev / Next arrow buttons */}
        <div className="absolute top-1/2 -translate-y-1/2 left-1 z-20 opacity-0 hover:opacity-100 transition-opacity">
          <button onClick={handlePrev} className="w-8 h-8 rounded-full bg-black/40 text-white flex items-center justify-center cursor-pointer">
            <CaretLeft size={16} weight="bold" />
          </button>
        </div>
        <div className="absolute top-1/2 -translate-y-1/2 right-1 z-20 opacity-0 hover:opacity-100 transition-opacity">
          <button onClick={handleNext} className="w-8 h-8 rounded-full bg-black/40 text-white flex items-center justify-center cursor-pointer">
            <CaretRight size={16} weight="bold" />
          </button>
        </div>
      </div>
    </div>
  );
}

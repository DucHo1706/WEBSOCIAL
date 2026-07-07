import React, { useState, useRef, useEffect } from "react";
import { apiRequest, getApiUrl } from "../api";
import StoryViewer from "./StoryViewer";
import StoryStrip from "./stories/StoryStrip";
import CreatePost from "./posts/CreatePost";
import PostCard from "./posts/PostCard";
import EditPostModal from "./posts/EditPostModal";
import CommentModal from "./comments/CommentModal";
import Lightbox from "./ui/Lightbox";
import RecapTimeline from "./ui/RecapTimeline";
import { Camera, Image as ImageIcon, Check, X, Tag, PaperPlaneRight, Sparkle, Airplane, Smiley, ChatCircle, Calendar, Heart, Globe, Users, Lock, DotsThreeVertical, PencilSimple, Trash } from "@phosphor-icons/react";

export default function Home({ user, group, recentMemories, onNewMemoryAdded, onTriggerRecap }) {
  // Relative time helper
  const getRelativeTime = (dateString) => {
    const now = new Date();
    const date = new Date(dateString);
    const diff = Math.floor((now - date) / 1000);
    if (diff < 5) return "Vừa xong";
    if (diff < 60) return `${diff} giây trước`;
    const mins = Math.floor(diff / 60);
    if (mins < 60) return `${mins} phút trước`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} giờ trước`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days} ngày trước`;
    const weeks = Math.floor(days / 7);
    if (weeks < 4) return `${weeks} tuần trước`;
    return date.toLocaleDateString("vi-VN", { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const [caption, setCaption] = useState("");
  const [category, setCategory] = useState("Đời Thường");
  const [privacy, setPrivacy] = useState("Public");
  const [activeFrame, setActiveFrame] = useState("polaroid"); // polaroid, sparkles, travel, none
  const [loading, setLoading] = useState(false);
  const [activeCommentMemoryId, setActiveCommentMemoryId] = useState(null);
  const [newCommentText, setNewCommentText] = useState("");
  const [loadingComments, setLoadingComments] = useState(false);

  // Edit/Delete Post States
  const [editingMemory, setEditingMemory] = useState(null);
  const [editCaption, setEditCaption] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editPrivacy, setEditPrivacy] = useState("");
  const [editingLoading, setEditingLoading] = useState(false);

  // Edit/Delete Comment States
  const [editingComment, setEditingComment] = useState(null);
  const [editCommentText, setEditCommentText] = useState("");
  const [replyToComment, setReplyToComment] = useState(null);
  const [openCommentMenuId, setOpenCommentMenuId] = useState(null);
  const [commentEmojiPickerId, setCommentEmojiPickerId] = useState(null); // {comment, memoryId}
  const [openMenuMemoryId, setOpenMenuMemoryId] = useState(null);

  // Edit image states
  const [editFile, setEditFile] = useState(null);
  const [editPreview, setEditPreview] = useState(null);

  // Floating hearts for double-tap reaction
  const [floatingHearts, setFloatingHearts] = useState([]);

  // Stories States
  const [stories, setStories] = useState([]);
  const [activeStoryGroupIdx, setActiveStoryGroupIdx] = useState(null);
  const [storyFile, setStoryFile] = useState(null);
  const [storyPreview, setStoryPreview] = useState(null);
  const [storyCaption, setStoryCaption] = useState("");
  const [uploadingStory, setUploadingStory] = useState(false);

  const fileInputRef = useRef(null);
  const storyInputRef = useRef(null);
  const editFileInputRef = useRef(null);

  const handleEditImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setEditFile(file);
      setEditPreview(URL.createObjectURL(file));
    }
  };

  // Multi-image state
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [previewUrls, setPreviewUrls] = useState([]);
  const [activeImageIndex, setActiveImageIndex] = useState({}); // memoryId -> index

  // Lightbox state
  const [lightboxImage, setLightboxImage] = useState(null);

  const fetchStories = async () => {
    try {
      const data = await apiRequest(`/api/story/active/${user.UserId}`);
      setStories(data || []);
    } catch (err) {
      console.error("Lỗi khi tải Stories:", err);
    }
  };

  useEffect(() => {
    fetchStories();
    window.refreshStoriesFeed = fetchStories;
    return () => {
      delete window.refreshStoriesFeed;
    };
  }, [user.UserId]);

  const handleStoryFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setStoryFile(file);
      setStoryPreview(URL.createObjectURL(file));
    }
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      setSelectedFiles(prev => [...prev, ...files]);
      const newUrls = files.map(f => URL.createObjectURL(f));
      setPreviewUrls(prev => [...prev, ...newUrls]);
    }
  };

  const removeSelectedFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setPreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  // Canvas Image Compression before uploading
  const compressImage = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          let width = img.width;
          let height = img.height;
          const MAX_WIDTH = 1000;
          const MAX_HEIGHT = 1000;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              resolve(new File([blob], file.name, { type: "image/jpeg", lastModified: Date.now() }));
            },
            "image/jpeg",
            0.75
          );
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!selectedFiles || selectedFiles.length === 0) return;

    setLoading(true);
    try {
      // Compress all images
      const compressedFiles = await Promise.all(selectedFiles.map(f => compressImage(f)));
      
      const formData = new FormData();
      compressedFiles.forEach(f => formData.append("Images", f));
      formData.append("Caption", caption);
      
      // Translate category to database standard
      let dbCategory = "Daily";
      if (category === "Sinh Nhật") dbCategory = "Birthday";
      if (category === "Du Lịch") dbCategory = "Travel";
      if (category === "Cột Mốc") dbCategory = "Milestone";

      formData.append("Category", dbCategory);
      formData.append("Privacy", privacy);
      formData.append("GroupId", group.GroupId);
      formData.append("UserId", user.UserId);

      const response = await apiRequest("/api/memory/upload", "POST", formData, true);
      onNewMemoryAdded(response);
      
      // Reset form
      setSelectedFiles([]);
      setPreviewUrls([]);
      setCaption("");
      setCategory("Đời Thường");
      setPrivacy("Public");
    } catch (err) {
      alert("Đăng kỷ niệm thất bại: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Edit post handlers
  const startEditing = (memory) => {
    setEditingMemory(memory);
    setEditCaption(memory.Caption || "");
    setEditCategory(memory.Category === "Birthday" ? "Sinh Nhật" : memory.Category === "Travel" ? "Du Lịch" : memory.Category === "Milestone" ? "Cột Mốc" : "Đời Thường");
    setEditPrivacy(memory.Privacy);
    setOpenMenuMemoryId(null);
    // Reset image state
    setEditFile(null);
    setEditPreview(null);
  };

  const cancelEditing = () => {
    setEditingMemory(null);
    setEditCaption("");
    setEditCategory("Đời Thường");
    setEditPrivacy("Public");
    setEditFile(null);
    if (editPreview) URL.revokeObjectURL(editPreview);
    setEditPreview(null);
  };

  const handleUpdateMemory = async (e) => {
    e.preventDefault();
    if (!editingMemory) return;
    setEditingLoading(true);
    try {
      const dbCategory = editCategory === "Sinh Nhật" ? "Birthday" : editCategory === "Du Lịch" ? "Travel" : editCategory === "Cột Mốc" ? "Milestone" : "Daily";
      
      // Use FormData if new image selected
      if (editFile) {
        const formData = new FormData();
        formData.append("UserId", user.UserId);
        formData.append("Caption", editCaption);
        formData.append("Category", dbCategory);
        formData.append("Privacy", editPrivacy);
        formData.append("Images", editFile);
        
        const updated = await apiRequest(`/api/memory/${editingMemory.MemoryId}`, "PUT", formData, true);
        onNewMemoryAdded(updated);
      } else {
        const updated = await apiRequest(`/api/memory/${editingMemory.MemoryId}`, "PUT", {
          userId: user.UserId,
          caption: editCaption,
          category: dbCategory,
          privacy: editPrivacy
        });
        onNewMemoryAdded(updated);
      }
      cancelEditing();
    } catch (err) {
      alert("Cập nhật thất bại: " + err.message);
    } finally {
      setEditingLoading(false);
    }
  };

  // Delete post handler
  const handleDeleteMemory = async (memoryId) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa bài viết này?")) return;
    try {
      await apiRequest(`/api/memory/${memoryId}?userId=${user.UserId}`, "DELETE");
      // Trigger a full feed refresh
      if (window.refreshFeed) window.refreshFeed();
      setOpenMenuMemoryId(null);
    } catch (err) {
      alert("Xóa bài viết thất bại: " + err.message);
    }
  };

  // Edit comment handler
  const startEditComment = (comment) => {
    setEditingComment(comment);
    setEditCommentText(comment.Text);
  };

  const cancelEditComment = () => {
    setEditingComment(null);
    setEditCommentText("");
  };

  const handleUpdateComment = async (e) => {
    e.preventDefault();
    if (!editingComment || !editCommentText.trim()) return;
    try {
      const updated = await apiRequest(`/api/memory/comment/${editingComment.CommentId}`, "PUT", {
        userId: user.UserId,
        text: editCommentText.trim()
      });
      // Update comment in local state (handles replies as well)
      const memory = recentMemories.find(m => m.MemoryId === editingComment.MemoryId);
      if (memory) {
        const updateCommentInList = (commentsList) => {
          return (commentsList || []).map(c => {
            if (c.CommentId === editingComment.CommentId) {
              return { ...c, Text: updated.Text };
            }
            if (c.Replies && c.Replies.length > 0) {
              return { ...c, Replies: updateCommentInList(c.Replies) };
            }
            return c;
          });
        };
        onNewMemoryAdded({
          ...memory,
          Comments: updateCommentInList(memory.Comments)
        });
      }
      cancelEditComment();
    } catch (err) {
      alert("Cập nhật bình luận thất bại: " + err.message);
    }
  };

  const handleEditCommentDirect = async (comment, newText) => {
    if (!newText.trim()) return;
    try {
      const updated = await apiRequest(`/api/memory/comment/${comment.CommentId}`, "PUT", {
        userId: user.UserId,
        text: newText.trim()
      });
      // Update comment in local state (handles replies as well)
      const memory = recentMemories.find(m => m.MemoryId === comment.MemoryId);
      if (memory) {
        const updateCommentInList = (commentsList) => {
          return (commentsList || []).map(c => {
            if (c.CommentId === comment.CommentId) {
              return { ...c, Text: updated.Text };
            }
            if (c.Replies && c.Replies.length > 0) {
              return { ...c, Replies: updateCommentInList(c.Replies) };
            }
            return c;
          });
        };
        onNewMemoryAdded({
          ...memory,
          Comments: updateCommentInList(memory.Comments)
        });
      }
    } catch (err) {
      alert("Cập nhật bình luận thất bại: " + err.message);
    }
  };

  const handleDeleteComment = async (commentId, memoryId) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa bình luận này?")) return;
    try {
      await apiRequest(`/api/memory/comment/${commentId}?userId=${user.UserId}`, "DELETE");
      // Remove comment from local state (handles replies as well)
      const memory = recentMemories.find(m => m.MemoryId === memoryId);
      if (memory) {
        const deleteCommentFromList = (commentsList) => {
          return (commentsList || [])
            .filter(c => c.CommentId !== commentId)
            .map(c => {
              if (c.Replies && c.Replies.length > 0) {
                return { ...c, Replies: deleteCommentFromList(c.Replies) };
              }
              return c;
            });
        };
        onNewMemoryAdded({
          ...memory,
          Comments: deleteCommentFromList(memory.Comments)
        });
      }
    } catch (err) {
      alert("Xóa bình luận thất bại: " + err.message);
    }
  };

  // Comment reaction toggle
  const handleCommentReaction = async (commentId, emojiType, memoryId) => {
    try {
      const data = await apiRequest("/api/memory/comment/react", "POST", {
        commentId,
        userId: user.UserId,
        emojiType
      });
      setCommentEmojiPickerId(null);

      // Find and update the memory comment reactions list locally
      const memory = recentMemories.find(m => m.MemoryId === memoryId);
      if (memory) {
        const updateCommentReactions = (commentsList) => {
          return (commentsList || []).map(c => {
            if (c.CommentId === commentId) {
              let updatedReactions = c.Reactions ? [...c.Reactions] : [];
              if (data.IsRemoved || data.isRemoved) {
                updatedReactions = updatedReactions.filter(r => 
                  !(r.User?.UserId === user.UserId && r.EmojiType === emojiType)
                );
              } else {
                updatedReactions.push({
                  CommentReactionId: data.ReactionId || data.reactionId,
                  EmojiType: emojiType,
                  User: { UserId: user.UserId, Username: user.Username }
                });
              }
              return { ...c, Reactions: updatedReactions };
            }
            if (c.Replies && c.Replies.length > 0) {
              return { ...c, Replies: updateCommentReactions(c.Replies) };
            }
            return c;
          });
        };
        onNewMemoryAdded({
          ...memory,
          Comments: updateCommentReactions(memory.Comments)
        });
      }
    } catch (err) {
      console.error("Comment react failed:", err);
    }
  };

  // Pin/unpin comment
  const handlePinToggleComment = async (commentId, currentlyPinned, memoryId) => {
    try {
      const endpoint = currentlyPinned 
        ? `/api/memory/comment/${commentId}/unpin?userId=${user.UserId}`
        : `/api/memory/comment/${commentId}/pin?userId=${user.UserId}`;
      await apiRequest(endpoint, "POST");
      setOpenCommentMenuId(null);

      // Update in local state
      const memory = recentMemories.find(m => m.MemoryId === memoryId);
      if (memory) {
        const updateCommentPin = (commentsList) => {
          return (commentsList || []).map(c => {
            if (c.CommentId === commentId) {
              return { ...c, IsPinned: !currentlyPinned, PinnedAt: !currentlyPinned ? new Date().toISOString() : null };
            }
            if (c.Replies && c.Replies.length > 0) {
              return { ...c, Replies: updateCommentPin(c.Replies) };
            }
            return c;
          });
        };
        onNewMemoryAdded({
          ...memory,
          Comments: updateCommentPin(memory.Comments)
        });
      }
    } catch (err) {
      console.error("Pin/unpin failed:", err);
    }
  };

  // Reply to comment
  const handleReplyComment = (comment, memoryId) => {
    setReplyToComment({ comment, memoryId });
    setActiveCommentMemoryId(memoryId);
    setNewCommentText("");
  };

  const cancelReply = () => {
    setReplyToComment(null);
  };

  // Share post handler
  const handleShareMemory = async (memoryId) => {
    try {
      const shared = await apiRequest("/api/memory/share", "POST", {
        userId: user.UserId,
        originalMemoryId: memoryId
      });
      onNewMemoryAdded(shared);
      alert("Đã chia sẻ bài viết lên Bảng Tin!");
    } catch (err) {
      alert("Chia sẻ thất bại: " + err.message);
    }
  };

  // Double-tap to react with heart
  const handleDoubleTapReaction = (memoryId) => {
    // Trigger heart reaction via the existing reaction handler
    handleReaction(memoryId, "❤️");
    // Spawn floating heart
    const id = Date.now();
    setFloatingHearts(prev => [...prev, { id, memoryId, x: 30 + Math.random() * 40, delay: 0 }]);
    setTimeout(() => {
      setFloatingHearts(prev => prev.filter(h => h.id !== id));
    }, 1200);
  };

  const cancelSelection = () => {
    setSelectedFiles([]);
    setPreviewUrls([]);
    setCaption("");
  };

  const handleStoryUpload = async (e) => {
    e.preventDefault();
    if (!storyFile) return;

    setUploadingStory(true);
    try {
      const compressedFile = await compressImage(storyFile);
      const formData = new FormData();
      formData.append("Image", compressedFile);
      formData.append("UserId", user.UserId);
      if (storyCaption.trim()) {
        formData.append("Caption", storyCaption.trim());
      }

      await apiRequest("/api/story/upload", "POST", formData, true);
      
      // Reset story state and refresh
      setStoryFile(null);
      setStoryPreview(null);
      setStoryCaption("");
      fetchStories();
    } catch (err) {
      alert("Đăng Tin thất bại: " + err.message);
    } finally {
      setUploadingStory(false);
    }
  };

  const handleAddComment = async (e, memoryId, commentText) => {
    e.preventDefault();
    const text = commentText || newCommentText;
    if (!text.trim()) return;

    setLoadingComments(true);
    try {
      const data = await apiRequest("/api/memory/comment", "POST", {
        memoryId,
        userId: user.UserId,
        text: text.trim()
      });
      
      // Update memory in local list
      const existingMemory = recentMemories.find(m => m.MemoryId === memoryId);
      if (existingMemory) {
        onNewMemoryAdded({
          ...existingMemory,
          Comments: [...(existingMemory.Comments || []), data]
        });
      }

      setNewCommentText("");
      cancelReply();
    } catch (err) {
      alert("Bình luận thất bại: " + err.message);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleReaction = async (memoryId, emoji) => {
    try {
      const data = await apiRequest("/api/memory/react", "POST", {
        memoryId,
        userId: user.UserId,
        emojiType: emoji
      });
      
      // Update reaction list locally
      const memory = recentMemories.find(m => m.MemoryId === memoryId);
      let updatedReactions = memory.Reactions ? [...memory.Reactions] : [];
      if (data.isRemoved) {
        updatedReactions = updatedReactions.filter(r => 
          !(r.User?.UserId === user.UserId && r.EmojiType === emoji)
        );
      } else {
        updatedReactions.push({
          ReactionId: data.reactionId,
          EmojiType: emoji,
          User: { UserId: user.UserId, Username: user.Username }
        });
      }

      onNewMemoryAdded({
        ...memory,
        Reactions: updatedReactions
      });
    } catch (err) {
      console.error("Failed to react:", err);
    }
  };

  const hasReacted = (reactions, emoji) => {
    return (reactions || []).some(r => r.User?.UserId === user.UserId && r.EmojiType === emoji);
  };

  const getReactionCount = (reactions, emoji) => {
    return (reactions || []).filter(r => r.EmojiType === emoji).length;
  };

  const getCategoryVietnamese = (cat) => {
    if (cat === "Birthday") return "🎂 Sinh Nhật";
    if (cat === "Travel") return "✈️ Du Lịch";
    if (cat === "Milestone") return "🏆 Cột Mốc";
    return "🏡 Đời Thường";
  };

  // Render a comment with nested replies
  return (
    <div className="pb-24 pt-4 px-4 max-w-md mx-auto">
      {/* Branding Header */}
      <div className="flex justify-between items-center mb-6 bg-white p-4 rounded-2xl border border-coral-100/40 shadow-xs">
        <div>
          <h2 className="font-display text-xl font-bold text-coral-500 flex items-center gap-1.5">
            <Sparkle size={20} weight="fill" className="text-coral-500 animate-pulse" />
            Sunlit Social
          </h2>
          <p className="text-[10px] text-stone-400 font-bold uppercase tracking-wider mt-0.5">
            Bảng Tin Cộng Đồng
          </p>
        </div>
        <img 
          src={user.AvatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${user.Username}`} 
          alt={user.Username} 
          className="w-8 h-8 rounded-full border border-coral-250 bg-stone-50"
        />
      </div>

      {/* Facebook-style Post Creator Box */}
      <div className="w-full bg-white rounded-3xl border border-coral-100/60 p-4 shadow-md shadow-coral-100/5 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <img 
            src={user.AvatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${user.Username}`} 
            alt={user.Username}
            className="w-10 h-10 rounded-full"
          />
          <button 
            type="button"
            onClick={() => fileInputRef.current.click()}
            className="flex-1 text-left px-4 py-2.5 bg-stone-100 hover:bg-stone-150 rounded-full text-xs font-semibold text-stone-500 cursor-pointer transition-colors"
          >
            Bạn đang nghĩ gì thế, {user.Username}?
          </button>
        </div>

        {previewUrls.length > 0 && (
          <div className="space-y-4 border-t border-stone-100 pt-4">
            {/* Multi-image Preview */}
            <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-stone-950 flex items-center justify-center border border-stone-200">
              <img 
                src={previewUrls[0]} 
                alt="Upload preview" 
                className="w-full h-full object-cover"
              />
              {previewUrls.length > 1 && (
                <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-1 rounded-full">
                  1/{previewUrls.length}
                </div>
              )}

              {activeFrame === "polaroid" && (
                <div className="absolute inset-0 border-[16px] border-b-[40px] border-white pointer-events-none drop-shadow-md">
                  <div className="absolute bottom-[-32px] left-2 right-2 text-center text-[9px] font-mono text-stone-400 uppercase tracking-widest">
                    Kỷ niệm {category}
                  </div>
                </div>
              )}

              {activeFrame === "sparkles" && (
                <div className="absolute inset-0 border-[12px] border-amber-300/40 pointer-events-none flex items-center justify-center">
                  <div className="absolute top-2 left-2 text-amber-500 animate-pulse"><Sparkle size={20} weight="fill" /></div>
                  <div className="absolute bottom-2 right-2 text-amber-500 animate-pulse"><Sparkle size={20} weight="fill" /></div>
                </div>
              )}

              {activeFrame === "travel" && (
                <div className="absolute inset-0 border-[12px] border-mint-500/20 pointer-events-none">
                  <div className="absolute bottom-3 left-3 bg-mint-500 text-white text-[8px] font-bold px-2 py-0.5 rounded uppercase tracking-wider flex items-center gap-1 shadow">
                    <Airplane size={8} /> Pass
                  </div>
                </div>
              )}
            </div>

            {/* Thumbnail strip */}
            {previewUrls.length > 1 && (
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {previewUrls.map((url, idx) => (
                  <div key={idx} className="relative flex-shrink-0">
                    <img src={url} alt="" className={`w-14 h-14 rounded-lg object-cover border-2 ${idx === 0 ? 'border-coral-500' : 'border-transparent'}`} />
                    <button 
                      type="button"
                      onClick={() => removeSelectedFile(idx)}
                      className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white rounded-full text-[8px] flex items-center justify-center cursor-pointer hover:bg-rose-600"
                    >
                      <X size={8} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Frame Options */}
            <div className="flex gap-2 justify-center">
              {["polaroid", "sparkles", "travel", "none"].map((frame) => (
                <button 
                  key={frame}
                  type="button"
                  onClick={() => setActiveFrame(frame)}
                  className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border cursor-pointer ${
                    activeFrame === frame ? "bg-stone-900 border-stone-900 text-white" : "border-stone-200 text-stone-600 hover:bg-stone-50"
                  }`}
                >
                  {frame === "polaroid" ? "Polaroid" : frame === "sparkles" ? "Lấp Lánh" : frame === "travel" ? "Du Lịch" : "Không Khung"}
                </button>
              ))}
            </div>

            <form onSubmit={handleUpload} className="space-y-3">
              <div>
                <textarea 
                  placeholder="Hãy viết vài lời tự sự về kỷ niệm này..."
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  rows={2}
                  className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-coral-500/20 focus:border-coral-500 text-stone-900 bg-stone-50/50 text-xs resize-none"
                />
              </div>

              {/* Category Selector */}
              <div className="flex items-center gap-2 flex-wrap">
                <Tag size={14} className="text-stone-400" />
                <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider mr-1">Danh mục:</span>
                {["Đời Thường", "Sinh Nhật", "Du Lịch", "Cột Mốc"].map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={`px-3 py-1 rounded-full text-[10px] font-semibold cursor-pointer ${
                      category === cat ? "bg-coral-500 text-white" : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Privacy Selector */}
              <div className="flex items-center gap-2 flex-wrap pt-1.5 border-t border-stone-100/50">
                <Globe size={14} className="text-stone-400" />
                <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider mr-1">Quyền xem:</span>
                {[
                  { id: "Public", text: "Công Khai", icon: <Globe size={10} /> },
                  { id: "Friends", text: "Bạn Bè", icon: <Users size={10} /> },
                  { id: "Private", text: "Chỉ Mình Tôi", icon: <Lock size={10} /> }
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setPrivacy(item.id)}
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold cursor-pointer flex items-center gap-1 transition-colors ${
                      privacy === item.id ? "bg-coral-500 text-white" : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                    }`}
                  >
                    {item.icon}
                    {item.text}
                  </button>
                ))}
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={cancelSelection}
                  className="flex-1 py-2 bg-stone-100 hover:bg-stone-200 text-stone-600 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all"
                >
                  <X size={14} /> Hủy Bỏ
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2 bg-coral-500 hover:bg-coral-600 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all shadow-md shadow-coral-500/10"
                >
                  {loading ? "Đang đăng..." : <><Check size={14} /> Chia Sẻ Kỷ Niệm</>}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      <input 
        type="file" 
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        multiple
        className="hidden"
      />
      {previewUrls.length > 0 && (
        <button
          type="button"
          onClick={() => fileInputRef.current.click()}
          className="text-[10px] font-semibold text-coral-500 hover:text-coral-600 bg-coral-50 px-3 py-1.5 rounded-full mt-2 cursor-pointer transition-colors"
        >
          + Thêm ảnh khác
        </button>
      )}

      <input 
        type="file" 
        ref={storyInputRef}
        onChange={handleStoryFileChange}
        accept="image/*"
        className="hidden"
      />

      {/* Lightbox component */}
      {lightboxImage && (
        <Lightbox imageUrl={lightboxImage} onClose={() => setLightboxImage(null)} />
      )}

      {/* Facebook-style Stories Recap Row */}
      <div className="flex gap-3 mb-6 overflow-x-auto pb-2 scrollbar-none">
        {/* Create Story Card */}
        <div 
          onClick={() => storyInputRef.current.click()}
          className="flex-shrink-0 w-24 h-36 rounded-2xl relative overflow-hidden bg-white border border-stone-200 shadow-sm cursor-pointer hover:scale-102 transition-transform flex flex-col justify-between group"
        >
          <div className="h-[70%] w-full overflow-hidden bg-stone-100">
            <img 
              src={user.AvatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${user.Username}`} 
              className="w-full h-full object-cover group-hover:scale-105 transition-transform" 
              alt={user.Username} 
            />
          </div>
          <div className="absolute bottom-[22%] left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-coral-500 text-white border-2 border-white flex items-center justify-center text-lg font-bold shadow-md">
            +
          </div>
          <div className="h-[30%] pt-2 text-center">
            <span className="text-[9px] font-bold text-stone-700">Tạo Tin</span>
          </div>
        </div>

        {/* Play Story Recap Bubble */}
        <button
          onClick={onTriggerRecap}
          className="flex-shrink-0 w-24 h-36 rounded-2xl relative overflow-hidden bg-gradient-to-tr from-coral-500 to-amber-400 border border-stone-150 flex flex-col justify-between p-3 text-left shadow-md hover:scale-102 active:scale-98 transition-all cursor-pointer group"
        >
          <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white border border-white/30 shadow-inner group-hover:scale-110 transition-transform">
            ▶️
          </div>
          <span className="text-[10px] font-bold text-white leading-tight drop-shadow-md">Xem lại Kỷ niệm</span>
        </button>

        {/* List of active stories grouped by user */}
        {stories.map((group, index) => {
          const firstItem = group.Items[0];
          return (
            <div
              key={group.UserId}
              onClick={() => setActiveStoryGroupIdx(index)}
              className="flex-shrink-0 w-24 h-36 rounded-2xl relative overflow-hidden border border-stone-100 shadow-sm cursor-pointer hover:scale-102 transition-transform group"
            >
              <img
                src={getApiUrl(firstItem.ImageUrl)}
                alt="Story"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-stone-900/65 via-stone-900/10 to-transparent pointer-events-none" />
              <img
                src={group.AvatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${group.Username}`}
                alt={group.Username}
                className="absolute top-2 left-2 w-6 h-6 rounded-full border-2 border-coral-500 shadow-md object-cover"
              />
              <span className="absolute bottom-2 left-2 text-[9px] font-bold text-white truncate max-w-[80px] drop-shadow-md">
                {group.UserId === user.UserId ? "Tin của bạn" : group.Username}
              </span>
            </div>
          );
        })}
      </div>

      {/* Story Upload Modal */}
      {storyPreview && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-6 z-55">
          <div className="w-full max-w-xs bg-white rounded-3xl p-5 shadow-xl border border-stone-100 space-y-4">
            <h3 className="font-display text-sm font-bold text-stone-900 flex items-center gap-1.5">
              📸 Tạo Tin Mới
            </h3>
            
            <div className="aspect-[3/4] rounded-2xl overflow-hidden bg-stone-950 border border-stone-255">
              <img src={storyPreview} alt="Story upload preview" className="w-full h-full object-cover" />
            </div>

            <form onSubmit={handleStoryUpload} className="space-y-3">
              <input 
                type="text"
                placeholder="Thêm chú thích cho tin (tùy chọn)..."
                value={storyCaption}
                onChange={(e) => setStoryCaption(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-stone-250 focus:outline-none focus:ring-2 focus:ring-coral-500/20 focus:border-coral-500 text-xs text-stone-900 placeholder-stone-400 bg-stone-50"
              />

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setStoryFile(null); setStoryPreview(null); setStoryCaption(""); }}
                  className="flex-1 py-2 bg-stone-100 hover:bg-stone-200 text-stone-600 rounded-xl text-xs font-semibold active:scale-95 transition-all cursor-pointer"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  disabled={uploadingStory}
                  className="flex-1 py-2 bg-coral-500 hover:bg-coral-600 text-white rounded-xl text-xs font-semibold active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1 shadow-md shadow-coral-500/10"
                >
                  {uploadingStory ? "Đang đăng..." : "Chia sẻ"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Story Viewer Modal */}
      {activeStoryGroupIdx !== null && (
        <StoryViewer
          user={user}
          storyGroups={stories}
          initialGroupIndex={activeStoryGroupIdx}
          onClose={() => setActiveStoryGroupIdx(null)}
        />
      )}

      {/* Main Facebook-Style Post Feed */}
      <div className="space-y-6">
        <h3 className="font-display text-lg font-bold text-stone-900 flex items-center gap-1.5">
          Bảng Tin Kỷ Niệm
        </h3>

        {recentMemories.length === 0 ? (
          <div className="text-center py-12 bg-white border border-stone-100 rounded-3xl p-6 text-stone-400 text-xs">
            Chưa có kỷ niệm nào được chia sẻ trong nhóm này. Hãy đăng tải khoảnh khắc đầu tiên!
          </div>
        ) : (
          recentMemories.map((memory) => {
            const memoryComments = memory.Comments || [];
            const memoryReactions = memory.Reactions || [];

            return (
              <div 
                key={memory.MemoryId}
                className="polaroid-card rounded-3xl overflow-hidden space-y-4 p-4"
              >
                {/* Post Header: User, Time, Category, Menu */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <img 
                      src={memory.User?.AvatarUrl} 
                      alt={memory.User?.Username}
                      className="w-8 h-8 rounded-full bg-coral-50"
                    />
                    <div>
                      <span className="text-xs font-bold text-stone-800 block">{memory.User?.Username}</span>
                      <span className="text-[9px] text-stone-400 block flex items-center gap-1 mt-0.5">
                        <Calendar size={10} />
                        {getRelativeTime(memory.CreatedAt)}
                        <span className="mx-0.5">•</span>
                        {memory.Privacy === "Private" ? (
                          <span className="flex items-center gap-0.5 text-stone-400" title="Chỉ mình tôi"><Lock size={10} /> Chỉ mình tôi</span>
                        ) : memory.Privacy === "Friends" ? (
                          <span className="flex items-center gap-0.5 text-stone-400" title="Bạn bè"><Users size={10} /> Bạn bè</span>
                        ) : (
                          <span className="flex items-center gap-0.5 text-stone-400" title="Công khai"><Globe size={10} /> Công khai</span>
                        )}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold text-coral-500 bg-coral-50">
                      {getCategoryVietnamese(memory.Category)}
                    </span>
                    {/* Three-dot menu for posts */}
                    <div className="relative">
                      <button
                        onClick={() => setOpenMenuMemoryId(openMenuMemoryId === memory.MemoryId ? null : memory.MemoryId)}
                        className="p-1.5 rounded-xl hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition-colors cursor-pointer"
                      >
                        <DotsThreeVertical size={18} weight="bold" />
                      </button>
                      {openMenuMemoryId === memory.MemoryId && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setOpenMenuMemoryId(null)} />
                          <div className="absolute right-0 top-full mt-1 bg-white dark:bg-[#1C1C1E] border border-custom rounded-2xl shadow-xl z-50 py-2 min-w-[150px]">
                            <button
                              onClick={() => handleShareMemory(memory.MemoryId)}
                              className="w-full px-4 py-2.5 text-xs font-semibold text-app hover:bg-stone-50 dark:hover:bg-stone-800 flex items-center gap-2 cursor-pointer transition-colors"
                            >
                              <PaperPlaneRight size={14} /> Chia sẻ bài viết
                            </button>
                            {memory.User?.UserId === user.UserId && (
                              <>
                                <button
                                  onClick={() => startEditing(memory)}
                                  className="w-full px-4 py-2.5 text-xs font-semibold text-app hover:bg-stone-50 dark:hover:bg-stone-800 flex items-center gap-2 cursor-pointer transition-colors"
                                >
                                  <PencilSimple size={14} /> Sửa bài viết
                                </button>
                                <button
                                  onClick={() => handleDeleteMemory(memory.MemoryId)}
                                  className="w-full px-4 py-2.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 flex items-center gap-2 cursor-pointer transition-colors"
                                >
                                  <Trash size={14} /> Xóa bài viết
                                </button>
                              </>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Caption text */}
                {memory.Caption && (
                  <p className="text-xs text-stone-700 leading-relaxed font-medium bg-stone-50/50 p-2.5 rounded-xl border border-stone-100">
                    {memory.Caption}
                  </p>
                )}

                {/* Main post photo - Carousel if multiple images */}
                <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-stone-900 border border-stone-200 group cursor-pointer" onClick={() => setLightboxImage(memory.Images?.[activeImageIndex[memory.MemoryId] || 0] || memory.ImageUrl)} onDoubleClick={(e) => { e.preventDefault(); handleDoubleTapReaction(memory.MemoryId); }}>
                  {memory.User?.UserId === user.UserId && (
                    <span className="absolute top-2 left-2 z-10 px-2 py-0.5 bg-black/50 backdrop-blur-sm text-white text-[9px] rounded-full">{memory.Privacy === "Private" ? "🔒" : memory.Privacy === "Friends" ? "👥" : "🌍"}</span>
                  )}
                  <img 
                    src={getApiUrl(memory.Images?.[activeImageIndex[memory.MemoryId] || 0] || memory.ImageUrl)} 
                    alt={memory.Caption}
                    className={`w-full h-full object-cover transition-all duration-700 ${
                      (activeImageIndex[memory.MemoryId] || 0) === 0 && memory.Category === "Birthday"
                        ? "grayscale-0 group-hover:grayscale-0" : ""
                    }`}
                  />
                  {/* Floating hearts for double-tap */}
                  {floatingHearts.filter(h => h.memoryId === memory.MemoryId).map(h => (
                    <div key={h.id} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none animate-float-up" style={{ left: `${h.x}%` }}>
                      ❤️
                    </div>
                  ))
                  .concat(
                    <div key={0} style={{display:'none'}} />
                  )}
                  {/* Image counter badge */}
                  {(memory.Images?.length || 0) > 1 && (
                    <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-1 rounded-full">
                      {((activeImageIndex[memory.MemoryId] || 0) + 1)}/{memory.Images.length}
                    </div>
                  )}
                  {/* Left/Right navigation arrows */}
                  {(memory.Images?.length || 0) > 1 && (
                    <>
                      <button
                        onClick={(e) => { e.stopPropagation(); setActiveImageIndex(prev => ({ ...prev, [memory.MemoryId]: Math.max(0, (prev[memory.MemoryId] || 0) - 1) })); }}
                        className="absolute left-1 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-sm"
                        disabled={(activeImageIndex[memory.MemoryId] || 0) === 0}
                      >‹</button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setActiveImageIndex(prev => ({ ...prev, [memory.MemoryId]: Math.min(memory.Images.length - 1, (prev[memory.MemoryId] || 0) + 1) })); }}
                        className="absolute right-1 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-sm"
                        disabled={(activeImageIndex[memory.MemoryId] || 0) >= memory.Images.length - 1}
                      >›</button>
                    </>
                  )}
                  {/* Dots indicator */}
                  {(memory.Images?.length || 0) > 1 && (
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                      {memory.Images.map((_, idx) => (
                        <button
                          key={idx}
                          onClick={(e) => { e.stopPropagation(); setActiveImageIndex(prev => ({ ...prev, [memory.MemoryId]: idx })); }}
                          className={`w-1.5 h-1.5 rounded-full transition-all cursor-pointer ${
                            idx === (activeImageIndex[memory.MemoryId] || 0) ? 'bg-white w-3' : 'bg-white/50'
                          }`}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Actions & Interactions */}
                <div className="flex items-center justify-between border-t border-stone-100 pt-3">
                  <div className="flex gap-1.5">
                    {["❤️", "🔥", "🎉", "😆"].map((emoji) => {
                      const active = hasReacted(memoryReactions, emoji);
                      const count = getReactionCount(memoryReactions, emoji);
                      return (
                        <button
                          key={emoji}
                          onClick={() => handleReaction(memory.MemoryId, emoji)}
                          className={`flex items-center gap-1 px-2 py-1 rounded-xl text-xs border transition-all cursor-pointer ${
                            active 
                              ? "bg-coral-50 border-coral-200 text-coral-500 font-bold" 
                              : "bg-stone-50 border-stone-150 text-stone-500 hover:bg-stone-100"
                          }`}
                        >
                          <span>{emoji}</span>
                          {count > 0 && <span className="text-[9px]">{count}</span>}
                        </button>
                      )})}
                    </div>

                  <div className="flex gap-1.5">
                    <button
                      onClick={() => setActiveCommentMemoryId(activeCommentMemoryId === memory.MemoryId ? null : memory.MemoryId)}
                      className="flex items-center gap-1 text-[10px] font-bold text-stone-500 hover:text-stone-800 px-2.5 py-1 rounded-xl bg-stone-50 hover:bg-stone-100 transition-colors cursor-pointer"
                    >
                      <ChatCircle size={14} />
                      <span>{memoryComments.length} bình luận</span>
                    </button>
                  </div>
                </div>

                {/* Edit Post Modal Overlay */}
                {editingMemory?.MemoryId === memory.MemoryId && (
                  <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={cancelEditing}>
                    <div className="bg-card-custom rounded-3xl p-5 w-full max-w-sm shadow-2xl border border-custom" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-sm font-bold text-app">✏️ Sửa bài viết</h4>
                        <button type="button" onClick={cancelEditing} className="p-1 hover:bg-stone-100 dark:hover:bg-[#2C2C2E] rounded-full cursor-pointer text-secondary-custom">
                          <X size={16} />
                        </button>
                      </div>
                      <form onSubmit={handleUpdateMemory} className="space-y-3">
                        <textarea
                          value={editCaption}
                          onChange={(e) => setEditCaption(e.target.value)}
                          rows={3}
                          className="w-full px-3 py-2 rounded-xl border border-custom focus:outline-none focus:ring-2 focus:ring-coral-500/20 text-xs bg-stone-50 dark:bg-[#2C2C2E] text-app resize-none"
                          placeholder="Nhập nội dung..."
                        />
                        {/* Image change */}
                        <input type="file" accept="image/*" ref={editFileInputRef} onChange={handleEditImageChange} className="hidden" />
                        <div className="flex items-center gap-2">
                          {editPreview ? (
                            <div className="relative w-16 h-16 rounded-xl overflow-hidden border border-custom">
                              <img src={editPreview} alt="" className="w-full h-full object-cover" />
                              <button type="button" onClick={() => { setEditFile(null); setEditPreview(null); }} className="absolute top-0.5 right-0.5 w-4 h-4 bg-black/60 text-white rounded-full flex items-center justify-center text-[8px]">
                                <X size={10} />
                              </button>
                            </div>
                          ) : (
                            <button type="button" onClick={() => editFileInputRef.current?.click()} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-100 dark:bg-[#2C2C2E] text-secondary-custom text-[10px] font-semibold cursor-pointer hover:bg-coral-50 dark:hover:bg-coral-500/10 transition-colors">
                              <ImageIcon size={14} />
                              Đổi ảnh
                            </button>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-bold text-secondary-custom">Danh mục:</span>
                          {["Đời Thường", "Sinh Nhật", "Du Lịch", "Cột Mốc"].map((cat) => (
                            <button key={cat} type="button" onClick={() => setEditCategory(cat)}
                              className={`px-2.5 py-1 rounded-full text-[9px] font-semibold cursor-pointer transition-colors ${
                                editCategory === cat ? "bg-coral-500 text-white" : "bg-stone-100 dark:bg-[#2C2C2E] text-app border border-custom"
                              }`}>{cat}</button>
                          ))}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-bold text-secondary-custom">Quyền xem:</span>
                          {[
                            { id: "Public", text: "🌍 Công Khai" },
                            { id: "Friends", text: "👥 Bạn Bè" },
                            { id: "Private", text: "🔒 Chỉ Mình Tôi" }
                          ].map((item) => (
                            <button key={item.id} type="button" onClick={() => setEditPrivacy(item.id)}
                              className={`px-2.5 py-1 rounded-full text-[9px] font-semibold cursor-pointer ${
                                editPrivacy === item.id ? "bg-coral-500 text-white" : "bg-stone-100 dark:bg-[#2C2C2E] text-app border border-custom"
                              }`}>{item.text}</button>
                          ))}
                        </div>
                        <div className="flex gap-2 pt-2">
                          <button type="button" onClick={cancelEditing}
                            className="flex-1 py-2 bg-stone-100 dark:bg-[#2C2C2E] border border-custom text-secondary-custom rounded-xl text-xs font-semibold cursor-pointer active:scale-95 transition-all">Hủy</button>
                          <button type="submit" disabled={editingLoading}
                            className="flex-1 py-2 bg-coral-500 text-white rounded-xl text-xs font-semibold cursor-pointer active:scale-95 transition-all shadow-md">
                            {editingLoading ? "Đang lưu..." : "💾 Lưu thay đổi"}
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}

                {/* Comment Modal */}
                {activeCommentMemoryId === memory.MemoryId && (
                  <CommentModal
                    memory={memory}
                    comments={memoryComments}
                    user={user}
                    onClose={() => { setActiveCommentMemoryId(null); cancelReply(); }}
                    onAddComment={(text) => handleAddComment({ preventDefault: () => {} }, memory.MemoryId, text)}
                    onEditComment={(comment, newText) => handleEditCommentDirect({ ...comment, MemoryId: memory.MemoryId }, newText)}
                    onDeleteComment={(id) => handleDeleteComment(id, memory.MemoryId)}
                    onPinToggle={(id, isPinned) => handlePinToggleComment(id, isPinned, memory.MemoryId)}
                    onReact={(id, emoji) => handleCommentReaction(id, emoji, memory.MemoryId)}
                    onReply={(comment) => handleReplyComment(comment, memory.MemoryId)}
                    replyToComment={replyToComment?.memoryId === memory.MemoryId ? replyToComment.comment : null}
                    cancelReply={cancelReply}
                    loading={loadingComments}
                    getRelativeTime={getRelativeTime}
                  />
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Edit Post Modal Overlay for Timeline/Profile links */}
    </div>
  );
}

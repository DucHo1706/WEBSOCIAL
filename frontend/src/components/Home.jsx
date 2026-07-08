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
      const updated = await apiRequest(`/api/comment/${editingComment.CommentId}`, "PUT", {
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
      const updated = await apiRequest(`/api/comment/${comment.CommentId}`, "PUT", {
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
      await apiRequest(`/api/comment/${commentId}?userId=${user.UserId}`, "DELETE");
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
              if (data.IsRemoved) {
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
      const parentId = replyToComment?.memoryId === memoryId ? replyToComment.comment.CommentId : null;
      
      const payload = {
        memoryId,
        userId: user.UserId,
        text: text.trim()
      };
      if (parentId) {
        payload.parentCommentId = parentId;
      }

      const data = await apiRequest(`/api/comment/${memoryId}`, "POST", payload);
      
      // Update memory in local list
      const existingMemory = recentMemories.find(m => m.MemoryId === memoryId);
      if (existingMemory) {
        let updatedComments = [...(existingMemory.Comments || [])];
        if (parentId) {
          const addReply = (list) => {
            return list.map(c => {
              if (c.CommentId === parentId) {
                return { ...c, Replies: [...(c.Replies || []), data] };
              }
              if (c.Replies && c.Replies.length > 0) {
                return { ...c, Replies: addReply(c.Replies) };
              }
              return c;
            });
          };
          updatedComments = addReply(updatedComments);
        } else {
          updatedComments.push(data);
        }
        
        onNewMemoryAdded({
          ...existingMemory,
          Comments: updatedComments
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
      const data = await apiRequest("/api/reaction/post", "POST", {
        memoryId,
        userId: user.UserId,
        emojiType: emoji
      });
      
      // Update reaction list locally (backend: toggle off if same emoji, switch if different)
      const memory = recentMemories.find(m => m.MemoryId === memoryId);
      let updatedReactions = memory.Reactions ? [...memory.Reactions] : [];
      
      // Remove ALL existing reactions by this user (backend clears them all first)
      updatedReactions = updatedReactions.filter(r => r.User?.UserId !== user.UserId);
      
      // If NOT removed (new reaction added), push it
      if (!data.IsRemoved) {
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

  return (
    <div className="pb-24 pt-4 px-4 max-w-md mx-auto">
      {/* Branding Header */}
      <div className="flex justify-between items-center mb-6 bg-white/80 dark:bg-stone-900/60 backdrop-blur-xl p-4 rounded-2xl border border-white/20 dark:border-stone-850/50 shadow-sm">
        <div>
          <h2 className="font-display text-xl font-bold text-coral-500 flex items-center gap-1.5">
            <Sparkle size={20} weight="fill" className="text-coral-500 animate-pulse" />
            Sunlit Social
          </h2>
          <p className="text-[10px] text-stone-400 dark:text-stone-500 font-bold uppercase tracking-wider mt-0.5">
            Bảng Tin Cộng Đồng
          </p>
        </div>
        <img 
          src={user.AvatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${user.Username}`} 
          alt={user.Username} 
          className="w-8 h-8 rounded-full border border-coral-200/50 bg-stone-50 shadow-sm"
        />
      </div>

      {/* Facebook-style Post Creator Box */}
      <div className="w-full bg-white/80 dark:bg-stone-900/60 backdrop-blur-xl rounded-3xl border border-white/20 dark:border-stone-800/80 p-4 shadow-md shadow-stone-100/5 dark:shadow-none mb-6">
        <div className="flex items-center gap-3">
          <img 
            src={user.AvatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${user.Username}`} 
            alt={user.Username}
            className="w-10 h-10 rounded-full border border-stone-200/50 dark:border-stone-800 shadow-sm object-cover"
          />
          <button 
            type="button"
            onClick={() => fileInputRef.current.click()}
            className="flex-1 text-left px-4 py-2.5 bg-stone-50 dark:bg-stone-950/40 border border-stone-200/50 dark:border-stone-850/50 rounded-full text-xs font-semibold text-stone-500 cursor-pointer transition-all hover:bg-stone-100 dark:hover:bg-stone-800"
          >
            Bạn đang nghĩ gì thế, {user.Username}?
          </button>
        </div>

        {previewUrls.length > 0 && (
          <div className="space-y-4 border-t border-stone-100 dark:border-stone-800/60 pt-4 mt-4">
            {/* Multi-image Preview */}
            <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-stone-950 flex items-center justify-center border border-stone-200/20">
              <img 
                src={previewUrls[0]} 
                alt="Upload preview" 
                className="w-full h-full object-cover select-none"
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
                <div className="absolute inset-0 border-[12px] border-emerald-500/20 pointer-events-none">
                  <div className="absolute bottom-3 left-3 bg-emerald-500 text-white text-[8px] font-bold px-2 py-0.5 rounded uppercase tracking-wider flex items-center gap-1 shadow">
                    <Airplane size={8} /> Pass
                  </div>
                </div>
              )}
            </div>

            {/* Thumbnail strip */}
            {previewUrls.length > 1 && (
              <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {previewUrls.map((url, idx) => (
                  <div key={idx} className="relative flex-shrink-0">
                    <img src={url} alt="" className={`w-14 h-14 rounded-lg object-cover border-2 ${idx === 0 ? 'border-coral-500' : 'border-transparent'}`} />
                    <button 
                      type="button"
                      onClick={() => removeSelectedFile(idx)}
                      className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white rounded-full text-[8px] flex items-center justify-center cursor-pointer hover:bg-rose-600 border border-white/20"
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
                  className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-colors cursor-pointer ${
                    activeFrame === frame 
                      ? "bg-stone-900 dark:bg-stone-100 border-stone-900 dark:border-stone-100 text-white dark:text-stone-900" 
                      : "border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-850"
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
                  className="w-full px-4 py-3 rounded-xl border border-stone-200 dark:border-stone-800 focus:outline-none focus:ring-2 focus:ring-coral-500/20 focus:border-coral-500 text-stone-900 dark:text-stone-100 bg-stone-50/50 dark:bg-stone-950/40 text-xs resize-none"
                />
              </div>

              {/* Category Selector */}
              <div className="flex items-center gap-2 flex-wrap">
                <Tag size={14} className="text-stone-400" />
                <span className="text-[10px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider mr-1">Danh mục:</span>
                {["Đời Thường", "Sinh Nhật", "Du Lịch", "Cột Mốc"].map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={`px-3 py-1 rounded-full text-[10px] font-semibold transition-all cursor-pointer ${
                      category === cat 
                        ? "bg-coral-500 text-white shadow-sm" 
                        : "bg-stone-100 dark:bg-stone-950/40 border border-stone-200/25 dark:border-stone-800/60 text-stone-600 dark:text-stone-400 hover:bg-stone-200"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Privacy Selector */}
              <div className="flex items-center gap-2 flex-wrap pt-1.5 border-t border-stone-100/50 dark:border-stone-800/60">
                <Globe size={14} className="text-stone-400" />
                <span className="text-[10px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider mr-1">Quyền xem:</span>
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
                      privacy === item.id 
                        ? "bg-coral-500 text-white shadow-sm" 
                        : "bg-stone-100 dark:bg-stone-950/40 border border-stone-200/25 dark:border-stone-800/60 text-stone-600 dark:text-stone-400 hover:bg-stone-200"
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
                  className="flex-1 py-2 bg-stone-50 dark:bg-stone-950/40 border border-stone-200/50 dark:border-stone-800/80 text-stone-600 dark:text-stone-400 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all"
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
          className="text-[10px] font-semibold text-coral-500 hover:text-coral-600 bg-coral-50 dark:bg-coral-500/10 px-3 py-1.5 rounded-full mt-2 cursor-pointer transition-colors"
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

      {/* Modern Stories Recap Row */}
      <StoryStrip
        user={user}
        stories={stories}
        onStoryClick={setActiveStoryGroupIdx}
        onAddStory={() => storyInputRef.current.click()}
        uploadingStory={uploadingStory}
        onTriggerRecap={onTriggerRecap}
      />

      {/* Story Upload Modal */}
      {storyPreview && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-6 z-55">
          <div className="w-full max-w-xs bg-white dark:bg-stone-900 rounded-3xl p-5 shadow-xl border border-stone-100 dark:border-stone-800 space-y-4">
            <h3 className="font-display text-sm font-bold text-stone-900 dark:text-stone-150 flex items-center gap-1.5">
              📸 Tạo Tin Mới
            </h3>
            
            <div className="aspect-[3/4] rounded-2xl overflow-hidden bg-stone-950 border border-stone-200/20">
              <img src={storyPreview} alt="Story upload preview" className="w-full h-full object-cover select-none" />
            </div>

            <form onSubmit={handleStoryUpload} className="space-y-3">
              <input 
                type="text"
                placeholder="Thêm chú thích cho tin (tùy chọn)..."
                value={storyCaption}
                onChange={(e) => setStoryCaption(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-stone-200 dark:border-stone-800 focus:outline-none focus:ring-2 focus:ring-coral-500/20 focus:border-coral-500 text-xs text-stone-900 dark:text-stone-100 placeholder-stone-400 bg-stone-50 dark:bg-stone-950"
              />

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setStoryFile(null); setStoryPreview(null); setStoryCaption(""); }}
                  className="flex-1 py-2 bg-stone-50 dark:bg-stone-950/40 border border-stone-200/50 dark:border-stone-800/80 text-stone-600 dark:text-stone-400 rounded-xl text-xs font-semibold active:scale-95 transition-all cursor-pointer"
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
          onStoryDeleted={fetchStories}
        />
      )}

      {/* Main Post Feed */}
      <div className="space-y-6">
        <h3 className="font-display text-sm font-bold text-stone-800 dark:text-stone-200 flex items-center gap-1.5 uppercase tracking-wider">
          Bảng Tin Kỷ Niệm
        </h3>

        {recentMemories.length === 0 ? (
          <div className="text-center py-12 bg-white/80 dark:bg-stone-900/60 backdrop-blur-xl border border-custom rounded-3xl p-6 text-stone-400 text-xs">
            Chưa có kỷ niệm nào được chia sẻ trong nhóm này. Hãy đăng tải khoảnh khắc đầu tiên!
          </div>
        ) : (
          recentMemories.map((memory) => (
            <PostCard
              key={memory.MemoryId}
              memory={memory}
              user={user}
              menuOpenId={openMenuMemoryId}
              onToggleMenu={setOpenMenuMemoryId}
              onShare={handleShareMemory}
              onEdit={startEditing}
              onDelete={handleDeleteMemory}
              onCommentClick={setActiveCommentMemoryId}
              onImageClick={setLightboxImage}
              onDoubleTapReact={handleReaction}
              getReaction={hasReacted}
              getCount={getReactionCount}
            />
          ))
        )}
      </div>

      {/* Edit Post Modal Overlay */}
      {editingMemory && (
        <EditPostModal
          memory={editingMemory}
          user={user}
          editText={editCaption}
          onTextChange={setEditCaption}
          onImageChange={setEditFile}
          category={editCategory}
          onCategoryChange={setEditCategory}
          privacy={editPrivacy}
          onPrivacyChange={setEditPrivacy}
          onUpdate={handleUpdateMemory}
          onCancel={cancelEditing}
          loading={editingLoading}
        />
      )}

      {/* Comment Modal Overlay */}
      {activeCommentMemoryId && (
        <CommentModal
          memory={recentMemories.find(m => m.MemoryId === activeCommentMemoryId)}
          comments={recentMemories.find(m => m.MemoryId === activeCommentMemoryId)?.Comments || []}
          user={user}
          onClose={() => { setActiveCommentMemoryId(null); cancelReply(); }}
          onAddComment={(text) => handleAddComment({ preventDefault: () => {} }, activeCommentMemoryId, text)}
          onEditComment={(comment, newText) => handleEditCommentDirect({ ...comment, MemoryId: activeCommentMemoryId }, newText)}
          onDeleteComment={(id) => handleDeleteComment(id, activeCommentMemoryId)}
          onPinToggle={(id, isPinned) => handlePinToggleComment(id, isPinned, activeCommentMemoryId)}
          onReact={(id, emoji) => handleCommentReaction(id, emoji, activeCommentMemoryId)}
          onReply={(comment) => handleReplyComment(comment, activeCommentMemoryId)}
          replyToComment={replyToComment?.memoryId === activeCommentMemoryId ? replyToComment.comment : null}
          cancelReply={cancelReply}
          loading={loadingComments}
          getRelativeTime={getRelativeTime}
        />
      )}
    </div>
  );
}

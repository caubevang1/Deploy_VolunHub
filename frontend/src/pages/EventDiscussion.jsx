import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { GetEventDetail } from "../services/EventService";
import {
  GetEventPosts,
  CreatePost,
  ToggleLikePost,
  DeletePost,
} from "../services/PostService";
import { GetUserInfo } from "../services/UserService";
import {
  GetPostComments,
  CreateComment,
  ToggleLikeComment,
  DeleteComment,
} from "../services/CommentService";
import {
  Heart,
  Send,
  Trash2,
  ArrowLeft,
  MessageSquare,
  Smile,
  Calendar,
  MapPin,
  Users,
  MoreVertical,
  Image as ImageIcon,
  Loader,
  CheckCircle2,
  Clock,
  Award,
} from "lucide-react";
import Swal from "sweetalert2";
import EmojiPicker from "emoji-picker-react";
import "../styles/EventDiscussion.css";

// =========================================================================
// COMMENT SECTION COMPONENT
// =========================================================================
function CommentSection({
  post,
  currentUser,
  fetchCommentsForPost,
  commentsMap,
  setCommentsMap,
  fetchPosts,
}) {
  const [newComment, setNewComment] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const commentInputRef = useRef(null);

  const postId = post.id;
  const comments = commentsMap[postId] || [];

  // Xử lý chọn emoji cho comment
  const handleEmojiClick = (emojiObject) => {
    setNewComment((prev) => prev + emojiObject.emoji);
    setShowEmojiPicker(false);
    commentInputRef.current?.focus();
  };

  // Tự động fetch comments khi click vào icon
  const handleToggleComments = () => {
    if (commentsMap[postId] === undefined && post.commentCount > 0) {
      fetchCommentsForPost(postId);
    }
  };

  const handleCreateComment = async () => {
    if (!newComment.trim()) return;

    try {
      const res = await CreateComment(postId, newComment);
      if (res.status === 201) {
        // Cập nhật state comments
        setCommentsMap((prev) => ({
          ...prev,
          [postId]: [res.data, ...comments],
        }));
        setNewComment("");
        // Cập nhật lại post list để hiển thị commentCount mới
        fetchPosts();
      }
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Bình luận thất bại",
        text: err.response?.data?.message || "Có lỗi xảy ra",
        confirmButtonColor: "#DDB958",
      });
    }
  };

  // Xử lý nhấn phím (cho phép gửi bằng Enter)
  const handleInputKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleCreateComment();
    }
  };

  const handleDeleteComment = async (commentId) => {
    const result = await Swal.fire({
      title: "Xác nhận xóa bình luận?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#DDB958",
      confirmButtonText: "Xóa",
      cancelButtonText: "Hủy",
    });

    if (result.isConfirmed) {
      try {
        await DeleteComment(commentId);

        // Cập nhật state comments (xóa khỏi danh sách)
        setCommentsMap((prev) => ({
          ...prev,
          [postId]: comments.filter((c) => c.id !== commentId),
        }));

        // Cập nhật lại post list để hiển thị commentCount mới (giảm 1)
        fetchPosts();

        Swal.fire({
          icon: "success",
          title: "Đã xóa bình luận",
          timer: 1500,
          showConfirmButton: false,
        });
      } catch (err) {
        Swal.fire({
          icon: "error",
          title: "Xóa thất bại",
          text: err.response?.data?.message || "Có lỗi xảy ra",
          confirmButtonColor: "#DDB958",
        });
      }
    }
  };

  const handleToggleLike = async (commentId) => {
    setCommentsMap((prev) => ({
      ...prev,
      [postId]: comments.map((c) => {
        if (c.id === commentId) {
          const currentlyLiked = c.likes?.includes(currentUser.id);
          return {
            ...c,
            likes: currentlyLiked
              ? c.likes.filter((id) => id !== currentUser.id)
              : [...(c.likes || []), currentUser.id],
          };
        }
        return c;
      }),
    }));

    try {
      await ToggleLikeComment(commentId);
    } catch (err) {
      console.error("Lỗi like comment:", err);
      // Tải lại dữ liệu chuẩn nếu lỗi
      const refreshRes = await GetPostComments(postId);
      setCommentsMap((prev) => ({ ...prev, [postId]: refreshRes.data }));
    }
  };

  return (
    <div className="comment-section-wrapper">
      <div className="mb-4">
        <div
          className="flex gap-2 items-center text-gray-500 cursor-pointer hover:text-blue-600"
          onClick={handleToggleComments}
        >
          <MessageSquare size={18} />
          <span>{post.commentCount || 0} Bình luận</span>
        </div>
      </div>

      {/* Form Comment */}
      <div className="comment-input-area">
        <img
          src={currentUser?.avatar || "/default-avatar.png"}
          alt="Avatar"
          className="w-8 h-8 rounded-full object-cover mt-1"
        />
        <div className="flex-1 relative">
          <div className="flex gap-2">
            <input
              ref={commentInputRef}
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={handleInputKeyDown}
              placeholder="Viết bình luận..."
              className="flex-1 border border-gray-300 rounded-full px-4 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#DDB958]"
            />
            <button
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="text-gray-500 hover:text-[#DDB958] transition"
              title="Thêm emoji"
            >
              <Smile size={20} />
            </button>
            <button
              onClick={handleCreateComment}
              className="comment-send-button transition"
              title="Gửi bình luận"
            >
              <Send size={20} />
            </button>
          </div>
          {showEmojiPicker && (
            <div className="absolute top-12 right-0 z-50 shadow-2xl">
              <EmojiPicker onEmojiClick={handleEmojiClick} />
            </div>
          )}
        </div>
      </div>

      {/* Danh sách Comments */}
      {commentsMap[postId] !== undefined && comments.length > 0 && (
        <div className="comment-list">
          {comments.map((comment) => {
            const isLiked = comment.likes?.includes(currentUser?.id);
            const canDelete =
              currentUser?.role === "ADMIN" ||
              comment.author?.id === currentUser?.id;

            return (
              <div key={comment.id} className="text-sm">
                {" "}
                {/* SỬA: Dùng id làm key */}
                <div className="flex items-start gap-2">
                  <img
                    src={comment.author?.avatar || "/default-avatar.png"}
                    alt={comment.author?.name}
                    className="w-7 h-7 rounded-full object-cover mt-1"
                  />
                  <div className="flex-1">
                    <div className="comment-bubble">
                      <p className="font-semibold text-gray-800">
                        {comment.author?.name || "Người dùng"}
                      </p>
                      <p className="text-gray-700">{comment.content}</p>
                    </div>
                    <div className="comment-meta flex items-center gap-3 text-xs">
                      <span
                        className="cursor-pointer hover:text-blue-500"
                        onClick={() => handleToggleLike(comment.id)}
                      >
                        {isLiked ? "Bỏ thích" : "Thích"}
                      </span>
                      {comment.likes?.length > 0 && (
                        <span>| {comment.likes?.length} Thích</span>
                      )}
                      {canDelete && (
                        <span
                          className="delete-link cursor-pointer hover:text-red-500"
                          onClick={() => handleDeleteComment(comment.id)}
                        >
                          | Xóa
                        </span>
                      )}
                      <span className="ml-auto">
                        {new Date(comment.createdAt).toLocaleString("vi-VN", {
                          timeStyle: "short",
                          dateStyle: "short",
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
// =========================================================================
// EVENT DISCUSSION MAIN COMPONENT
// =========================================================================

export default function EventDiscussion() {
  const { eventId } = useParams();
  const navigate = useNavigate();

  const [event, setEvent] = useState(null);
  const [posts, setPosts] = useState([]);
  const [newPost, setNewPost] = useState("");
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [canAccess, setCanAccess] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [visibleComments, setVisibleComments] = useState({});
  const [openMenuPostId, setOpenMenuPostId] = useState(null);

  const [commentsMap, setCommentsMap] = useState({});
  const postInputRef = useRef(null);

  // Song song fetch user và event
  useEffect(() => {
    let mounted = true;

    async function loadData() {
      setLoading(true);
      try {
        // Parallel fetch user and event
        const [userRes, eventRes] = await Promise.allSettled([
          GetUserInfo(),
          GetEventDetail(eventId),
        ]);

        if (!mounted) return;

        // Handle user
        if (userRes.status === "fulfilled" && userRes.value?.data) {
          setCurrentUser(userRes.value.data);
        }

        // Handle event
        if (eventRes.status === "fulfilled" && eventRes.value?.data) {
          const eventData = eventRes.value.data;
          setEvent(eventData);

          const user = userRes.value?.data;
          // Admin or approved event
          if (user?.role === "ADMIN" || eventData.status === "approved") {
            setCanAccess(true);
            // Fetch posts immediately
            try {
              const postsRes = await GetEventPosts(eventId);
              if (postsRes.status === 200 && mounted) {
                setPosts(postsRes.data);
              }
            } catch (err) {
              console.error("Lỗi lấy bài viết:", err);
            }
          } else {
            Swal.fire({
              icon: "warning",
              title: "Không thể truy cập",
              text: "Kênh trao đổi chỉ khả dụng khi sự kiện đã được duyệt.",
              confirmButtonColor: "#DDB958",
            });
            navigate(-1);
          }
        } else if (eventRes.status === "rejected") {
          const err = eventRes.reason;
          if (err?.response?.status === 403) {
            Swal.fire({
              icon: "error",
              title: "Không có quyền",
              text: "Bạn phải là thành viên đã được duyệt để truy cập kênh này.",
              confirmButtonColor: "#DDB958",
            });
            navigate(-1);
          }
        }
      } catch (err) {
        console.error("Lỗi tải dữ liệu:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadData();
    return () => {
      mounted = false;
    };
  }, [eventId, navigate]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (openMenuPostId && !event.target.closest(".menu-container")) {
        setOpenMenuPostId(null);
      }
    };

    if (openMenuPostId) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [openMenuPostId]);

  // Format ngày giờ
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "";

    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Vừa xong";
    if (diffMins < 60) return `${diffMins} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    if (diffDays < 7) return `${diffDays} ngày trước`;

    return date.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  // Format ngày sự kiện (hiển thị ngày đầy đủ thay vì relative)
  const formatEventDate = (dateString) => {
    if (!dateString) return "Chưa cập nhật";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "";
    return date.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  // Xử lý chọn emoji cho post
  const handleEmojiClick = (emojiObject) => {
    setNewPost((prev) => prev + emojiObject.emoji);
    setShowEmojiPicker(false);
    postInputRef.current?.focus();
  };

  // Toggle comment section visibility
  const toggleCommentSection = (postId) => {
    setVisibleComments((prev) => ({
      ...prev,
      [postId]: !prev[postId],
    }));

    // Fetch comments nếu chưa có
    if (commentsMap[postId] === undefined) {
      fetchCommentsForPost(postId);
    }
  };

  // Fetch Comments cho 1 Post
  const fetchCommentsForPost = async (postId, force = false) => {
    if (!force && commentsMap[postId] !== undefined) return;

    try {
      const res = await GetPostComments(postId);
      if (res.status === 200) {
        setCommentsMap((prev) => ({
          ...prev,
          [postId]: res.data,
        }));
      }
    } catch (err) {
      console.error("Lỗi lấy comments:", err);
    }
  };

  // Fetch Posts để reload data
  const fetchPosts = async () => {
    try {
      const res = await GetEventPosts(eventId);
      if (res.status === 200) {
        setPosts(res.data);
      }
    } catch (err) {
      console.error("Lỗi lấy bài viết:", err);
    }
  };

  const handleCreatePost = async () => {
    if (!newPost.trim()) {
      Swal.fire({
        icon: "warning",
        title: "Thiếu nội dung",
        text: "Vui lòng nhập nội dung bài viết.",
        confirmButtonColor: "#DDB958",
        toast: true,
        position: "top-end",
        timer: 2000,
        showConfirmButton: false,
      });
      return;
    }

    setIsPosting(true);
    try {
      const res = await CreatePost(eventId, newPost);
      if (res.status === 201) {
        setPosts([res.data, ...posts]);
        setNewPost("");
        Swal.fire({
          icon: "success",
          title: "Đăng bài thành công",
          toast: true,
          position: "top-end",
          timer: 2000,
          showConfirmButton: false,
        });
      }
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Đăng bài thất bại",
        text: err.response?.data?.message || "Có lỗi xảy ra",
        confirmButtonColor: "#DDB958",
      });
    } finally {
      setIsPosting(false);
    }
  };

  const handleToggleLike = async (postId) => {
    // Optimistic Update
    setPosts((prevPosts) =>
      prevPosts.map((post) => {
        if (post.id === postId) {
          const currentlyLiked = post.likes?.includes(currentUser.id);
          return {
            ...post,
            likes: currentlyLiked
              ? post.likes.filter((id) => id !== currentUser.id) // Unlike
              : [...(post.likes || []), currentUser.id], // Like
          };
        }
        return post;
      })
    );

    // Gọi API ở background
    try {
      await ToggleLikePost(postId);
    } catch (err) {
      console.error("Lỗi like post:", err);
      fetchPosts(); // Rollback bằng cách tải lại
    }
  };

  const handleDeletePost = async (postId) => {
    const result = await Swal.fire({
      title: "Xác nhận xóa bài viết?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#DDB958",
      confirmButtonText: "Xóa",
      cancelButtonText: "Hủy",
    });

    if (result.isConfirmed) {
      try {
        await DeletePost(postId);
        setPosts(posts.filter((post) => post.id !== postId));
        // Xóa luôn comments của post này khỏi state
        setCommentsMap((prev) => {
          const newMap = { ...prev };
          delete newMap[postId];
          return newMap;
        });

        Swal.fire({
          icon: "success",
          title: "Đã xóa bài viết",
          timer: 1500,
          showConfirmButton: false,
        });
      } catch (err) {
        Swal.fire({
          icon: "error",
          title: "Xóa thất bại",
          text: err.response?.data?.message || "Có lỗi xảy ra",
          confirmButtonColor: "#DDB958",
        });
      }
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  if (!event || !canAccess) return null;

  return (
    <div className="max-w-4xl mx-auto min-h-screen discussion-container">
      {/* Header */}
      <div className="discussion-header">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-800 mb-4 transition-colors"
        >
          <ArrowLeft size={20} />
          <span>Quay lại</span>
        </button>

        {/* Event Info Card */}
        <div className="event-info-card shadow-lg rounded-2xl overflow-hidden border border-gray-100">
          <div className="event-cover-image relative h-48 sm:h-64">
            <img
              src={
                event.coverImage
                  ? `http://localhost:5000${event.coverImage}`
                  : "/default-event.png"
              }
              alt={event.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute top-4 right-4">
              {event.status === "approved" && (
                <span className="status-badge status-approved bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-sm">
                  <CheckCircle2 size={14} />
                  Đã duyệt
                </span>
              )}
            </div>
          </div>

          <div className="event-info-content p-6 bg-white">
            <div className="flex items-start justify-between gap-3 mb-4">
              <h1 className="text-2xl font-bold text-gray-900 flex-1">
                {event.name}
              </h1>
            </div>

            <div className="event-meta-line flex flex-wrap gap-y-2 gap-x-4 items-center">
              <div className="flex items-center gap-1.5 bg-blue-50 px-3 py-1 rounded-lg">
                <Calendar size={14} className="text-blue-500" />
                <span className="text-xs text-blue-700 font-medium">
                  {formatEventDate(event.date)} -{" "}
                  {formatEventDate(event.endDate)}
                </span>
              </div>
              <div className="flex items-center gap-1.5 bg-red-50 px-3 py-1 rounded-lg">
                <MapPin size={14} className="text-red-500" />
                <span className="text-xs text-red-700 font-medium">
                  {event.location}
                </span>
              </div>
              <div className="flex items-center gap-1.5 bg-green-50 px-3 py-1 rounded-lg">
                <Users size={14} className="text-green-500" />
                <span className="text-xs text-green-700 font-medium">
                  {event.maxParticipants} người
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Composer - Post Form */}
      <div className="composer-card bg-white mt-8 p-6 rounded-2xl shadow-md border border-gray-50">
        <div className="composer-header flex items-center gap-3 mb-4">
          <img
            src={currentUser?.avatar || "/default-avatar.png"}
            alt={currentUser?.name}
            className="w-10 h-10 rounded-full object-cover ring-2 ring-blue-50"
          />
          <div className="flex-1">
            <p className="font-semibold text-gray-900 text-sm">
              {currentUser?.name}
            </p>
            <p className="text-xs text-gray-400">Chia sẻ cập nhật sự kiện</p>
          </div>
        </div>

        <div className="composer-body">
          <textarea
            ref={postInputRef}
            value={newPost}
            onChange={(e) => setNewPost(e.target.value)}
            placeholder={`${currentUser?.name || "Bạn"
              } ơi, viết cập nhật cho sự kiện này...`}
            className="composer-textarea w-full p-4 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-blue-100 transition-all text-gray-700 placeholder-gray-400"
            rows="3"
            disabled={isPosting}
          />
        </div>

        <div className="composer-footer flex items-center justify-between mt-4">
          <div className="composer-actions flex gap-2">
            <button
              className="composer-action-btn flex items-center gap-1.5 px-3 py-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600"
              title="Thêm ảnh"
              disabled={isPosting}
            >
              <ImageIcon size={20} className="text-green-500" />
              <span className="text-sm font-medium">Ảnh</span>
            </button>
            <button
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="composer-action-btn flex items-center gap-1.5 px-3 py-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600"
              title="Thêm biểu tượng cảm xúc"
              disabled={isPosting}
            >
              <Smile size={20} className="text-yellow-500" />
              <span className="text-sm font-medium">Cảm xúc</span>
            </button>
          </div>

          <button
            onClick={handleCreatePost}
            disabled={!newPost.trim() || isPosting}
            className="composer-submit-btn flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-200 transition-all disabled:opacity-50 disabled:shadow-none"
          >
            {isPosting ? (
              <>
                <Loader size={18} className="animate-spin" />
                <span>Đang đăng...</span>
              </>
            ) : (
              <>
                <Send size={18} />
                <span>Đăng bài</span>
              </>
            )}
          </button>
        </div>

        {showEmojiPicker && (
          <div className="emoji-picker-wrapper absolute z-50 mt-2 shadow-2xl">
            <EmojiPicker onEmojiClick={handleEmojiClick} />
          </div>
        )}
      </div>

      {/* Feed - Danh sách bài viết */}
      <div className="feed-container mt-8 pb-20 space-y-6">
        {posts.length === 0 ? (
          <div className="empty-state bg-white py-16 rounded-2xl border-2 border-dashed border-gray-100 flex flex-col items-center">
            <MessageSquare size={64} className="text-gray-200 mb-4" />
            <h3 className="text-xl font-bold text-gray-400 mb-2">
              Chưa có bài viết nào
            </h3>
            <p className="text-gray-400 text-sm">
              Hãy là người đầu tiên chia sẻ cập nhật!
            </p>
          </div>
        ) : (
          posts.map((post) => {
            const isLiked = post.likes?.includes(currentUser?.id);
            const isEventCreator =
              event?.createdBy?.id === currentUser?.id ||
              event?.createdBy === currentUser?.id;
            const canDelete =
              currentUser?.role === "ADMIN" ||
              isEventCreator ||
              post.author?.id === currentUser?.id;

            return (
              <div
                key={post.id}
                className="post-card bg-white p-6 rounded-2xl shadow-sm border border-gray-50 transition-all hover:shadow-md"
                style={{ overflow: "visible" }}
              >
                {/* Post Header */}
                <div
                  className="post-header flex items-center justify-between mb-4"
                  style={{ overflow: "visible" }}
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={post.author?.avatar || "/default-avatar.png"}
                      alt={post.author?.name}
                      className="w-11 h-11 rounded-full object-cover border-2 border-gray-50"
                    />
                    <div className="flex-1">
                      <p className="font-bold text-gray-900 text-base leading-none">
                        {post.author?.name}
                      </p>
                      <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                        <Clock size={12} />
                        {formatDate(post.createdAt)}
                      </p>
                    </div>
                  </div>

                  {canDelete && (
                    <div className="relative menu-container">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuPostId(
                            openMenuPostId === post.id ? null : post.id
                          );
                        }}
                        className="p-2 hover:bg-gray-50 rounded-full transition-colors"
                      >
                        <MoreVertical size={18} className="text-gray-400" />
                      </button>
                      {openMenuPostId === post.id && (
                        <div className="absolute right-0 top-full mt-1 bg-white shadow-xl rounded-xl border border-gray-100 p-1 min-w-[150px] z-50">
                          <button
                            onClick={() => {
                              setOpenMenuPostId(null);
                              handleDeletePost(post.id);
                            }}
                            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium"
                          >
                            <Trash2 size={16} />
                            <span>Xóa bài viết</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Post Content */}
                <div className="post-content mb-6">
                  <p className="whitespace-pre-wrap text-gray-700 leading-relaxed text-[15px]">
                    {post.content}
                  </p>
                </div>

                {/* Post Stats */}
                {(post.likes?.length > 0 || post.commentCount > 0) && (
                  <div className="post-stats flex items-center justify-between py-3 border-y border-gray-50 mb-3">
                    <div className="flex items-center gap-1.5">
                      {post.likes?.length > 0 && (
                        <>
                          <div className="reaction-icon bg-red-500 p-1 rounded-full">
                            <Heart
                              size={12}
                              className="text-white fill-white"
                            />
                          </div>
                          <span className="text-sm text-gray-500 font-medium">
                            {post.likes?.length}
                          </span>
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-500 font-medium">
                      {post.commentCount > 0 && (
                        <span
                          className="hover:underline cursor-pointer hover:text-blue-600"
                          onClick={() => toggleCommentSection(post.id)}
                        >
                          {post.commentCount} bình luận
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Post Actions */}
                <div className="post-actions flex items-center gap-1">
                  <button
                    onClick={() => handleToggleLike(post.id)}
                    className={`action-btn flex-1 flex items-center justify-center gap-2 py-2 rounded-xl transition-all font-semibold text-sm ${isLiked
                      ? "bg-red-50 text-red-600"
                      : "text-gray-500 hover:bg-red-50 hover:text-red-600"
                      }`}
                  >
                    <Heart
                      size={18}
                      className={isLiked ? "fill-red-600" : ""}
                    />
                    <span>{isLiked ? "Đã thích" : "Thích"}</span>
                  </button>

                  <button
                    onClick={() => toggleCommentSection(post.id)}
                    className={`action-btn flex-1 flex items-center justify-center gap-2 py-2 rounded-xl transition-all font-semibold text-sm text-gray-500 hover:bg-blue-50 hover:text-blue-600 ${visibleComments[post.id] ? "bg-blue-50 text-blue-600" : ""
                      }`}
                  >
                    <MessageSquare size={18} />
                    <span>Bình luận</span>
                  </button>
                </div>

                {/* Comment Section - Show when toggled */}
                {visibleComments[post.id] && (
                  <div className="mt-4 pt-4 border-t border-gray-50">
                    <CommentSection
                      post={post}
                      currentUser={currentUser}
                      fetchCommentsForPost={fetchCommentsForPost}
                      commentsMap={commentsMap}
                      setCommentsMap={setCommentsMap}
                      fetchPosts={fetchPosts}
                    />
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

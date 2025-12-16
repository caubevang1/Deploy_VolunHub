import { useState, useEffect, useCallback, useRef } from "react";
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
  Share2,
  Smile,
  ThumbsUp,
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
  eventCreatedBy,
}) {
  const [newComment, setNewComment] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const commentInputRef = useRef(null);

  const postId = post._id;
  const comments = commentsMap[postId] || [];

  // Xử lý chọn emoji cho comment
  const handleEmojiClick = (emojiObject) => {
    setNewComment((prev) => prev + emojiObject.emoji);
    setShowEmojiPicker(false);
    commentInputRef.current?.focus();
  };

  // Tự động fetch comments khi click vào icon
  const handleToggleComments = () => {
    // SỬA LỖI LOGIC: Chỉ fetch khi chưa có dữ liệu trong state VÀ bài viết có commentCount > 0
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

  // THÊM TÍNH NĂNG: Xử lý nhấn phím (cho phép gửi bằng Enter)
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
          [postId]: comments.filter((c) => c._id !== commentId),
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
    // Optimistic Update
    setCommentsMap((prev) => ({
      ...prev,
      [postId]: comments.map((c) => {
        if (c._id === commentId) {
          const currentlyLiked = c.likes?.includes(currentUser._id);
          return {
            ...c,
            likes: currentlyLiked
              ? c.likes.filter((id) => id !== currentUser._id)
              : [...(c.likes || []), currentUser._id],
          };
        }
        return c;
      }),
    }));

    try {
      await ToggleLikeComment(commentId);
    } catch (err) {
      console.error("Lỗi like comment:", err);
      // Rollback
      setCommentsMap((prev) => ({
        ...prev,
        [postId]: comments.map((c) => {
          if (c._id === commentId) {
            const currentlyLiked = c.likes?.includes(currentUser._id);
            return {
              ...c,
              likes: currentlyLiked
                ? c.likes.filter((id) => id !== currentUser._id)
                : [...(c.likes || []), currentUser._id],
            };
          }
          return c;
        }),
      }));
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
            <div className="absolute top-12 right-0 z-50">
              <EmojiPicker onEmojiClick={handleEmojiClick} />
            </div>
          )}
        </div>
      </div>

      {/* Danh sách Comments */}
      {commentsMap[postId] !== undefined && comments.length > 0 && (
        <div className="comment-list">
          {comments.map((comment) => {
            const isLiked = comment.likes?.includes(currentUser?._id);
            const isEventManager =
              currentUser?.role === "EVENTMANAGER" &&
              eventCreatedBy === currentUser?._id;
            const canDelete =
              currentUser?.role === "ADMIN" ||
              isEventManager ||
              comment.author._id === currentUser?._id;

            return (
              <div key={comment._id} className="text-sm">
                <div className="flex items-start gap-2">
                  <img
                    src={comment.author.avatar || "/default-avatar.png"}
                    alt={comment.author.name}
                    className="w-7 h-7 rounded-full object-cover mt-1"
                  />
                  <div className="flex-1">
                    <div className="comment-bubble">
                      <p className="font-semibold text-gray-800">
                        {comment.author.name}
                      </p>
                      <p className="text-gray-700">{comment.content}</p>
                    </div>
                    <div className="comment-meta flex items-center gap-3 text-xs">
                      <span
                        className="cursor-pointer hover:text-blue-500"
                        onClick={() => handleToggleLike(comment._id)}
                      >
                        {isLiked ? "Bỏ thích" : "Thích"}
                      </span>
                      {comment.likes?.length > 0 && (
                        <span>| {comment.likes?.length} Thích</span>
                      )}
                      {canDelete && (
                        <span
                          className="delete-link cursor-pointer hover:text-red-500"
                          onClick={() => handleDeleteComment(comment._id)}
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

  const [commentsMap, setCommentsMap] = useState({});
  const postInputRef = useRef(null);

  // Fetch user info
  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await GetUserInfo();
        setCurrentUser(res.data);
      } catch (err) {
        console.error("Lỗi lấy thông tin user:", err);
      }
    }
    fetchUser();
  }, []);

  // Fetch event detail
  useEffect(() => {
    async function fetchEvent() {
      try {
        const res = await GetEventDetail(eventId);
        if (res.status === 200) {
          setEvent(res.data);

          // Admin có thể truy cập tất cả discussion
          if (currentUser?.role === "ADMIN") {
            setCanAccess(true);
            return;
          }

          if (res.data.status !== "approved") {
            Swal.fire({
              icon: "warning",
              title: "Không thể truy cập",
              text: "Kênh trao đổi chỉ khả dụng khi sự kiện đã được duyệt.",
              confirmButtonColor: "#DDB958",
            });
            navigate(-1);
            return;
          }
          setCanAccess(true);
        }
      } catch (err) {
        console.error("Lỗi lấy thông tin sự kiện:", err);
        // Admin không bị chặn bởi lỗi 403
        if (err.response?.status === 403 && currentUser?.role !== "ADMIN") {
          Swal.fire({
            icon: "error",
            title: "Không có quyền",
            text: "Bạn phải là thành viên đã được duyệt để truy cập kênh này.",
            confirmButtonColor: "#DDB958",
          });
          navigate(-1);
        } else if (currentUser?.role === "ADMIN") {
          // Admin vẫn có thể tiếp tục dù có lỗi
          setCanAccess(true);
        }
      }
      setLoading(false);
    }
    fetchEvent();
  }, [eventId, navigate, currentUser]);

  // Giữ fetchPosts là useCallback để ổn định khi truyền xuống component con
  const fetchPosts = useCallback(async () => {
    try {
      const res = await GetEventPosts(eventId);
      if (res.status === 200) {
        setPosts(res.data);
      }
    } catch (err) {
      console.error("Lỗi lấy bài viết:", err);
    }
  }, [eventId]);

  useEffect(() => {
    if (canAccess) {
      const loadPosts = async () => {
        try {
          const res = await GetEventPosts(eventId);
          if (res.status === 200) {
            setPosts(res.data);
          }
        } catch (err) {
          console.error("Lỗi lấy bài viết:", err);
        }
      };

      loadPosts();
    }
  }, [canAccess, eventId]);

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
  const fetchCommentsForPost = async (postId) => {
    if (commentsMap[postId] !== undefined) return;

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
    // Optimistic Update: Cập nhật UI ngay lập tức
    setPosts((prevPosts) =>
      prevPosts.map((post) => {
        if (post._id === postId) {
          const currentlyLiked = post.likes?.includes(currentUser._id);
          return {
            ...post,
            likes: currentlyLiked
              ? post.likes.filter((id) => id !== currentUser._id) // Unlike
              : [...(post.likes || []), currentUser._id], // Like
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

      // Rollback nếu API thất bại
      setPosts((prevPosts) =>
        prevPosts.map((post) => {
          if (post._id === postId) {
            const currentlyLiked = post.likes?.includes(currentUser._id);
            return {
              ...post,
              likes: currentlyLiked
                ? post.likes.filter((id) => id !== currentUser._id)
                : [...(post.likes || []), currentUser._id],
            };
          }
          return post;
        })
      );

      Swal.fire({
        icon: "error",
        title: "Lỗi",
        text: "Không thể cập nhật like",
        timer: 1500,
        showConfirmButton: false,
      });
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
        const res = await DeletePost(postId);
        if (res.status === 200) {
          setPosts(posts.filter((post) => post._id !== postId));
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
        }
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
        <div className="text-lg">Đang tải...</div>
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
          className="flex items-center gap-2 text-blue-600 hover:text-blue-800 mb-4"
        >
          <ArrowLeft size={20} />
          <span>Quay lại</span>
        </button>

        {/* Event Info Card - Enhanced */}
        <div className="event-info-card">
          {/* Event Image - Full Width */}
          <div className="event-cover-image">
            <img
              src={
                event.coverImage
                  ? `http://localhost:5000${event.coverImage}`
                  : "/default-event.png"
              }
              alt={event.name}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Event Details */}
          <div className="event-info-content">
            <div className="flex items-start justify-between gap-3">
              <h1 className="text-2xl font-bold text-gray-900 flex-1">
                {event.name}
              </h1>
              {/* Status Badge */}
              <div className="flex-shrink-0">
                {event.status === "approved" && (
                  <span className="status-badge status-approved">
                    <CheckCircle2 size={14} />
                    Đã duyệt
                  </span>
                )}
                {event.status === "pending" && (
                  <span className="status-badge status-pending">
                    <Clock size={14} />
                    Chờ duyệt
                  </span>
                )}
                {event.status === "completed" && (
                  <span className="status-badge status-completed">
                    <Award size={14} />
                    Hoàn thành
                  </span>
                )}
              </div>
            </div>

            {/* Meta Info - Single Line */}
            <div className="event-meta-line">
              <div className="flex items-center gap-1.5">
                <Calendar size={14} className="text-gray-500" />
                <span className="text-xs text-gray-600">
                  {formatDate(event.startDate)} - {formatDate(event.endDate)}
                </span>
              </div>
              <span className="text-gray-300">•</span>
              <div className="flex items-center gap-1.5">
                <MapPin size={14} className="text-gray-500" />
                <span className="text-xs text-gray-600">{event.location}</span>
              </div>
              <span className="text-gray-300">•</span>
              <div className="flex items-center gap-1.5">
                <Users size={14} className="text-gray-500" />
                <span className="text-xs text-gray-600">
                  {event.requiredParticipants} người
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Composer - Post Form */}
      <div className="composer-card">
        <div className="composer-header">
          <img
            src={currentUser?.avatar || "/default-avatar.png"}
            alt={currentUser?.name}
            className="w-10 h-10 rounded-full object-cover"
          />
          <div className="flex-1">
            <p className="font-semibold text-gray-900 text-sm">
              {currentUser?.name}
            </p>
            <p className="text-xs text-gray-500">Chia sẻ cập nhật</p>
          </div>
        </div>

        <div className="composer-body">
          <textarea
            ref={postInputRef}
            value={newPost}
            onChange={(e) => setNewPost(e.target.value)}
            placeholder={`${
              currentUser?.name || "Bạn"
            } ơi, viết cập nhật cho sự kiện này...`}
            className="composer-textarea"
            rows="3"
            disabled={isPosting}
          />
        </div>

        <div className="composer-footer">
          <div className="composer-actions">
            <button
              className="composer-action-btn"
              title="Thêm ảnh"
              disabled={isPosting}
            >
              <ImageIcon size={20} />
              <span>Ảnh</span>
            </button>
            <button
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="composer-action-btn"
              title="Thêm biểu tượng cảm xúc"
              disabled={isPosting}
            >
              <Smile size={20} />
              <span>Cảm xúc</span>
            </button>
          </div>

          <button
            onClick={handleCreatePost}
            disabled={!newPost.trim() || isPosting}
            className="composer-submit-btn"
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
          <div className="emoji-picker-wrapper">
            <EmojiPicker onEmojiClick={handleEmojiClick} />
          </div>
        )}
      </div>

      {/* Feed - Danh sách bài viết */}
      <div className="feed-container">
        {posts.length === 0 ? (
          <div className="empty-state">
            <MessageSquare size={48} className="text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">
              Chưa có bài viết nào
            </h3>
            <p className="text-gray-500 text-sm">
              Hãy là người đầu tiên chia sẻ cập nhật cho sự kiện này!
            </p>
          </div>
        ) : (
          posts.map((post) => {
            const isLiked = post.likes?.includes(currentUser?._id);
            const isEventManager =
              currentUser?.role === "EVENTMANAGER" &&
              event?.createdBy?._id === currentUser?._id;
            const canDelete =
              currentUser?.role === "ADMIN" ||
              isEventManager ||
              post.author._id === currentUser?._id;

            return (
              <div key={post._id} className="post-card">
                {/* Post Header */}
                <div className="post-header">
                  <div className="flex items-center gap-3">
                    <img
                      src={post.author.avatar || "/default-avatar.png"}
                      alt={post.author.name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900 text-sm">
                        {post.author.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatDate(post.createdAt)}
                      </p>
                    </div>
                  </div>

                  {canDelete && (
                    <div className="relative group">
                      <button className="p-2 hover:bg-gray-100 rounded-full transition">
                        <MoreVertical size={18} className="text-gray-600" />
                      </button>
                      <div className="post-menu">
                        <button
                          onClick={() => handleDeletePost(post._id)}
                          className="post-menu-item text-red-600"
                        >
                          <Trash2 size={16} />
                          <span>Xóa bài viết</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Post Content */}
                <div className="post-content">
                  <p className="whitespace-pre-wrap">{post.content}</p>
                </div>

                {/* Post Stats */}
                {(post.likes?.length > 0 || post.commentCount > 0) && (
                  <div className="post-stats">
                    <div className="flex items-center gap-2">
                      {post.likes?.length > 0 && (
                        <>
                          <div className="reaction-icon">
                            <Heart
                              size={14}
                              className="text-white fill-white"
                            />
                          </div>
                          <span className="text-sm text-gray-600 hover:underline cursor-pointer">
                            {post.likes?.length}
                          </span>
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-600">
                      {post.commentCount > 0 && (
                        <span
                          className="hover:underline cursor-pointer"
                          onClick={() => toggleCommentSection(post._id)}
                        >
                          {post.commentCount} bình luận
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Post Actions */}
                <div className="post-actions">
                  <button
                    onClick={() => handleToggleLike(post._id)}
                    className={`action-btn ${
                      isLiked ? "action-btn-active" : ""
                    }`}
                  >
                    {isLiked ? (
                      <Heart size={18} className="fill-current" />
                    ) : (
                      <ThumbsUp size={18} />
                    )}
                    <span>Thích</span>
                  </button>

                  <button
                    onClick={() => toggleCommentSection(post._id)}
                    className="action-btn"
                  >
                    <MessageSquare size={18} />
                    <span>Bình luận</span>
                  </button>

                  <button
                    onClick={() => {
                      Swal.fire({
                        icon: "info",
                        title: "Tính năng đang phát triển",
                        text: "Chức năng chia sẻ sẽ sớm được bổ sung",
                        confirmButtonColor: "#DDB958",
                        toast: true,
                        position: "top-end",
                        timer: 2000,
                        showConfirmButton: false,
                      });
                    }}
                    className="action-btn"
                  >
                    <Share2 size={18} />
                    <span>Chia sẻ</span>
                  </button>
                </div>

                {/* Comment Section - Show when toggled */}
                {visibleComments[post._id] && (
                  <CommentSection
                    post={post}
                    currentUser={currentUser}
                    fetchCommentsForPost={fetchCommentsForPost}
                    commentsMap={commentsMap}
                    setCommentsMap={setCommentsMap}
                    fetchPosts={fetchPosts}
                    eventCreatedBy={event?.createdBy?._id}
                  />
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

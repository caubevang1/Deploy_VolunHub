import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { GetEventDetail } from '../services/EventService';
import { GetEventPosts, CreatePost, ToggleLikePost, DeletePost } from '../services/PostService';
import { GetUserInfo } from '../services/UserService';
import { 
  GetPostComments, 
  CreateComment, 
  ToggleLikeComment, 
  DeleteComment 
} from '../services/CommentService'; 
import { Heart, Send, Trash2, ArrowLeft, MessageSquare } from 'lucide-react'; 
import Swal from 'sweetalert2';
import '../styles/EventDiscussion.css'; 

// =========================================================================
// COMMENT SECTION COMPONENT
// =========================================================================
function CommentSection({ post, currentUser, fetchCommentsForPost, commentsMap, setCommentsMap, fetchPosts }) {
  const [newComment, setNewComment] = useState('');

  const postId = post._id;
  const comments = commentsMap[postId] || [];
  
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
        setCommentsMap(prev => ({
          ...prev,
          [postId]: [ res.data, ...comments]
        }));
        setNewComment('');
        // Cập nhật lại post list để hiển thị commentCount mới
        fetchPosts(); 
      }
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Bình luận thất bại',
        text: err.response?.data?.message || 'Có lỗi xảy ra',
        confirmButtonColor: '#DDB958'
      });
    }
  };
  
  // THÊM TÍNH NĂNG: Xử lý nhấn phím (cho phép gửi bằng Enter)
  const handleInputKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault(); 
      handleCreateComment();
    }
  };

  const handleDeleteComment = async (commentId) => {
    const result = await Swal.fire({
      title: 'Xác nhận xóa bình luận?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#DDB958',
      confirmButtonText: 'Xóa',
      cancelButtonText: 'Hủy'
    });

    if (result.isConfirmed) {
      try {
        await DeleteComment(commentId);
        
        // Cập nhật state comments (xóa khỏi danh sách)
        setCommentsMap(prev => ({
          ...prev,
          [postId]: comments.filter(c => c._id !== commentId)
        }));
        
        // Cập nhật lại post list để hiển thị commentCount mới (giảm 1)
        fetchPosts(); 

        Swal.fire({ icon: 'success', title: 'Đã xóa bình luận', timer: 1500, showConfirmButton: false });
      } catch (err) {
        Swal.fire({
          icon: 'error',
          title: 'Xóa thất bại',
          text: err.response?.data?.message || 'Có lỗi xảy ra',
          confirmButtonColor: '#DDB958'
        });
      }
    }
  };
  
  const handleToggleLike = async (commentId) => {
    // Optimistic Update
    setCommentsMap(prev => ({
        ...prev,
        [postId]: comments.map(c => {
            if (c._id === commentId) {
                const currentlyLiked = c.likes?.includes(currentUser._id);
                return {
                    ...c,
                    likes: currentlyLiked 
                        ? c.likes.filter(id => id !== currentUser._id)
                        : [...(c.likes || []), currentUser._id]
                };
            }
            return c;
        })
    }));

    try {
        await ToggleLikeComment(commentId);
    } catch (err) {
        console.error('Lỗi like comment:', err);
        // Rollback
        setCommentsMap(prev => ({
            ...prev,
            [postId]: comments.map(c => {
                if (c._id === commentId) {
                    const currentlyLiked = c.likes?.includes(currentUser._id);
                    return {
                        ...c,
                        likes: currentlyLiked 
                            ? c.likes.filter(id => id !== currentUser._id)
                            : [...(c.likes || []), currentUser._id]
                    };
                }
                return c;
            })
        }));
    }
  };

  return (
    <div className="comment-section-wrapper">
      <div className="mb-4">
        <div className="flex gap-2 items-center text-gray-500 cursor-pointer hover:text-blue-600" onClick={handleToggleComments}>
          <MessageSquare size={18} />
          <span>{post.commentCount || 0} Bình luận</span>
        </div>
      </div>

      {/* Form Comment */}
      <div className="comment-input-area">
        <img
          src={currentUser?.avatar || '/default-avatar.png'}
          alt="Avatar"
          className="w-8 h-8 rounded-full object-cover mt-1"
        />
        <div className="flex-1 flex gap-2">
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyDown={handleInputKeyDown} /* Gắn sự kiện Enter */  
            placeholder="Viết bình luận..."
            className="flex-1 border border-gray-300 rounded-full px-4 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#DDB958]"
          /> {/* ✅ ĐÃ SỬA LỖI CÚ PHÁP: Dấu đóng ngoặc nhọn thừa đã được xóa khỏi đây */}
          <button
            onClick={handleCreateComment}
            className="comment-send-button transition"
            title="Gửi bình luận"
          >
            <Send size={20} />
          </button>
        </div>
      </div>

      {/* Danh sách Comments */}
      {commentsMap[postId] !== undefined && comments.length > 0 && ( 
        <div className="comment-list">
          {comments.map(comment => {
            const isLiked = comment.likes?.includes(currentUser?._id);
            const canDelete = currentUser?.role === 'ADMIN' || comment.author._id === currentUser?._id;

            return (
              <div key={comment._id} className="text-sm">
                <div className="flex items-start gap-2">
                  <img
                    src={comment.author.avatar || '/default-avatar.png'}
                    alt={comment.author.name}
                    className="w-7 h-7 rounded-full object-cover mt-1"
                  />
                  <div className="flex-1">
                    <div className="comment-bubble">
                      <p className="font-semibold text-gray-800">{comment.author.name}</p>
                      <p className="text-gray-700">{comment.content}</p>
                    </div>
                    <div className="comment-meta flex items-center gap-3 text-xs">
                      <span className="cursor-pointer hover:text-blue-500" onClick={() => handleToggleLike(comment._id)}>
                        {isLiked ? 'Bỏ thích' : 'Thích'}
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
                      <span className="ml-auto">{new Date(comment.createdAt).toLocaleString('vi-VN', { timeStyle: 'short', dateStyle: 'short' })}</span>
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
  const [newPost, setNewPost] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [canAccess, setCanAccess] = useState(false);
  
  const [commentsMap, setCommentsMap] = useState({});

  // Fetch user info
  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await GetUserInfo();
        setCurrentUser(res.data);
      } catch (err) {
        console.error('Lỗi lấy thông tin user:', err);
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
          
          if (res.data.status !== 'approved') {
            Swal.fire({
              icon: 'warning',
              title: 'Không thể truy cập',
              text: 'Kênh trao đổi chỉ khả dụng khi sự kiện đã được duyệt.',
              confirmButtonColor: '#DDB958'
            });
            navigate(-1);
            return;
          }
          setCanAccess(true);
        }
      } catch (err) {
        console.error('Lỗi lấy thông tin sự kiện:', err);
        if (err.response?.status === 403) {
          Swal.fire({
            icon: 'error',
            title: 'Không có quyền',
            text: 'Bạn phải là thành viên đã được duyệt để truy cập kênh này.',
            confirmButtonColor: '#DDB958'
          });
          navigate(-1);
        }
      }
      setLoading(false);
    }
    fetchEvent();
  }, [eventId, navigate]);

  // Giữ fetchPosts là useCallback để ổn định khi truyền xuống component con
  const fetchPosts = useCallback(async () => { 
    try {
      const res = await GetEventPosts(eventId);
      if (res.status === 200) {
        setPosts(res.data); 
      }
    } catch (err) {
      console.error('Lỗi lấy bài viết:', err);
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
          console.error('Lỗi lấy bài viết:', err);
        }
      };
      
      loadPosts();
    }
  }, [canAccess, eventId]);

  // Fetch Comments cho 1 Post
  const fetchCommentsForPost = async (postId) => {
    if (commentsMap[postId] !== undefined) return; 
    
    try {
      const res = await GetPostComments(postId);
      if (res.status === 200) {
        setCommentsMap(prev => ({
          ...prev,
          [postId]: res.data 
        }));
      }
    } catch (err) {
      console.error('Lỗi lấy comments:', err);
    }
  };
  
  const handleCreatePost = async () => {
    if (!newPost.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Thiếu nội dung',
        text: 'Vui lòng nhập nội dung bài viết.',
        confirmButtonColor: '#DDB958'
      });
      return;
    }

    try {
      const res = await CreatePost(eventId, newPost);
      if (res.status === 201) {
        setPosts([res.data, ...posts]); 
        setNewPost('');
        Swal.fire({
          icon: 'success',
          title: 'Đăng bài thành công',
          timer: 1500,
          showConfirmButton: false
        });
      }
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Đăng bài thất bại',
        text: err.response?.data?.message || 'Có lỗi xảy ra',
        confirmButtonColor: '#DDB958'
      });
    }
  };

  const handleToggleLike = async (postId) => {
    // Optimistic Update: Cập nhật UI ngay lập tức
    setPosts(prevPosts => prevPosts.map(post => {
      if (post._id === postId) {
        const currentlyLiked = post.likes?.includes(currentUser._id);
        return {
          ...post,
          likes: currentlyLiked 
            ? post.likes.filter(id => id !== currentUser._id) // Unlike
            : [...(post.likes || []), currentUser._id] // Like
        };
      }
      return post;
    }));

    // Gọi API ở background
    try {
      await ToggleLikePost(postId);
    } catch (err) {
      console.error('Lỗi like post:', err);
      
      // Rollback nếu API thất bại
      setPosts(prevPosts => prevPosts.map(post => {
        if (post._id === postId) {
          const currentlyLiked = post.likes?.includes(currentUser._id);
          return {
            ...post,
            likes: currentlyLiked 
              ? post.likes.filter(id => id !== currentUser._id)
              : [...(post.likes || []), currentUser._id]
          };
        }
        return post;
      }));
      
      Swal.fire({
        icon: 'error',
        title: 'Lỗi',
        text: 'Không thể cập nhật like',
        timer: 1500,
        showConfirmButton: false
      });
    }
  };

  const handleDeletePost = async (postId) => {
    const result = await Swal.fire({
      title: 'Xác nhận xóa bài viết?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#DDB958',
      confirmButtonText: 'Xóa',
      cancelButtonText: 'Hủy'
    });

    if (result.isConfirmed) {
      try {
        const res = await DeletePost(postId);
        if (res.status === 200) {
          setPosts(posts.filter(post => post._id !== postId));
          // Xóa luôn comments của post này khỏi state
          setCommentsMap(prev => {
              const newMap = {...prev};
              delete newMap[postId];
              return newMap;
          });
          
          Swal.fire({
            icon: 'success',
            title: 'Đã xóa bài viết',
            timer: 1500,
            showConfirmButton: false
          });
        }
      } catch (err) {
        Swal.fire({
          icon: 'error',
          title: 'Xóa thất bại',
          text: err.response?.data?.message || 'Có lỗi xảy ra',
          confirmButtonColor: '#DDB958'
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
        
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          Kênh Trao Đổi
        </h1>
        <p className="text-gray-600 text-lg">{event.name}</p>
      </div>

      {/* Form đăng bài */}
      <div className="post-form-card">
        <div className="flex gap-4">
          <img
            src={currentUser?.avatar || '/default-avatar.png'}
            alt="Avatar"
            className="w-12 h-12 rounded-full object-cover"
          />
          <div className="flex-1">
            <textarea
              value={newPost}
              onChange={(e) => setNewPost(e.target.value)}
              placeholder="Bạn đang nghĩ gì về sự kiện này?"
              className="w-full border border-gray-300 rounded-lg p-3 resize-none focus:outline-none focus:ring-2 focus:ring-[#DDB958]"
              rows="3"
            />
            <button
              onClick={handleCreatePost}
              className="mt-2 flex items-center gap-2 px-6 py-2 rounded-lg transition post-form-button"
            >
              <Send size={18} />
              <span>Đăng bài</span>
            </button>
          </div>
        </div>
      </div>

      {/* Danh sách bài viết */}
      <div className="space-y-4"> 
        {posts.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center text-gray-500">
            Chưa có bài viết nào. Hãy là người đầu tiên chia sẻ!
          </div>
        ) : (
          posts.map((post) => {
            const isLiked = post.likes?.includes(currentUser?._id);
            const canDelete = currentUser?.role === 'ADMIN' || post.author._id === currentUser?._id;

            return (
              <div key={post._id} className="post-item-card">
                {/* Header post */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <img
                      src={post.author.avatar || '/default-avatar.png'}
                      alt={post.author.name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    <div>
                      <p className="post-author-name">{post.author.name}</p>
                      <p className="post-meta-time">
                        {new Date(post.createdAt).toLocaleString('vi-VN')}
                      </p>
                    </div>
                  </div>

                  {canDelete && (
                    <button
                      onClick={() => handleDeletePost(post._id)}
                      className="text-red-500 hover:text-red-700 transition"
                    >
                      <Trash2 size={20} />
                    </button>
                  )}
                </div>

                {/* Content */}
                <p className="text-gray-700 mb-4 whitespace-pre-wrap">{post.content}</p>

                {/* Actions */}
                <div className="post-actions">
                  <button
                    onClick={() => handleToggleLike(post._id)}
                    className="action-button" 
                  >
                    <Heart
                      size={22}
                      className={isLiked ? 'text-red-500 fill-red-500' : 'text-gray-500'}
                    />
                    <span className="text-gray-700">{post.likes?.length || 0}</span>
                  </button>
                  
                  {/* HIỂN THỊ COMMENT COUNT VÀ NÚT TƯƠNG TÁC */}
                  <button
                    onClick={() => fetchCommentsForPost(post._id)}
                    className="action-button text-gray-500 hover:text-blue-600"
                  >
                    <MessageSquare size={20} />
                    <span className="text-gray-700">{post.commentCount || 0}</span>
                  </button>
                </div>
                
                {/* COMPONENT HIỂN THỊ COMMENT (chỉ render nếu comments đã được load) */}
                {commentsMap[post._id] !== undefined && ( 
                  <CommentSection 
                    post={post}
                    currentUser={currentUser}
                    fetchCommentsForPost={fetchCommentsForPost}
                    commentsMap={commentsMap}
                    setCommentsMap={setCommentsMap}
                    fetchPosts={fetchPosts}
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
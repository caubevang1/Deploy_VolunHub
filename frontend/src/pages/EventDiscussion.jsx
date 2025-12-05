import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { GetEventDetail } from '../services/EventService';
import { GetEventPosts, CreatePost, ToggleLikePost, DeletePost } from '../services/PostService';
import { GetUserInfo } from '../services/UserService';
import { Heart, Send, Trash2, ArrowLeft } from 'lucide-react';
import Swal from 'sweetalert2';

export default function EventDiscussion() {
  const { eventId } = useParams();
  const navigate = useNavigate();

  const [event, setEvent] = useState(null);
  const [posts, setPosts] = useState([]);
  const [newPost, setNewPost] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [canAccess, setCanAccess] = useState(false);

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
          
          // Kiểm tra quyền truy cập
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

  // Fetch posts
  useEffect(() => {
    if (canAccess) {
      fetchPosts();
    }
  }, [canAccess]);

  const fetchPosts = async () => {
    try {
      const res = await GetEventPosts(eventId);
      if (res.status === 200) {
        setPosts(res.data);
      }
    } catch (err) {
      console.error('Lỗi lấy bài viết:', err);
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
    // ✅ Optimistic Update: Cập nhật UI ngay lập tức
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
      
      // ✅ Rollback nếu API thất bại
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
    <div className="max-w-4xl mx-auto p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
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
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
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
              className="mt-2 flex items-center gap-2 bg-[#DDB958] text-white px-6 py-2 rounded-lg hover:bg-[#CDA550] transition"
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
              <div key={post._id} className="bg-white rounded-lg shadow-md p-6">
                {/* Header post */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <img
                      src={post.author.avatar || '/default-avatar.png'}
                      alt={post.author.name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    <div>
                      <p className="font-semibold text-gray-800">{post.author.name}</p>
                      <p className="text-sm text-gray-500">
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
                <div className="flex items-center gap-6 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => handleToggleLike(post._id)}
                    className="flex items-center gap-2 hover:scale-110 transition-transform"
                  >
                    <Heart
                      size={22}
                      className={isLiked ? 'text-red-500 fill-red-500' : 'text-gray-500'}
                    />
                    <span className="text-gray-700">{post.likes?.length || 0}</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

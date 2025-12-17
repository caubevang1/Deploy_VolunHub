// src/controllers/post.controller.js
import PostRepository from "../repositories/PostRepository.js";
import EventRepository from "../repositories/EventRepository.js";

/**
 * [GET] /api/posts/event/:eventId
 * Lấy tất cả bài post của 1 sự kiện
 */
export const getEventPosts = async (req, res) => {
  try {
    const { eventId } = req.params;
    const event = await EventRepository.findById(eventId);
    
    if (!event) {
      return res.status(404).json({ message: 'Không tìm thấy sự kiện.' });
    }
    if (event.status !== 'approved') {
      return res.status(403).json({ message: 'Sự kiện chưa được duyệt. Không thể xem bài viết.' });
    }

    const posts = await PostRepository.find(
      { event: eventId },
      null,
      { sort: { createdAt: -1 } },
      "author"
    );
    res.status(200).json(posts);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

/**
 * [POST] /api/posts/event/:eventId
 * Tạo bài post mới
 */
export const createPost = async (req, res) => {
  try {
    const { content } = req.body;
    const { eventId } = req.params;

    if (!content || !content.trim()) {
      return res.status(400).json({ message: "Nội dung không được để trống." });
    }

    const event = await EventRepository.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Không tìm thấy sự kiện.' });
    }
    if (event.status !== 'approved') {
      return res.status(403).json({ message: 'Chỉ có thể đăng bài khi sự kiện đã được duyệt.' });
    }

    const newPost = await PostRepository.create({
      content: content.trim(),
      author: req.user._id,
      event: eventId,
    });

    // Lấy lại bài viết kèm thông tin author để trả về frontend
    const populatedPost = await PostRepository.findById(newPost._id, null, "author");
    res.status(201).json(populatedPost);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

/**
 * [POST] /api/posts/:postId/like
 * Like hoặc Unlike một bài post
 */
export const toggleLikePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user._id;

    const post = await PostRepository.findById(postId);
    if (!post) {
      return res.status(404).json({ message: "Không tìm thấy bài đăng." });
    }

    // Kiểm tra trạng thái like bằng logic JS thuần (Độc lập CSDL)
    const likes = post.likes || [];
    const hasLiked = likes.some(id => String(id) === String(userId));

    if (hasLiked) {
      // SỬA: Sử dụng hàm nghiệp vụ đã đóng gói trong Repository
      await PostRepository.pullLike(postId, userId);
    } else {
      await PostRepository.pushLike(postId, userId);
    }

    // Lấy lại thông tin mới nhất để trả về cho Frontend cập nhật UI
    const updatedPost = await PostRepository.findById(postId);
    
    res.status(200).json({ 
      message: "Cập nhật like thành công.",
      likesCount: updatedPost.likes?.length || 0,
      hasLiked: !hasLiked
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

/**
 * [DELETE] /api/posts/:postId
 * Xóa bài post
 */
export const deletePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user._id;
    const userRole = req.user.role;

    const post = await PostRepository.findById(postId);
    if (!post) {
      return res.status(404).json({ message: "Không tìm thấy bài đăng." });
    }

    // Phân quyền: Chỉ Admin hoặc chính tác giả mới được xóa
    if (userRole !== 'ADMIN' && String(post.author) !== String(userId)) {
      return res.status(403).json({ message: 'Bạn không có quyền xóa bài đăng này.' });
    }

    await PostRepository.findByIdAndDelete(postId);
    res.status(200).json({ message: "Xóa bài đăng thành công." });

  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};
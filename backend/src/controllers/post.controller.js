// src/controllers/post.controller.js
import PostRepository from "../repositories/PostRepository.js";
import EventRepository from "../repositories/EventRepository.js";

/**
 * [GET] /api/posts/event/:eventId
 * Lấy danh sách bài viết của sự kiện
 */
export const getEventPosts = async (req, res) => {
  try {
    const { eventId } = req.params;
    const event = await EventRepository.findById(eventId);
    
    if (!event) {
      return res.status(404).json({ message: 'Không tìm thấy sự kiện.' });
    }
    
    // Chỉ cho phép xem bài viết nếu sự kiện đã được duyệt
    if (event.status !== 'approved') {
      return res.status(403).json({ message: 'Sự kiện chưa được duyệt. Không thể xem bài viết.' });
    }

    const posts = await PostRepository.getPostsByEvent(eventId);
    res.status(200).json(posts);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

/**
 * [POST] /api/posts/event/:eventId
 * Tạo bài viết mới trong sự kiện
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
      author: req.user.id, 
      event: eventId,
    });

    // Lấy lại post kèm thông tin author (name, avatar) để Frontend render ngay
    const populatedPost = await PostRepository.getPostWithAuthor(newPost.id);
    res.status(201).json(populatedPost);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

/**
 * [POST] /api/posts/:postId/like
 * Thả tim bài viết (Toggle Like)
 */
export const toggleLikePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user.id;

    const post = await PostRepository.findById(postId);
    if (!post) {
      return res.status(404).json({ message: "Không tìm thấy bài đăng." });
    }

    const hasLiked = await PostRepository.checkUserLiked(postId, userId);

    if (hasLiked) {
      await PostRepository.pullLike(postId, userId);
    } else {
      await PostRepository.pushLike(postId, userId);
    }

    // Lấy dữ liệu mới nhất kèm author để Frontend đồng bộ UI mượt mà
    const updatedPost = await PostRepository.getPostWithAuthor(postId);
    
    res.status(200).json({ 
      message: "Cập nhật like thành công.",
      likesCount: updatedPost.likes?.length || 0,
      hasLiked: !hasLiked,
      post: updatedPost
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

/**
 * [DELETE] /api/posts/:postId
 * Xóa bài viết
 */
export const deletePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const post = await PostRepository.findById(postId);
    if (!post) {
      return res.status(404).json({ message: "Không tìm thấy bài đăng." });
    }

    // Kiểm tra quyền: Admin hoặc chính chủ bài viết mới được xóa
    // Sử dụng post.author.id (nếu đã populate) hoặc post.author (nếu là ID thô)
    const authorId = post.author?.id || post.author;
    if (userRole !== 'ADMIN' && String(authorId) !== String(userId)) {
      return res.status(403).json({ message: 'Bạn không có quyền xóa bài đăng này.' });
    }

    await PostRepository.findByIdAndDelete(postId);
    res.status(200).json({ message: "Xóa bài đăng thành công." });

  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};
// src/controllers/post.controller.js
import PostRepository from "../repositories/PostRepository.js";
import EventRepository from "../repositories/EventRepository.js";

/**
 * [GET] /api/posts/event/:eventId
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

    // SỬA: Dùng hàm nghiệp vụ thay vì truyền object filter thô
    const posts = await PostRepository.getPostsByEvent(eventId);
    res.status(200).json(posts);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

/**
 * [POST] /api/posts/event/:eventId
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

    const populatedPost = await PostRepository.getPostWithAuthor(newPost.id);
    res.status(201).json(populatedPost);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

/**
 * [POST] /api/posts/:postId/like
 */
export const toggleLikePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user.id; // SỬA: Dùng .id

    const post = await PostRepository.findById(postId);
    if (!post) {
      return res.status(404).json({ message: "Không tìm thấy bài đăng." });
    }

    // SỬA: Logic check like đẩy xuống Repo để che giấu cấu trúc dữ liệu (mảng hay bảng phụ)
    const hasLiked = await PostRepository.checkUserLiked(postId, userId);

    if (hasLiked) {
      await PostRepository.pullLike(postId, userId);
    } else {
      await PostRepository.pushLike(postId, userId);
    }

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
 */
export const deletePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user.id; // SỬA: Dùng .id
    const userRole = req.user.role;

    const post = await PostRepository.findById(postId);
    if (!post) {
      return res.status(404).json({ message: "Không tìm thấy bài đăng." });
    }

    // So sánh chuỗi ID sạch
    if (userRole !== 'ADMIN' && String(post.author) !== String(userId)) {
      return res.status(403).json({ message: 'Bạn không có quyền xóa bài đăng này.' });
    }

    await PostRepository.findByIdAndDelete(postId);
    res.status(200).json({ message: "Xóa bài đăng thành công." });

  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};
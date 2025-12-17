// src/controllers/comment.controller.js
import CommentRepository from "../repositories/CommentRepository.js";
import PostRepository from "../repositories/PostRepository.js";
import RegistrationRepository from "../repositories/RegistrationRepository.js";

/**
 * [POST] /api/comments/post/:postId
 * Tạo một bình luận mới
 */
export const createComment = async (req, res) => {
  try {
    const { content } = req.body;
    const { postId } = req.params;
    const userId = req.user._id;

    if (!content) {
      return res.status(400).json({ message: "Nội dung không được để trống." });
    }

    const post = await PostRepository.findById(postId);
    if (!post) {
      return res.status(404).json({ message: "Không tìm thấy bài đăng." });
    }
    const eventId = post.event;

    // Phân quyền: Admin, Manager hoặc Volunteer đã duyệt tham gia mới được comment
    const isManager = req.user.role === 'EVENTMANAGER' || req.user.role === 'ADMIN';
    const registration = await RegistrationRepository.findOne({
      event: eventId,
      volunteer: userId,
      status: 'approved',
    });

    if (!isManager && !registration) {
      return res.status(403).json({ message: 'Bạn phải là thành viên đã được duyệt để bình luận.' });
    }

    const newComment = await CommentRepository.create({
      content,
      author: userId,
      post: postId,
      event: eventId,
    });

    // SỬA: Đóng gói việc cập nhật commentCount vào Repository
    await PostRepository.incrementCommentCount(postId);

    // Lấy lại comment kèm thông tin tác giả để trả về giao diện
    const populatedComment = await CommentRepository.findById(newComment._id, null, "author");
    res.status(201).json(populatedComment);

  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

/**
 * [GET] /api/comments/post/:postId
 * Lấy tất cả bình luận của một bài post
 */
export const getPostComments = async (req, res) => {
  try {
    const comments = await CommentRepository.find(
      { post: req.params.postId }, 
      null, 
      { sort: { createdAt: 1 } }, 
      "author"
    );
    res.status(200).json(comments);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

/**
 * [POST] /api/comments/:commentId/like
 * Like hoặc Unlike một bình luận
 */
export const toggleLikeComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.user._id;

    const comment = await CommentRepository.findById(commentId);
    if (!comment) {
      return res.status(404).json({ message: "Không tìm thấy bình luận." });
    }

    // Kiểm tra đã like chưa bằng hàm Array.some() thuần JS (Độc lập CSDL)
    const likes = comment.likes || [];
    const hasLiked = likes.some(id => String(id) === String(userId));

    if (hasLiked) {
      // SỬA: Gọi hàm nghiệp vụ pullLike của Repository
      await CommentRepository.pullLike(commentId, userId);
    } else {
      // SỬA: Gọi hàm nghiệp vụ pushLike của Repository
      await CommentRepository.pushLike(commentId, userId);
    }

    res.status(200).json({ message: "Cập nhật like bình luận thành công." });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

/**
 * [DELETE] /api/comments/:commentId
 * Xóa một bình luận
 */
export const deleteComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.user._id;
    const userRole = req.user.role;

    const comment = await CommentRepository.findById(commentId);
    if (!comment) {
      return res.status(404).json({ message: "Không tìm thấy bình luận." });
    }

    // Chỉ Admin hoặc chính tác giả mới được xóa (Logic nghiệp vụ giữ nguyên)
    if (userRole !== 'ADMIN' && String(comment.author) !== String(userId)) {
      return res.status(403).json({ message: 'Bạn không có quyền xóa bình luận này.' });
    }

    const postId = comment.post; 
    
    await CommentRepository.findByIdAndDelete(commentId);
    
    // SỬA: Gọi hàm nghiệp vụ decrementCommentCount của Repository
    if (postId) {
      await PostRepository.decrementCommentCount(postId);
    }

    res.status(200).json({ message: "Xóa bình luận thành công." });

  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};
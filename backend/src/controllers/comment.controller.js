// src/controllers/comment.controller.js
import CommentRepository from "../repositories/CommentRepository.js";
import PostRepository from "../repositories/PostRepository.js";
import RegistrationRepository from "../repositories/RegistrationRepository.js";

/**
 * [POST] /api/comments/post/:postId
 */
export const createComment = async (req, res) => {
  try {
    const { content } = req.body;
    const { postId } = req.params;
    const userId = req.user.id; 

    if (!content) return res.status(400).json({ message: "Nội dung không được để trống." });

    const post = await PostRepository.findById(postId);
    if (!post) return res.status(404).json({ message: "Không tìm thấy bài đăng." });

    // SỬA: Dùng post.event (Repo đã map thành string id)
    const eventId = post.event;

    const isManager = req.user.role === 'EVENTMANAGER' || req.user.role === 'ADMIN';
    const isMember = await RegistrationRepository.checkMemberStatus(userId, eventId);

    if (!isManager && !isMember) {
      return res.status(403).json({ message: 'Bạn phải là thành viên đã được duyệt để bình luận.' });
    }

    const newComment = await CommentRepository.create({
      content,
      author: userId,
      post: postId,
      event: eventId,
    });

    await PostRepository.incrementCommentCount(postId);

    // SỬA: Dùng newComment.id sạch sẽ
    const populatedComment = await CommentRepository.getCommentWithAuthor(newComment.id);
    res.status(201).json(populatedComment);

  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

/**
 * [GET] /api/comments/post/:postId
 */
export const getPostComments = async (req, res) => {
  try {
    const comments = await CommentRepository.getByPostId(req.params.postId);
    res.status(200).json(comments);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

/**
 * [POST] /api/comments/:commentId/like
 */
export const toggleLikeComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.user.id; // SỬA: Dùng .id

    const comment = await CommentRepository.findById(commentId);
    if (!comment) return res.status(404).json({ message: "Không tìm thấy bình luận." });

    const hasLiked = await CommentRepository.checkUserLiked(commentId, userId);

    if (hasLiked) {
      await CommentRepository.pullLike(commentId, userId);
    } else {
      await CommentRepository.pushLike(commentId, userId);
    }

    res.status(200).json({ message: "Cập nhật like bình luận thành công." });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

/**
 * [DELETE] /api/comments/:commentId
 */
export const deleteComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.user.id; // SỬA: Dùng .id
    const userRole = req.user.role;

    const comment = await CommentRepository.findById(commentId);
    if (!comment) return res.status(404).json({ message: "Không tìm thấy bình luận." });

    // So sánh chuỗi ID sạch, không dùng gạch dưới
    if (userRole !== 'ADMIN' && String(comment.author) !== String(userId)) {
      return res.status(403).json({ message: 'Bạn không có quyền xóa bình luận này.' });
    }

    const postId = comment.post; 
    await CommentRepository.findByIdAndDelete(commentId);
    
    if (postId) {
      await PostRepository.decrementCommentCount(postId);
    }

    res.status(200).json({ message: "Xóa bình luận thành công." });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};
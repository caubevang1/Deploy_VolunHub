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
    const postId = req.params.postId;
    const userId = req.user._id;

    if (!content) {
      return res.status(400).json({ message: "Nội dung không được để trống." });
    }

    const post = await PostRepository.findById(postId);
    if (!post) {
      return res.status(404).json({ message: "Không tìm thấy bài đăng." });
    }
    const eventId = post.event;

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

    // update commentCount using rawModel update (atomic)
    await PostRepository.rawModel().updateOne({ _id: postId }, { $inc: { commentCount: 1 } });

    const populatedComment = await CommentRepository.findOne({ _id: newComment._id }, null, "author");
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
    const comments = await CommentRepository.find({ post: req.params.postId }, null, { sort: { createdAt: 1 } }, "author");
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
    const commentId = req.params.commentId;
    const userId = req.user._id;

    const comment = await CommentRepository.findById(commentId);
    if (!comment) {
      return res.status(404).json({ message: "Không tìm thấy bình luận." });
    }

    const hasLiked = (comment.likes || []).some(id => String(id) === String(userId));
    if (hasLiked) {
      await CommentRepository.rawModel().updateOne({ _id: commentId }, { $pull: { likes: userId } });
    } else {
      await CommentRepository.rawModel().updateOne({ _id: commentId }, { $push: { likes: userId } });
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
    const commentId = req.params.commentId;
    const userId = req.user._id;
    const userRole = req.user.role;

    const comment = await CommentRepository.findById(commentId);
    if (!comment) {
      return res.status(404).json({ message: "Không tìm thấy bình luận." });
    }

    // Chỉ Admin hoặc chính tác giả mới được xóa
    if (userRole !== 'ADMIN' && comment.author.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'Bạn không có quyền xóa bình luận này.' });
    }

    // Lấy postId trước khi xóa
    const postId = comment.post; 
    
    await CommentRepository.findByIdAndDelete(commentId);
    await PostRepository.rawModel().updateOne({ _id: postId }, { $inc: { commentCount: -1 } });

    res.status(200).json({ message: "Xóa bình luận thành công." });

  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};
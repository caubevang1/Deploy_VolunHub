// src/controllers/comment.controller.js
import Comment from '../models/comment.js';
import Post from '../models/post.js'; 
import Registration from '../models/registration.js';

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

    // 1. Tìm post để lấy eventId
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: "Không tìm thấy bài đăng." });
    }
    const eventId = post.event;

    // 2. Kiểm tra quyền (Chỉ member đã được duyệt hoặc admin/manager)
    const isManager = req.user.role === 'EVENTMANAGER' || req.user.role === 'ADMIN';
    const registration = await Registration.findOne({
      event: eventId,
      volunteer: userId,
      status: 'approved',
    });

    if (!isManager && !registration) {
      return res.status(403).json({ message: 'Bạn phải là thành viên đã được duyệt để bình luận.' });
    }

    // 3. Tạo comment
    const newComment = new Comment({
      content,
      author: userId,
      post: postId,
      event: eventId,
    });

    await newComment.save();
    
    // ✅ CẬP NHẬT: Tăng commentCount
    await Post.findByIdAndUpdate(postId, { $inc: { commentCount: 1 } });

    const populatedComment = await newComment.populate('author', 'name avatar');
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
    const comments = await Comment.find({ post: req.params.postId })
      .populate('author', 'name avatar')
      .sort({ createdAt: 1 }); // Sắp xếp từ cũ nhất
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

    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ message: "Không tìm thấy bình luận." });
    }

    const hasLiked = comment.likes.includes(userId);

    if (hasLiked) {
      // Đã like -> Unlike
      await comment.updateOne({ $pull: { likes: userId } });
    } else {
      // Chưa like -> Like
      await comment.updateOne({ $push: { likes: userId } });
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

    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ message: "Không tìm thấy bình luận." });
    }

    // Chỉ Admin hoặc chính tác giả mới được xóa
    if (userRole !== 'ADMIN' && comment.author.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'Bạn không có quyền xóa bình luận này.' });
    }

    // Lấy postId trước khi xóa
    const postId = comment.post; 
    
    await Comment.findByIdAndDelete(commentId);
    
    // ✅ CẬP NHẬT: Giảm commentCount
    await Post.findByIdAndUpdate(postId, { $inc: { commentCount: -1 } });

    res.status(200).json({ message: "Xóa bình luận thành công." });

  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};
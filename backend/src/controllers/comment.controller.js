// src/controllers/comment.controller.js
import CommentRepository from "../repositories/CommentRepository.js";
import PostRepository from "../repositories/PostRepository.js";
import RegistrationRepository from "../repositories/RegistrationRepository.js";

/**
 * [POST] /api/comments/post/:postId
 * Bình luận bài viết
 */
export const createComment = async (req, res) => {
  try {
    const { content } = req.body;
    const { postId } = req.params;
    const userId = req.user.id;

    if (!content)
      return res.status(400).json({ message: "Nội dung không được để trống." });

    const post = await PostRepository.findById(postId);
    if (!post)
      return res.status(404).json({ message: "Không tìm thấy bài đăng." });

    const eventId = post.event;
    const isManager =
      req.user.role === "EVENTMANAGER" || req.user.role === "ADMIN";

    // Kiểm tra xem người dùng có tham gia sự kiện không
    const isMember = await RegistrationRepository.checkMemberStatus(
      userId,
      eventId
    );

    if (!isManager && !isMember) {
      return res
        .status(403)
        .json({ message: "Bạn phải là thành viên để bình luận." });
    }

    const newComment = await CommentRepository.create({
      content,
      author: userId,
      post: postId,
      event: eventId,
    });

    // Tăng số lượng bình luận trong bài viết
    await PostRepository.incrementCommentCount(postId);

    // Lấy dữ liệu đã populate để Frontend render avatar/name của người vừa bình luận
    const populatedComment = await CommentRepository.getCommentWithAuthor(
      newComment.id
    );
    res.status(201).json(populatedComment);
  } catch (error) {
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

/**
 * [GET] /api/comments/post/:postId
 * Lấy danh sách bình luận của bài viết
 */
export const getPostComments = async (req, res) => {
  try {
    const comments = await CommentRepository.getByPostId(req.params.postId);
    res.status(200).json(comments);
  } catch (error) {
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

/**
 * [POST] /api/comments/:commentId/like
 * Thả tim bình luận
 */
export const toggleLikeComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.user.id;

    const comment = await CommentRepository.findById(commentId);
    if (!comment)
      return res.status(404).json({ message: "Không tìm thấy bình luận." });

    const hasLiked = await CommentRepository.checkUserLiked(commentId, userId);

    if (hasLiked) {
      await CommentRepository.pullLike(commentId, userId);
    } else {
      await CommentRepository.pushLike(commentId, userId);
    }

    res.status(200).json({ message: "Cập nhật like bình luận thành công." });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

/**
 * [DELETE] /api/comments/:commentId
 * Xóa bình luận
 */
export const deleteComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Lấy comment kèm author để kiểm tra quyền xóa
    const comment = await CommentRepository.getCommentWithAuthor(commentId);
    if (!comment)
      return res.status(404).json({ message: "Không tìm thấy bình luận." });

    // Lấy thông tin sự kiện để kiểm tra người quản lý
    const eventId = comment.event?.id || comment.event;
    const event = await EventRepository.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: "Không tìm thấy sự kiện." });
    }

    // Kiểm tra quyền: Admin, Event Manager (người tạo sự kiện), hoặc chủ nhân bình luận
    const authorId = comment.author?.id || comment.author;
    const eventCreatorId = event.createdBy?.id || event.createdBy;
    const isAdmin = userRole === "ADMIN";
    const isEventManager = String(eventCreatorId) === String(userId);
    const isAuthor = String(authorId) === String(userId);

    if (!isAdmin && !isEventManager && !isAuthor) {
      return res
        .status(403)
        .json({ message: "Bạn không có quyền xóa bình luận này." });
    }

    const postId = comment.post?.id || comment.post;
    await CommentRepository.findByIdAndDelete(commentId);

    // Giảm số lượng bình luận trong bài viết
    if (postId) {
      await PostRepository.decrementCommentCount(postId);
    }

    res.status(200).json({ message: "Xóa bình luận thành công." });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

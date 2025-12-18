// src/repositories/CommentRepository.js
import BaseRepository from "./BaseRepository.js";
import Comment from "../models/comment.js";

class CommentRepository extends BaseRepository {
  constructor() {
    super(Comment);
  }

  /**
   * Lấy bình luận kèm thông tin tác giả
   */
  async getCommentWithAuthor(commentId) {
    const res = await this.model.findById(commentId)
      .populate("author", "name avatar")
      .lean();
    return this.transform(res);
  }

  /**
   * Lấy danh sách bình luận theo bài đăng
   */
  async getByPostId(postId) {
    const res = await this.model.find({ post: postId })
      .populate("author", "name avatar")
      .sort({ createdAt: 1 })
      .lean();
    return this.transform(res);
  }

  /**
   * Kiểm tra người dùng đã like bình luận chưa
   */
  async checkUserLiked(commentId, userId) {
    const comment = await this.model.findById(commentId).lean();
    if (!comment || !comment.likes) return false;
    // So sánh string an toàn
    return comment.likes.some(id => id.toString() === userId.toString());
  }

  /**
   * Thêm like
   */
  async pushLike(commentId, userId) {
    return await this.model.updateOne(
      { _id: commentId }, 
      { $addToSet: { likes: userId } }
    );
  }

  /**
   * Xóa like
   */
  async pullLike(commentId, userId) {
    return await this.model.updateOne(
      { _id: commentId }, 
      { $pull: { likes: userId } }
    );
  }

  /**
   * Tìm bình luận mới nhất (Admin Dashboard)
   */
  async findRecent(limit = 10) {
    const res = await this.model.find({})
      .populate("author", "name avatar")
      .populate("event", "name")
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    return this.transform(res);
  }

  /**
   * Lấy danh sách bình luận theo sự kiện
   */
  async getCommentsByEvent(eventId) {
    const res = await this.model.find({ event: eventId })
      .populate("author", "name avatar")
      .sort({ createdAt: -1 })
      .lean();
    return this.transform(res);
  }

  /**
   * Xóa tất cả bình luận thuộc một sự kiện
   */
  async deleteByEvent(eventId) {
    return await this.model.deleteMany({ event: eventId });
  }
}

export default new CommentRepository();
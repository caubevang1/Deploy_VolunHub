// src/repositories/CommentRepository.js
import BaseRepository from "./BaseRepository.js";
import Comment from "../models/comment.js";

class CommentRepository extends BaseRepository {
  constructor() {
    super(Comment);
  }

  /**
   * Helper chuẩn hóa dữ liệu trả về cho Controller (Xóa sạch _id và __v)
   */
  #mapToEntity(doc) {
    if (!doc) return null;
    if (Array.isArray(doc)) return doc.map(d => this.#mapToEntity(d));
    
    const obj = { ...doc, id: doc._id?.toString() || doc.id };
    delete obj._id;
    delete obj.__v;

    // Xử lý đệ quy cho các trường đã populate (author, event, user, post)
    const populateFields = ['author', 'event', 'user', 'post'];
    populateFields.forEach(field => {
      if (obj[field] && typeof obj[field] === 'object') {
        obj[field].id = obj[field]._id?.toString() || obj[field].id;
        delete obj[field]._id;
      }
    });
    
    return obj;
  }

  /**
   * Lấy bình luận kèm thông tin tác giả
   */
  async getCommentWithAuthor(commentId) {
    const res = await this.findById(commentId, null, "author");
    return this.#mapToEntity(res);
  }

  /**
   * Lấy danh sách bình luận theo bài đăng
   */
  async getByPostId(postId) {
    const res = await this.find(
      { post: postId }, 
      null, 
      { sort: { createdAt: 1 } }, 
      "author"
    );
    return this.#mapToEntity(res);
  }

  /**
   * Lấy danh sách bình luận theo sự kiện
   */
  async getCommentsByEvent(eventId) {
    const res = await this.find(
      { event: eventId }, 
      null, 
      { sort: { createdAt: -1 } }, 
      "author"
    );
    return this.#mapToEntity(res);
  }

  /**
   * Kiểm tra người dùng đã like bình luận chưa
   */
  async checkUserLiked(commentId, userId) {
    const comment = await this.findById(commentId);
    if (!comment || !comment.likes) return false;
    // So sánh ID dạng string để đảm bảo tính độc lập CSDL
    return comment.likes.some(id => String(id) === String(userId));
  }

  /**
   * Thêm like ($addToSet giúp tránh trùng lặp)
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
    const res = await this.find(
      {}, 
      null, 
      { sort: { createdAt: -1 }, limit }, 
      "event user"
    );
    return this.#mapToEntity(res);
  }

  /**
   * Xóa tất cả bình luận thuộc một sự kiện
   */
  async deleteByEvent(eventId) {
    return await this.deleteMany({ event: eventId });
  }
}

export default new CommentRepository();
// src/repositories/PostRepository.js
import BaseRepository from "./BaseRepository.js";
import Post from "../models/post.js";

class PostRepository extends BaseRepository {
  constructor() {
    super(Post);
  }

  /**
   * Helper chuẩn hóa dữ liệu trả về cho Controller
   */
  #mapToEntity(doc) {
    if (!doc) return null;
    if (Array.isArray(doc)) return doc.map(d => this.#mapToEntity(d));
    
    const obj = { ...doc, id: doc._id?.toString() || doc.id };
    delete obj._id;
    delete obj.__v;

    // Xử lý đệ quy cho các trường đã populate (author, event)
    if (obj.author && typeof obj.author === 'object') {
      obj.author.id = obj.author._id?.toString() || obj.author.id;
      delete obj.author._id;
    }
    if (obj.event && typeof obj.event === 'object') {
      obj.event.id = obj.event._id?.toString() || obj.event.id;
      delete obj.event._id;
    }
    
    return obj;
  }

  /**
   * Lấy bài viết kèm thông tin author
   */
  async getPostWithAuthor(postId) {
    const res = await this.findById(postId, null, "author");
    return this.#mapToEntity(res);
  }

  /**
   * Kiểm tra xem user đã like bài viết chưa
   */
  async checkUserLiked(postId, userId) {
    const post = await this.findById(postId);
    if (!post || !post.likes) return false;
    // So sánh chuỗi string để đảm bảo tính độc lập
    return post.likes.some(id => String(id) === String(userId));
  }

  /**
   * Lấy danh sách bài đăng của một sự kiện
   */
  async getPostsByEvent(eventId) {
    const res = await this.find(
      { event: eventId }, 
      null, 
      { sort: { createdAt: -1 } }, 
      "author"
    );
    return this.#mapToEntity(res);
  }

  /**
   * Tìm các bài đăng mới nhất (Dùng cho Admin Dashboard)
   */
  async findRecent(limit = 10) {
    const res = await this.find(
      {}, 
      null, 
      { sort: { createdAt: -1 }, limit }, 
      "event author"
    );
    return this.#mapToEntity(res);
  }

  /**
   * Xóa tất cả bài đăng thuộc một sự kiện
   */
  async deleteByEvent(eventId) {
    return await this.deleteMany({ event: eventId });
  }

  /**
   * Thêm User ID vào danh sách likes
   */
  async pushLike(postId, userId) {
    return await this.model.updateOne(
      { _id: postId }, 
      { $addToSet: { likes: userId } }
    );
  }

  /**
   * Xóa User ID khỏi danh sách likes
   */
  async pullLike(postId, userId) {
    return await this.model.updateOne(
      { _id: postId }, 
      { $pull: { likes: userId } }
    );
  }

  /**
   * Tăng số lượng bình luận
   */
  async incrementCommentCount(postId) {
    return await this.model.updateOne(
      { _id: postId }, 
      { $inc: { commentCount: 1 } }
    );
  }

  /**
   * Giảm số lượng bình luận
   */
  async decrementCommentCount(postId) {
    return await this.model.updateOne(
      { _id: postId }, 
      { $inc: { commentCount: -1 } }
    );
  }
}

export default new PostRepository();
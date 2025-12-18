// src/repositories/PostRepository.js
import mongoose from "mongoose";
import BaseRepository from "./BaseRepository.js";
import Post from "../models/post.js";

class PostRepository extends BaseRepository {
  constructor() {
    super(Post);
  }

  /**
   * Lấy bài viết kèm thông tin author
   */
  async getPostWithAuthor(postId) {
    const post = await this.model.findById(postId)
      .populate({ path: 'author', select: 'name avatar' })
      .lean();

    return this.transform(post);
  }

  /**
   * Kiểm tra xem user đã like bài viết chưa
   */
  async checkUserLiked(postId, userId) {
    // Luôn sử dụng _id khi làm việc trực tiếp với Model Driver
    const count = await this.model.countDocuments({ _id: postId, likes: userId });
    return count > 0;
  }

  /**
   * Lấy danh sách bài đăng của một sự kiện
   */
  async getPostsByEvent(eventId) {
    const posts = await this.model.find({ event: eventId })
      .populate({ path: "author", select: "name avatar" })
      .sort({ createdAt: -1 })
      .lean();

    return this.transform(posts);
  }

  /**
   * Tìm các bài đăng mới nhất (Admin Dashboard)
   */
  async findRecent(limit = 10) {
    const posts = await this.model.find({})
      .populate({ path: "author", select: "name avatar" })
      .populate({ path: "event", select: "name" })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    
    return this.transform(posts);
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
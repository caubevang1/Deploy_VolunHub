import BaseRepository from "./BaseRepository.js";
import Comment from "../models/comment.js";

class CommentRepository extends BaseRepository {
  constructor() {
    super(Comment);
  }

  // Thêm User ID vào mảng likes
  async pushLike(commentId, userId) {
    return await this.model.updateOne({ _id: commentId }, { $push: { likes: userId } });
  }

  // Xóa User ID khỏi mảng likes
  async pullLike(commentId, userId) {
    return await this.model.updateOne({ _id: commentId }, { $pull: { likes: userId } });
  }
}

export default new CommentRepository();
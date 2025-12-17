import BaseRepository from "./BaseRepository.js";
import Post from "../models/post.js";

class PostRepository extends BaseRepository {
  constructor() {
    super(Post);
  }

  // Thêm User ID vào danh sách likes
  async pushLike(postId, userId) {
    return await this.model.updateOne({ _id: postId }, { $push: { likes: userId } });
  }

  // Xóa User ID khỏi danh sách likes
  async pullLike(postId, userId) {
    return await this.model.updateOne({ _id: postId }, { $pull: { likes: userId } });
  }

  // Tăng số lượng bình luận (đã thêm ở bước trước)
  async incrementCommentCount(postId) {
    return await this.model.updateOne({ _id: postId }, { $inc: { commentCount: 1 } });
  }

  // Giảm số lượng bình luận (đã thêm ở bước trước)
  async decrementCommentCount(postId) {
    return await this.model.updateOne({ _id: postId }, { $inc: { commentCount: -1 } });
  }
}

export default new PostRepository();
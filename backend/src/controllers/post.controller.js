// src/controllers/post.controller.js
import PostRepository from "../repositories/PostRepository.js";
import EventRepository from "../repositories/EventRepository.js";

// [GET] /api/posts/event/:eventId -> Lấy tất cả bài post của 1 sự kiện
export const getEventPosts = async (req, res) => {
  try {
    const event = await EventRepository.findById(req.params.eventId);
    if (!event) {
      return res.status(404).json({ message: 'Không tìm thấy sự kiện.' });
    }
    if (event.status !== 'approved') {
      return res.status(403).json({ message: 'Sự kiện chưa được duyệt. Không thể xem bài viết.' });
    }

    const posts = await PostRepository.find(
      { event: req.params.eventId },
      null,
      { sort: { createdAt: -1 } },
      "author"
    );
    res.status(200).json(posts);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// [POST] /api/posts/event/:eventId -> Tạo bài post mới
export const createPost = async (req, res) => {
  try {
    const { content } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ message: "Nội dung không được để trống." });
    }

    const event = await EventRepository.findById(req.params.eventId);
    if (!event) {
      return res.status(404).json({ message: 'Không tìm thấy sự kiện.' });
    }
    if (event.status !== 'approved') {
      return res.status(403).json({ message: 'Chỉ có thể đăng bài khi sự kiện đã được duyệt.' });
    }

    const newPost = await PostRepository.create({
      content: content.trim(),
      author: req.user._id,
      event: req.params.eventId,
    });
    const populatedPost = await PostRepository.findOne({ _id: newPost._id }, null, "author");
    res.status(201).json(populatedPost);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// [POST] /api/posts/:postId/like -> Like hoặc Unlike một bài post
export const toggleLikePost = async (req, res) => {
  try {
    const postId = req.params.postId;
    const userId = req.user._id;

    const post = await PostRepository.findById(postId);
    if (!post) {
      return res.status(404).json({ message: "Không tìm thấy bài đăng." });
    }

    const hasLiked = (post.likes || []).some(id => String(id) === String(userId));
    if (hasLiked) {
      await PostRepository.rawModel().updateOne({ _id: postId }, { $pull: { likes: userId } });
    } else {
      await PostRepository.rawModel().updateOne({ _id: postId }, { $push: { likes: userId } });
    }
    const updatedPost = await PostRepository.findById(postId);
    res.status(200).json({ 
      message: "Cập nhật like thành công.",
      likesCount: updatedPost.likes.length,
      hasLiked: !hasLiked
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// ✅ [DELETE] /api/posts/:postId -> Xóa bài post
export const deletePost = async (req, res) => {
  try {
    const postId = req.params.postId;
    const userId = req.user._id;
    const userRole = req.user.role;

    const post = await PostRepository.findById(postId);
    if (!post) {
      return res.status(404).json({ message: "Không tìm thấy bài đăng." });
    }

    // Chỉ Admin hoặc chính tác giả mới được xóa
    if (userRole !== 'ADMIN' && post.author.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'Bạn không có quyền xóa bài đăng này.' });
    }

    await PostRepository.findByIdAndDelete(postId);
    res.status(200).json({ message: "Xóa bài đăng thành công." });

  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// getEventPosts: EventRepository.findById + PostRepository.find(..., populate: "author")
// createPost: PostRepository.create + PostRepository.findOne for populated response
// toggleLikePost: use PostRepository.rawModel().updateOne for $push/$pull then PostRepository.findById
// deletePost: PostRepository.findById + PostRepository.findByIdAndDelete
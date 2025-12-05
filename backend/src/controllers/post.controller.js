// src/controllers/post.controller.js
import Post from '../models/post.js';
import Event from '../models/event.js';

// [GET] /api/posts/event/:eventId -> Lấy tất cả bài post của 1 sự kiện
export const getEventPosts = async (req, res) => {
  try {
    // ✅ Kiểm tra event có tồn tại và được approved không
    const event = await Event.findById(req.params.eventId);
    if (!event) {
      return res.status(404).json({ message: 'Không tìm thấy sự kiện.' });
    }
    if (event.status !== 'approved') {
      return res.status(403).json({ message: 'Sự kiện chưa được duyệt. Không thể xem bài viết.' });
    }

    const posts = await Post.find({ event: req.params.eventId })
      .populate('author', 'name avatar')
      .sort({ createdAt: -1 });
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

    // ✅ Kiểm tra event có status = approved không
    const event = await Event.findById(req.params.eventId);
    if (!event) {
      return res.status(404).json({ message: 'Không tìm thấy sự kiện.' });
    }
    if (event.status !== 'approved') {
      return res.status(403).json({ message: 'Chỉ có thể đăng bài khi sự kiện đã được duyệt.' });
    }

    const newPost = new Post({
      content: content.trim(),
      author: req.user._id,
      event: req.params.eventId,
    });

    await newPost.save();
    const populatedPost = await newPost.populate('author', 'name avatar');
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

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: "Không tìm thấy bài đăng." });
    }

    const hasLiked = post.likes.includes(userId);

    if (hasLiked) {
      await post.updateOne({ $pull: { likes: userId } });
    } else {
      await post.updateOne({ $push: { likes: userId } });
    }

    // ✅ Trả về số likes mới
    const updatedPost = await Post.findById(postId);
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

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: "Không tìm thấy bài đăng." });
    }

    // Chỉ Admin hoặc chính tác giả mới được xóa
    if (userRole !== 'ADMIN' && post.author.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'Bạn không có quyền xóa bài đăng này.' });
    }

    await Post.findByIdAndDelete(postId);
    res.status(200).json({ message: "Xóa bài đăng thành công." });

  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};
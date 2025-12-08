// src/services/CommentService.js

// ✅ ĐÃ SỬA LỖI: Import biến http từ file BaseUrl.js trong thư mục utils
import { http } from "../utils/BaseUrl"; 

/**
 * [GET] Lấy danh sách bình luận của một bài post
 * @param {string} postId ID của bài viết
 */
export const GetPostComments = async (postId) => {
  const response = await http.get(`/comments/post/${postId}`); 
  return response;
};

/**
 * [POST] Tạo một bình luận mới
 * @param {string} postId ID của bài viết
 * @param {string} content Nội dung bình luận
 */
export const CreateComment = async (postId, content) => {
  const response = await http.post(`/comments/post/${postId}`, { content }); 
  return response;
};

/**
 * [POST] Like hoặc Unlike một bình luận
 * @param {string} commentId ID của bình luận
 */
export const ToggleLikeComment = async (commentId) => {
  const response = await http.post(`/comments/${commentId}/like`); 
  return response;
};

/**
 * [DELETE] Xóa một bình luận
 * @param {string} commentId ID của bình luận
 */
export const DeleteComment = async (commentId) => {
  const response = await http.delete(`/comments/${commentId}`); 
  return response;
};
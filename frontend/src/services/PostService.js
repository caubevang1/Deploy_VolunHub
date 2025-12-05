import { http } from "../utils/BaseUrl";

// Lấy danh sách posts của 1 event
export const GetEventPosts = (eventId) => http.get(`/posts/event/${eventId}`);

// Tạo post mới
export const CreatePost = (eventId, content) => http.post(`/posts/event/${eventId}`, { content });

// Like/Unlike post
export const ToggleLikePost = (postId) => http.post(`/posts/${postId}/like`);

// Xóa post
export const DeletePost = (postId) => http.delete(`/posts/${postId}`);

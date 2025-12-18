import { http } from "../utils/BaseUrl";

export const GetEventPosts = (eventId) => http.get(`/posts/event/${eventId}`);
export const CreatePost = (eventId, content) => http.post(`/posts/event/${eventId}`, { content });

// SỬA: Đảm bảo postId được truyền chính xác vào URL
export const ToggleLikePost = (postId) => http.post(`/posts/${postId}/like`);
export const DeletePost = (postId) => http.delete(`/posts/${postId}`);
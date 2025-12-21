import { http } from "../utils/BaseUrl";

export const GetPostComments = (postId) => http.get(`/comments/post/${postId}`);

export const CreateComment = (postId, content) => http.post(`/comments/post/${postId}`, { content });

export const ToggleLikeComment = (commentId) => http.post(`/comments/${commentId}/like`);

export const DeleteComment = (commentId) => http.delete(`/comments/${commentId}`);
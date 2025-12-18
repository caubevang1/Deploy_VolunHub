// src/services/StatsService.js
import { http } from "../utils/BaseUrl";

// Thống kê sự kiện công khai cho Dashboard User
export const GetAllEventsStats = () => http.get(`/events/public/stats`); // Chỉnh lại route cho rõ ràng

export const GetEventPosts = (eventId) => http.get(`/posts/event/${eventId}`);
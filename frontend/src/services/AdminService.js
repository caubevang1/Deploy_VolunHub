// frontend/src/services/AdminService.js
import { http } from "../utils/BaseUrl";

// User
export const GetUsers = () => http.get(`/admin/users`);
export const UpdateUserStatus = (userId, status) =>
  http.put(`/admin/users/${userId}/status`, { status });
export const UpdateUserRole = (userId, role) =>
  http.put(`/admin/users/${userId}/role`, { role });

// Event
export const GetEvents = () => http.get(`/admin/events/all`);
export const GetPendingEvents = () => http.get(`/admin/events/pending`);
export const ApproveEvent = (eventId) =>
  http.put(`/admin/events/${eventId}/approve`);
export const RejectEvent = (eventId, reason) =>
  http.put(`/admin/events/${eventId}/reject`, { reason });
export const DeleteEvent = (eventId) => http.delete(`/admin/events/${eventId}`);

// Chuẩn API chi tiết sự kiện cho Admin
export const GetEventDetail = (eventId) =>
  http.get(`/admin/events/${eventId}`);

// Dashboard
export const GetDashboardStats = () => http.get(`/admin/dashboard`);
export const GetTrendingEvents = (days = 7) =>
  http.get(`/admin/trending?days=${days}`);
export const GetRecentActivity = () => http.get(`/admin/recent-activity`);

// Export Data (responseType blob là bắt buộc để tải file)
export const ExportUsers = (format = "csv") =>
  http.get(`/admin/export/users?format=${format}`, { responseType: "blob" });
export const ExportEvents = (format = "csv") =>
  http.get(`/admin/export/events?format=${format}`, { responseType: "blob" });
export const ExportVolunteers = (format = "csv") =>
  http.get(`/admin/export/volunteers?format=${format}`, {
    responseType: "blob",
  });
// src/services/EventService.js
import { http } from "../utils/BaseUrl";

// Lấy danh sách sự kiện công khai
export const GetEvents = () => http.get(`/events/public`);

// Lấy chi tiết một sự kiện
export const GetEventDetail = (eventId) => http.get(`/events/public/${eventId}`);

// Lấy thống kê tương tác đơn lẻ
export const GetEventActionStats = (eventId) => http.get(`/actions/${eventId}/stats`);

// Lấy thống kê tương tác hàng loạt
export const GetEventsActionStatsBatch = (eventIds = []) =>
  http.post(`/actions/stats`, { eventIds });
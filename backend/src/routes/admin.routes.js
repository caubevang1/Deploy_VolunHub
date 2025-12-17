// backend/src/routes/admin.routes.js
import express from "express";
import { admin, verifyToken, eventManager } from "../middlewares/auth.js";
import {
  getPendingEvents,
  approveEvent,
  rejectEvent,
  deleteEventByAdmin,
  getAllSystemEvents,
  getEventDetail,
  getAllUsers,
  updateUserStatus,
  exportUsers,
  exportEvents,
  exportVolunteers,
  getDashboardStats,
  updateUserRole,
  getTrendingEvents,
  getRecentActivity,
  getVolunteerRanking,
  getEventManagerRanking,
} from "../controllers/admin.controller.js";

const router = express.Router();

// 1. Các route Dashboard & Activity (Cần đưa lên đầu để tránh bị trùng lặp)
router.get("/dashboard", verifyToken, eventManager, getDashboardStats);
router.get("/trending", verifyToken, eventManager, getTrendingEvents);
router.get("/recent-activity", verifyToken, eventManager, getRecentActivity);

// 2. NHÓM ROUTE SỰ KIỆN (Thứ tự cực kỳ quan trọng để tránh lỗi 404)
// Route tĩnh (như /all, /pending) PHẢI nằm trước route động (/:id)
router.get("/events/all", verifyToken, admin, getAllSystemEvents);
router.get("/events/pending", verifyToken, admin, getPendingEvents);

// Route lấy chi tiết sự kiện
router.get("/events/:id", verifyToken, eventManager, getEventDetail);

// 3. NHÓM ROUTE CHỈ DÀNH RIÊNG CHO ADMIN
// Các thao tác cập nhật trạng thái/duyệt
router.put("/events/:id/approve", verifyToken, admin, approveEvent);
router.put("/events/:id/reject", verifyToken, admin, rejectEvent);
router.delete("/events/:id", verifyToken, admin, deleteEventByAdmin);

// Quản lý người dùng
router.get("/users", verifyToken, admin, getAllUsers);
router.put("/users/:id/status", verifyToken, admin, updateUserStatus);
router.put("/users/:id/role", verifyToken, admin, updateUserRole);

// Xuất dữ liệu
router.get("/export/users", verifyToken, admin, exportUsers);
router.get("/export/events", verifyToken, admin, exportEvents);
router.get("/export/volunteers", verifyToken, admin, exportVolunteers);

// Ranking
router.get("/ranking", verifyToken, admin, getVolunteerRanking);
router.get("/ranking/managers", verifyToken, admin, getEventManagerRanking);

export default router;
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

// ==========================================
// NHÓM ROUTE DÀNH CHO CẢ ADMIN & EVENT MANAGER
// ==========================================

// Route lấy chi tiết sự kiện - Cho phép cả Admin và Event Manager truy cập
router.get("/events/:id", verifyToken, eventManager, getEventDetail);

// Các Dashboard/Activity chung nếu Manager cần xem
router.get("/dashboard", verifyToken, eventManager, getDashboardStats);
router.get("/trending", verifyToken, eventManager, getTrendingEvents);
router.get("/recent-activity", verifyToken, eventManager, getRecentActivity);

// ==========================================
// NHÓM ROUTE CHỈ DÀNH RIÊNG CHO ADMIN
// ==========================================
// Áp dụng middleware admin cho tất cả các route phía dưới dòng này
router.use(verifyToken, admin);

// --- QUẢN LÝ SỰ KIỆN (Quyền Admin) ---
router.get("/events/all", getAllSystemEvents);
router.get("/events/pending", getPendingEvents);
router.put("/events/:id/approve", approveEvent);
router.put("/events/:id/reject", rejectEvent);
router.delete("/events/:id", deleteEventByAdmin);

// --- QUẢN LÝ NGƯỜI DÙNG ---
router.get("/users", getAllUsers);
router.put("/users/:id/status", updateUserStatus);
router.put("/users/:id/role", updateUserRole);

// --- XUẤT DỮ LIỆU ---
router.get("/export/users", exportUsers);
router.get("/export/events", exportEvents);
router.get("/export/volunteers", exportVolunteers);

// --- RANKING ---
router.get("/ranking", getVolunteerRanking);
router.get("/ranking/managers", getEventManagerRanking);

export default router;
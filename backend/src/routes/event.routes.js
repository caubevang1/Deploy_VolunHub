// src/routes/event.routes.js
import express from "express";
import * as EventController from "../controllers/event.controller.js";
import { verifyToken } from "../middlewares/auth.js";

const router = express.Router();

// =============================================================================
// ROUTES QUẢN LÝ SỰ KIỆN (EVENTS)
// =============================================================================

// --- PUBLIC ROUTES (Ai cũng xem được) ---

// [GET] /api/events/public
// 🌍 Lấy danh sách sự kiện công khai
// - Chức năng: Lấy danh sách các sự kiện đã được duyệt (APPROVED) và chưa kết thúc.
// - Trả về: Danh sách sự kiện (có phân trang, lọc).
router.get("/public", (req, res, next) => {
  if (typeof EventController.getApprovedEvents !== "function")
    return res.status(500).json({ message: "Controller handler missing: getApprovedEvents" });
  return EventController.getApprovedEvents(req, res, next);
});

// [GET] /api/events/public/:id
// ℹ️ Chi tiết sự kiện
// - Chức năng: Xem thông tin chi tiết của một sự kiện cụ thể.
// - Trả về: Object Event chi tiết.
router.get("/public/:id", (req, res, next) => {
  if (typeof EventController.getEventDetails !== "function")
    return res.status(500).json({ message: "Controller handler missing: getEventDetails" });
  return EventController.getEventDetails(req, res, next);
});

// [GET] /api/events/public/:id/participants
// 👥 Danh sách người tham gia (Công khai)
// - Chức năng: Xem danh sách những người đã được duyệt tham gia sự kiện này.
// - Trả về: Danh sách user (tên, avatar).
router.get("/public/:id/participants", (req, res, next) => {
  if (typeof EventController.getEventParticipants !== "function")
    return res.status(500).json({ message: "Controller handler missing: getEventParticipants" });
  return EventController.getEventParticipants(req, res, next);
});

// --- MANAGER ROUTES (Yêu cầu quyền Event Manager) ---

// [GET] /api/events/my-events
// 📂 Sự kiện của tôi
// - Chức năng: Manager xem danh sách các sự kiện do chính mình tạo ra.
// - Trả về: Danh sách sự kiện của manager.
router.get("/my-events", verifyToken, (req, res, next) => {
  if (typeof EventController.getMyEvents !== "function")
    return res.status(500).json({ message: "Controller handler missing: getMyEvents" });
  return EventController.getMyEvents(req, res, next);
});

// [GET] /api/events/management/:id
// 🛠️ Chi tiết sự kiện (Góc nhìn quản lý)
// - Chức năng: Xem chi tiết sự kiện bao gồm cả các thông tin ẩn/nội bộ (cho Admin/Manager).
// - Trả về: Object Event đầy đủ.
router.get("/management/:id", verifyToken, (req, res, next) => {
  if (typeof EventController.getEventDetailsForManagement !== "function")
    return res.status(500).json({ message: "Controller handler missing: getEventDetailsForManagement" });
  return EventController.getEventDetailsForManagement(req, res, next);
});

export default router;

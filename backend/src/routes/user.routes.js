// src/routes/user.routes.js
import express from "express";
import {
  getVolunteerRanking,
  getEventManagerRanking,
} from "../controllers/admin.controller.js";

const router = express.Router();

// =============================================================================
// PUBLIC ROUTES - Không cần đăng nhập
// =============================================================================

// [GET] /api/users/ranking
// 🏆 Lấy bảng xếp hạng tình nguyện viên
// - Chức năng: Public route để mọi người xem ranking
// - Trả về: Mảng volunteers với rank, points, completedEvents
router.get("/ranking", getVolunteerRanking);

// [GET] /api/users/ranking/managers
// 🏆 Lấy bảng xếp hạng quản lý sự kiện
// - Chức năng: Public route để mọi người xem ranking event managers
// - Trả về: Mảng managers với rank, totalEvents, completedEvents, totalVolunteers, score
router.get("/ranking/managers", getEventManagerRanking);

export default router;

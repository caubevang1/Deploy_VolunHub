// src/routes/user.routes.js
import express from "express";
import { getVolunteerRanking } from "../controllers/admin.controller.js";

const router = express.Router();

// =============================================================================
// PUBLIC ROUTES - Không cần đăng nhập
// =============================================================================

// [GET] /api/users/ranking
// 🏆 Lấy bảng xếp hạng tình nguyện viên
// - Chức năng: Public route để mọi người xem ranking
// - Trả về: Mảng volunteers với rank, points, completedEvents
router.get("/ranking", getVolunteerRanking);

export default router;

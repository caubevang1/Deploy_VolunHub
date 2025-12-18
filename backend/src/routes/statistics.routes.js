// src/routes/statistics.routes.js
import express from "express";
import {
  getVolunteerStatistics,
  getVolunteerStatisticsByMonth,
  getManagerStatistics,
  getManagerMonthlyStats,
  getRanking,
  getAllEventsForAllUsers
} from "../controllers/statistics.controller.js";
import { verifyToken, eventManager } from "../middlewares/auth.js";

const router = express.Router();

// --- VOLUNTEER ---
router.get("/volunteer", verifyToken, getVolunteerStatistics);
router.get("/volunteer/monthly", verifyToken, getVolunteerStatisticsByMonth);

// --- MANAGER ---
router.get("/manager", verifyToken, eventManager, getManagerStatistics);
router.get("/manager/monthly", verifyToken, eventManager, getManagerMonthlyStats);

// --- GENERAL (PUBLIC-FRIENDLY) ---
// Loại bỏ verifyToken để Dashboard tải nhanh và không lỗi 500/401 khi chưa login
router.get("/events", getAllEventsForAllUsers); 
router.get("/ranking", getRanking);

export default router;
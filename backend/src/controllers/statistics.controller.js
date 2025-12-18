// src/controllers/statistics.controller.js
import EventRepository from "../repositories/EventRepository.js";
import RegistrationRepository from "../repositories/RegistrationRepository.js";
import UserRepository from "../repositories/UserRepository.js";

/**
 * 📊 Thống kê tổng quan cho Volunteer
 */
export const getVolunteerStatistics = async (req, res) => {
  try {
    const volunteerId = req.user.id;
    const stats = await RegistrationRepository.getVolunteerDashboardStats(volunteerId);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ message: "Lỗi lấy thống kê", error: error.message });
  }
};

/**
 * 📅 Thống kê hoạt động theo tháng (Volunteer)
 */
export const getVolunteerStatisticsByMonth = async (req, res) => {
  try {
    const volunteerId = req.user.id;
    const year = parseInt(req.query.year) || new Date().getFullYear();
    const stats = await RegistrationRepository.getVolunteerMonthlyStats(volunteerId, year);
    res.json({ year, monthlyStats: stats });
  } catch (error) {
    res.status(500).json({ message: "Lỗi lấy thống kê tháng", error: error.message });
  }
};

/**
 * 📊 Thống kê tổng quan cho Event Manager
 */
export const getManagerStatistics = async (req, res) => {
  try {
    const managerId = req.user.id;
    const myEvents = await EventRepository.getEventsByManager(managerId);
    const eventIds = myEvents.map((e) => e.id);
    const regStats = await RegistrationRepository.getManagerOverviewStats(eventIds);

    res.json({
      totalEvents: myEvents.length,
      pendingEvents: myEvents.filter((e) => e.status === "pending").length,
      approvedEvents: myEvents.filter((e) => e.status === "approved").length,
      completedEvents: myEvents.filter((e) => e.status === "completed").length,
      ...regStats
    });
  } catch (error) {
    res.status(500).json({ message: "Lỗi thống kê manager", error: error.message });
  }
};

/**
 * 📈 Thống kê lượt đăng ký theo tháng (Event Manager)
 */
export const getManagerMonthlyStats = async (req, res) => {
  try {
    const managerId = req.user.id;
    const year = parseInt(req.query.year) || new Date().getFullYear();
    const myEvents = await EventRepository.getEventsByManager(managerId);
    const eventIds = myEvents.map((e) => e.id);
    const monthly = await RegistrationRepository.getManagerMonthlyRegistrationStats(eventIds, year);
    res.json({ year, monthly });
  } catch (error) {
    res.status(500).json({ message: "Lỗi thống kê tháng manager", error: error.message });
  }
};

/**
 * 🌍 Lấy toàn bộ sự kiện kèm thống kê đăng ký (Công khai cho Dashboard)
 */
export const getAllEventsForAllUsers = async (req, res) => {
  try {
    // Chỉ lấy các sự kiện đã duyệt để hiển thị dashboard công khai
    const events = await EventRepository.getEventsWithStats({ status: "approved" });

    if (!events || !events.length) {
      return res.status(200).json({ total: 0, events: [] });
    }

    const eventIds = events.map((e) => e.id);
    const statsMap = await RegistrationRepository.getRegistrationStatsBatch(eventIds);

    const result = events.map((e) => ({
      ...e,
      totalRegistrations: statsMap?.[e.id]?.totalRegistrations || 0,
      cancelRequests: statsMap?.[e.id]?.cancelRequests || 0,
    }));

    res.status(200).json({ total: result.length, events: result });
  } catch (error) {
    console.error("GetAllEventsStats Error:", error);
    res.status(500).json({ message: "Lỗi lấy danh sách sự kiện", error: error.message });
  }
};

/**
 * 🏆 Bảng xếp hạng Top 10 Volunteers
 */
export const getRanking = async (req, res) => {
  try {
    const leaderboard = await UserRepository.getTopVolunteers(10);
    res.status(200).json(leaderboard);
  } catch (error) {
    res.status(500).json({ message: "Lỗi lấy bảng xếp hạng", error: error.message });
  }
};
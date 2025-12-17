// src/controllers/statistics.controller.js
import EventRepository from "../repositories/EventRepository.js";
import RegistrationRepository from "../repositories/RegistrationRepository.js";
import UserRepository from "../repositories/UserRepository.js";

/**
 * @desc Lấy thống kê tổng quan cho một volunteer
 * @route GET /api/statistics/volunteer/overview
 * @access Private (Volunteer)
 */
export const getVolunteerStatistics = async (req, res) => {
  try {
    const volunteerId = req.user._id;

    const totalRegistrations = await RegistrationRepository.countDocuments({
      volunteer: volunteerId,
    });

    const totalCompleted = await RegistrationRepository.countDocuments({
      volunteer: volunteerId,
      status: "completed",
    });

    const totalApproved = await RegistrationRepository.countDocuments({
      volunteer: volunteerId,
      status: "approved",
    });

    const totalPending = await RegistrationRepository.countDocuments({
      volunteer: volunteerId,
      status: "pending",
    });

    const totalCancelRequests = await RegistrationRepository.countDocuments({
      volunteer: volunteerId,
      cancelRequest: true,
    });

    const completionRate = totalRegistrations
      ? ((totalCompleted / totalRegistrations) * 100).toFixed(2)
      : 0;
    const approvalRate = totalRegistrations
      ? ((totalApproved / totalRegistrations) * 100).toFixed(2)
      : 0;

    res.json({
      totalRegistrations,
      totalCompleted,
      totalApproved,
      totalPending,
      totalCancelRequests,
      completionRate,
      approvalRate,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Lỗi khi lấy thống kê", error: error.message });
  }
};

/**
 * @desc Thống kê chi tiết hoạt động volunteer theo tháng
 * @route GET /api/statistics/volunteer/monthly?year=YYYY
 * @access Private (Volunteer)
 */
export const getVolunteerStatisticsByMonth = async (req, res) => {
  try {
    const volunteerId = req.user._id;
    const year = parseInt(req.query.year) || new Date().getFullYear();

    const regs = await RegistrationRepository.find({
      volunteer: volunteerId,
      createdAt: {
        $gte: new Date(`${year}-01-01`),
        $lte: new Date(`${year}-12-31`),
      },
    });

    const stats = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      total: 0,
      completed: 0,
      approved: 0,
      pending: 0,
    }));

    regs.forEach((r) => {
      const month = new Date(r.createdAt).getMonth();
      stats[month].total++;
      if (r.status === "completed") stats[month].completed++;
      if (r.status === "approved") stats[month].approved++;
      if (r.status === "pending") stats[month].pending++;
    });

    res.json({ year, monthlyStats: stats });
  } catch (error) {
    res.status(500).json({
      message: "Lỗi khi lấy thống kê theo tháng",
      error: error.message,
    });
  }
};

/**
 * @desc Thống kê tổng quan cho Event Manager
 * @route GET /api/statistics/manager/overview
 * @access Private (Manager)
 */
export const getManagerStatistics = async (req, res) => {
  try {
    const managerId = req.user._id;

    const myEvents = await EventRepository.find({ createdBy: managerId }, "_id status");
    const eventIds = myEvents.map((e) => e._id);

    const totalEvents = myEvents.length;
    const pendingEvents = myEvents.filter((e) => e.status === "pending").length;
    const approvedEvents = myEvents.filter((e) => e.status === "approved").length;
    const completedEvents = myEvents.filter((e) => e.status === "completed").length;

    const [totalRegistrations, totalCancelRequests] = await Promise.all([
      RegistrationRepository.countDocuments({ event: { $in: eventIds } }),
      RegistrationRepository.countDocuments({ event: { $in: eventIds }, cancelRequest: true }),
    ]);

    res.json({
      totalEvents,
      pendingEvents,
      approvedEvents,
      completedEvents,
      totalRegistrations,
      totalCancelRequests,
    });
  } catch (error) {
    res.status(500).json({ message: "Lỗi khi lấy thống kê manager", error: error.message });
  }
};

/**
 * @desc Thống kê lượt đăng ký theo tháng cho Event Manager
 * @route GET /api/statistics/manager/monthly?year=YYYY
 * @access Private (Manager)
 */
export const getManagerMonthlyStats = async (req, res) => {
  try {
    const managerId = req.user._id;
    const year = parseInt(req.query.year) || new Date().getFullYear();

    const myEvents = await EventRepository.find({ createdBy: managerId }).select("_id");
    const eventIds = myEvents.map((e) => e._id);

    const regs = await RegistrationRepository.find({
      event: { $in: eventIds },
      createdAt: {
        $gte: new Date(`${year}-01-01T00:00:00.000Z`),
        $lte: new Date(`${year}-12-31T23:59:59.999Z`),
      },
    }).select("createdAt");

    const monthly = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      registrations: 0,
    }));

    regs.forEach((r) => {
      const m = new Date(r.createdAt).getMonth(); // 0..11
      monthly[m].registrations++;
    });

    res.json({ year, monthly });
  } catch (error) {
    res.status(500).json({
      message: "Lỗi khi lấy thống kê tháng cho manager",
      error: error.message,
    });
  }
};

/**
 * @desc 📅 Lấy toàn bộ sự kiện trong hệ thống (tất cả user đều có thể xem)
 * @route GET /api/statistics/events
 * @access Private (Tất cả vai trò)
 */
export const getAllEventsForAllUsers = async (req, res) => {
  try {
    // Dùng repository
    const events = await EventRepository.find({}, null, { sort: { date: -1 } }, "createdBy");

    if (!events.length) {
      return res.status(200).json({
        message: "👀 Hiện tại chưa có sự kiện nào trong hệ thống.",
        events: [],
      });
    }

    const eventIds = events.map((e) => e._id);
    const registrationStats = await RegistrationRepository.aggregate([
      { $match: { event: { $in: eventIds } } },
      {
        $group: {
          _id: "$event",
          totalRegistrations: { $sum: 1 },
          cancelRequests: {
            $sum: { $cond: [{ $eq: ["$cancelRequest", true] }, 1, 0] },
          },
        },
      },
    ]);

    const statsMap = registrationStats.reduce((acc, s) => {
      acc[s._id.toString()] = s;
      return acc;
    }, {});

    const result = events.map((e) => ({
      ...e,
      totalRegistrations: statsMap[e._id]?.totalRegistrations || 0,
      cancelRequests: statsMap[e._id]?.cancelRequests || 0,
    }));

    res.status(200).json({
      total: result.length,
      events: result,
    });
  } catch (error) {
    console.error("❌ Lỗi khi lấy danh sách sự kiện:", error);
    res.status(500).json({
      message: "Lỗi khi lấy danh sách sự kiện",
      error: error.message,
    });
  }
};

// [GET] /api/statistics/ranking -> Lấy Top 10 thành viên điểm cao nhất
export const getRanking = async (req, res) => {
  try {
    const leaderboard = await UserRepository.find(
      { role: "VOLUNTEER" },
      "name avatar points email",
      { sort: { points: -1 }, limit: 10 }
    );

    res.status(200).json(leaderboard);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Lỗi lấy bảng xếp hạng", error: error.message });
  }
};

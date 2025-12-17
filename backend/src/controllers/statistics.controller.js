// src/controllers/statistics.controller.js
import EventRepository from "../repositories/EventRepository.js";
import RegistrationRepository from "../repositories/RegistrationRepository.js";
import UserRepository from "../repositories/UserRepository.js";

/**
 * 📊 Thống kê tổng quan cho Volunteer
 */
export const getVolunteerStatistics = async (req, res) => {
  try {
    const volunteerId = req.user._id;

    const [totalRegistrations, totalCompleted, totalApproved, totalPending, totalCancelRequests] = 
      await Promise.all([
        RegistrationRepository.countDocuments({ volunteer: volunteerId }),
        RegistrationRepository.countDocuments({ volunteer: volunteerId, status: "completed" }),
        RegistrationRepository.countDocuments({ volunteer: volunteerId, status: "approved" }),
        RegistrationRepository.countDocuments({ volunteer: volunteerId, status: "pending" }),
        RegistrationRepository.countDocuments({ volunteer: volunteerId, cancelRequest: true }),
      ]);

    const completionRate = totalRegistrations ? ((totalCompleted / totalRegistrations) * 100).toFixed(2) : 0;
    const approvalRate = totalRegistrations ? ((totalApproved / totalRegistrations) * 100).toFixed(2) : 0;

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
    res.status(500).json({ message: "Lỗi lấy thống kê", error: error.message });
  }
};

/**
 * 📅 Thống kê hoạt động theo tháng (Volunteer)
 */
export const getVolunteerStatisticsByMonth = async (req, res) => {
  try {
    const volunteerId = req.user._id;
    const year = parseInt(req.query.year) || new Date().getFullYear();

    // SỬA: Không viết $gte/$lte ở đây, dùng hàm Repository để đóng gói logic thời gian
    const regs = await RegistrationRepository.findByTimeRange({
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
    res.status(500).json({ message: "Lỗi lấy thống kê tháng", error: error.message });
  }
};

/**
 * 📊 Thống kê tổng quan cho Event Manager
 */
export const getManagerStatistics = async (req, res) => {
  try {
    const managerId = req.user._id;
    const myEvents = await EventRepository.find({ createdBy: managerId }, "_id status");
    const eventIds = myEvents.map((e) => e._id);

    const [totalRegistrations, totalCancelRequests] = await Promise.all([
      RegistrationRepository.countDocuments({ event: { $in: eventIds } }),
      RegistrationRepository.countDocuments({ event: { $in: eventIds }, cancelRequest: true }),
    ]);

    res.json({
      totalEvents: myEvents.length,
      pendingEvents: myEvents.filter((e) => e.status === "pending").length,
      approvedEvents: myEvents.filter((e) => e.status === "approved").length,
      completedEvents: myEvents.filter((e) => e.status === "completed").length,
      totalRegistrations,
      totalCancelRequests,
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
    const managerId = req.user._id;
    const year = parseInt(req.query.year) || new Date().getFullYear();

    const myEvents = await EventRepository.find({ createdBy: managerId }, "_id");
    const eventIds = myEvents.map((e) => e._id);

    const regs = await RegistrationRepository.findByTimeRange({
      event: { $in: eventIds },
      createdAt: {
        $gte: new Date(`${year}-01-01T00:00:00.000Z`),
        $lte: new Date(`${year}-12-31T23:59:59.999Z`),
      },
    });

    const monthly = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      registrations: 0,
    }));

    regs.forEach((r) => {
      monthly[new Date(r.createdAt).getMonth()].registrations++;
    });

    res.json({ year, monthly });
  } catch (error) {
    res.status(500).json({ message: "Lỗi thống kê tháng manager", error: error.message });
  }
};

/**
 * 🌍 Lấy toàn bộ sự kiện kèm thống kê đăng ký
 */
export const getAllEventsForAllUsers = async (req, res) => {
  try {
    const events = await EventRepository.find({}, null, { sort: { date: -1 } }, "createdBy");

    if (!events.length) {
      return res.status(200).json({ message: "Chưa có sự kiện nào", events: [] });
    }

    const eventIds = events.map((e) => e._id);
    
    // SỬA: Thay thế logic Aggregate trực tiếp bằng hàm nghiệp vụ trong Repository
    const registrationStats = await RegistrationRepository.getRegistrationStatsBatch(eventIds);

    const statsMap = registrationStats.reduce((acc, s) => {
      acc[s._id.toString()] = s;
      return acc;
    }, {});

    const result = events.map((e) => ({
      ...e,
      totalRegistrations: statsMap[e._id.toString()]?.totalRegistrations || 0,
      cancelRequests: statsMap[e._id.toString()]?.cancelRequests || 0,
    }));

    res.status(200).json({ total: result.length, events: result });
  } catch (error) {
    res.status(500).json({ message: "Lỗi lấy danh sách sự kiện", error: error.message });
  }
};

/**
 * 🏆 Bảng xếp hạng Top 10 Volunteers
 */
export const getRanking = async (req, res) => {
  try {
    const leaderboard = await UserRepository.find(
      { role: "VOLUNTEER" },
      "name avatar points email",
      { sort: { points: -1 }, limit: 10 }
    );
    res.status(200).json(leaderboard);
  } catch (error) {
    res.status(500).json({ message: "Lỗi lấy bảng xếp hạng", error: error.message });
  }
};
// src/controllers/dashboard.controller.js
import RegistrationRepository from "../repositories/RegistrationRepository.js";
import EventRepository from "../repositories/EventRepository.js";

/**
 * 📊 Dashboard cho Volunteer
 * - Hiển thị sự kiện đã hoàn thành, đang tham gia, sắp tham gia, chờ duyệt
 */
export const getVolunteerDashboard = async (req, res) => {
  try {
    // Lấy ID của tình nguyện viên từ thông tin user đã được xác thực
    const volunteerId = req.user._id;
    const now = new Date(); // Lấy thời gian hiện tại

    // Tìm tất cả các đơn đăng ký của tình nguyện viên và populate thông tin sự kiện
    const registrations = await RegistrationRepository.find(
      { volunteer: volunteerId },
      null,
      { sort: { createdAt: -1 } },
      "event"
    );

    // Lọc các sự kiện đã hoàn thành
    const completedEvents = registrations.filter(
      (r) => r.status === "completed"
    );

    // Lọc các sự kiện đang diễn ra (đã được duyệt và ngày diễn ra <= hiện tại)
    const currentEvents = registrations.filter(
      (r) => r.status === "approved" && new Date(r.event?.date) <= now
    );

    // Lọc các sự kiện sắp diễn ra (đã được duyệt và ngày diễn ra > hiện tại)
    const upcomingEvents = registrations.filter(
      (r) => r.status === "approved" && new Date(r.event?.date) > now
    );

    // Lọc các sự kiện đang chờ duyệt
    const pendingEvents = registrations.filter((r) => r.status === "pending");

    // Trả về dữ liệu dashboard
    res.json({
      completedEvents,
      currentEvents,
      upcomingEvents,
      pendingEvents,
    });
  } catch (error) {
    // Xử lý lỗi nếu có
    res.status(500).json({
      message: "Lỗi khi lấy dashboard volunteer",
      error: error.message,
    });
  }
};

/**
 * 📅 Danh sách sự kiện do Manager tạo
 */
export const getManagerEvents = async (req, res) => {
  try {
    const managerId = req.user._id;

    // Tìm tất cả sự kiện do manager này tạo, sắp xếp theo ngày
    const events = await EventRepository.find(
      { createdBy: managerId },
      "_id name date location status category rejectionReason",
      { sort: { date: 1 } }
    );

    // Lấy danh sách ID của các sự kiện
    const eventIds = events.map((e) => e._id);

    // Sử dụng aggregation để đếm số lượt đăng ký và yêu cầu hủy cho mỗi sự kiện
    const regStats = await RegistrationRepository.aggregate([
      { $match: { event: { $in: eventIds } } }, // Chỉ lấy các đăng ký thuộc sự kiện của manager
      {
        $group: {
          _id: "$event", // Nhóm theo ID sự kiện
          totalRegistrations: { $sum: 1 }, // Đếm tổng số đăng ký
          cancelRequests: { $sum: { $cond: ["$cancelRequest", 1, 0] } }, // Đếm số yêu cầu hủy
        },
      },
    ]);

    // Chuyển kết quả aggregation thành một Map để dễ dàng tra cứu
    const counts = new Map(regStats.map((r) => [String(r._id), r]));

    // Kết hợp thông tin sự kiện với thống kê đăng ký
    const data = events.map((e) => {
      const stats = counts.get(String(e._id)) || {
        totalRegistrations: 0,
        cancelRequests: 0,
      };
      return {
        _id: e._id,
        name: e.name,
        date: e.date,
        location: e.location,
        status: e.status,
        category: e.category,
        rejectionReason: e.rejectionReason,
        totalRegistrations: stats.totalRegistrations,
        cancelRequests: stats.cancelRequests,
      };
    });

    // Trả về danh sách sự kiện kèm thống kê
    res.json(data);
  } catch (error) {
    // Xử lý lỗi nếu có
    res.status(500).json({
      message: "Lỗi khi lấy danh sách sự kiện của manager",
      error: error.message,
    });
  }
};

// getManagerEventRegistrations / approveCancelRequest / rejectCancelRequest use RegistrationRepository.rawModel() where populate needed
export const getManagerEventRegistrations = async (req, res) => {
  try {
    const managerId = req.user._id;
    const { eventId } = req.params;

    const eventDoc = await EventRepository.rawModel().findById(eventId).select("createdBy");
    if (!eventDoc) return res.status(404).json({ message: "Không tìm thấy sự kiện" });

    if (String(eventDoc.createdBy) !== String(managerId)) {
      return res.status(403).json({ message: "Bạn không có quyền xem đăng ký cho sự kiện này" });
    }

    const regs = await RegistrationRepository.find({ event: eventId }, null, { sort: { createdAt: -1 } }, "volunteer");
    res.json(regs);
  } catch (error) {
    res.status(500).json({
      message: "Lỗi khi lấy danh sách đăng ký",
      error: error.message,
    });
  }
};

export const approveCancelRequest = async (req, res) => {
  try {
    const managerId = req.user._id;
    const { id } = req.params;

    const regDoc = await RegistrationRepository.rawModel().findById(id).populate("event");
    if (!regDoc) return res.status(404).json({ message: "Không tìm thấy đăng ký" });

    if (String(regDoc.event.createdBy) !== String(managerId)) {
      return res.status(403).json({ message: "Bạn không có quyền phê duyệt yêu cầu này" });
    }

    if (!regDoc.cancelRequest || regDoc.status !== "approved") {
      return res.status(400).json({ message: "Yêu cầu hủy không hợp lệ" });
    }

    await RegistrationRepository.findByIdAndUpdate(id, { status: "cancelled", cancelRequest: false });
    res.json({ message: "✅ Đã chấp thuận yêu cầu hủy" });
  } catch (error) {
    res.status(500).json({
      message: "Lỗi khi phê duyệt yêu cầu hủy",
      error: error.message,
    });
  }
};

export const rejectCancelRequest = async (req, res) => {
  try {
    const managerId = req.user._id;
    const { id } = req.params;

    const regDoc = await RegistrationRepository.rawModel().findById(id).populate("event");
    if (!regDoc) return res.status(404).json({ message: "Không tìm thấy đăng ký" });

    if (String(regDoc.event.createdBy) !== String(managerId)) {
      return res.status(403).json({ message: "Bạn không có quyền từ chối yêu cầu này" });
    }

    if (!regDoc.cancelRequest) {
      return res.status(400).json({ message: "Không có yêu cầu hủy để từ chối" });
    }

    await RegistrationRepository.findByIdAndUpdate(id, { cancelRequest: false });
    res.json({ message: "❌ Đã từ chối yêu cầu hủy" });
  } catch (error) {
    res.status(500).json({
      message: "Lỗi khi từ chối yêu cầu hủy",
      error: error.message,
    });
  }
};

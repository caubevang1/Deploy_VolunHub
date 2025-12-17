// src/controllers/dashboard.controller.js
import RegistrationRepository from "../repositories/RegistrationRepository.js";
import EventRepository from "../repositories/EventRepository.js";

/**
 * 📊 Dashboard cho Volunteer
 */
export const getVolunteerDashboard = async (req, res) => {
  try {
    const volunteerId = req.user._id;
    const now = new Date();

    // Sử dụng populate thông qua Repository (đúng chuẩn độc lập)
    const registrations = await RegistrationRepository.find(
      { volunteer: volunteerId },
      null,
      { sort: { createdAt: -1 } },
      "event"
    );

    const completedEvents = registrations.filter((r) => r.status === "completed");
    const currentEvents = registrations.filter(
      (r) => r.status === "approved" && r.event && new Date(r.event.date) <= now
    );
    const upcomingEvents = registrations.filter(
      (r) => r.status === "approved" && r.event && new Date(r.event.date) > now
    );
    const pendingEvents = registrations.filter((r) => r.status === "pending");

    res.json({ completedEvents, currentEvents, upcomingEvents, pendingEvents });
  } catch (error) {
    res.status(500).json({ message: "Lỗi khi lấy dashboard volunteer", error: error.message });
  }
};

/**
 * 📅 Danh sách sự kiện do Manager tạo kèm thống kê
 */
export const getManagerEvents = async (req, res) => {
  try {
    const managerId = req.user._id;

    const events = await EventRepository.find(
      { createdBy: managerId },
      "_id name date location status category rejectionReason",
      { sort: { date: 1 } }
    );

    const eventIds = events.map((e) => e._id);

    // GỌI HÀM NGHIỆP VỤ ĐÃ ĐƯỢC ĐÓNG GÓI TRONG REPOSITORY
    const regStats = await RegistrationRepository.getRegistrationStatsByEventIds(eventIds);

    const counts = new Map(regStats.map((r) => [String(r._id), r]));

    const data = events.map((e) => {
      const stats = counts.get(String(e._id)) || { totalRegistrations: 0, cancelRequests: 0 };
      // Sử dụng spread để tạo object mới (Plain Object), không dùng .toObject() của Mongoose
      return {
        ...e, 
        totalRegistrations: stats.totalRegistrations,
        cancelRequests: stats.cancelRequests,
      };
    });

    res.json(data);
  } catch (error) {
    res.status(500).json({ message: "Lỗi lấy danh sách sự kiện manager", error: error.message });
  }
};

/**
 * 👥 Lấy danh sách đăng ký của một sự kiện
 */
export const getManagerEventRegistrations = async (req, res) => {
  try {
    const { eventId } = req.params;

    const eventDoc = await EventRepository.findById(eventId, "createdBy");
    if (!eventDoc) return res.status(404).json({ message: "Không tìm thấy sự kiện" });

    if (String(eventDoc.createdBy) !== String(req.user._id)) {
      return res.status(403).json({ message: "Bạn không có quyền xem" });
    }

    const regs = await RegistrationRepository.find({ event: eventId }, null, { sort: { createdAt: -1 } }, "volunteer");
    res.json(regs);
  } catch (error) {
    res.status(500).json({ message: "Lỗi lấy danh sách đăng ký", error: error.message });
  }
};

/**
 * ✅ Phê duyệt yêu cầu hủy tham gia
 */
export const approveCancelRequest = async (req, res) => {
  try {
    const { id } = req.params;

    // Không dùng rawModel() ở đây nữa
    const regDoc = await RegistrationRepository.findById(id, null, "event");
    
    if (!regDoc || !regDoc.event) return res.status(404).json({ message: "Không tìm thấy dữ liệu" });

    if (String(regDoc.event.createdBy) !== String(req.user._id)) {
      return res.status(403).json({ message: "Bạn không có quyền" });
    }

    if (!regDoc.cancelRequest || regDoc.status !== "approved") {
      return res.status(400).json({ message: "Yêu cầu không hợp lệ" });
    }

    await RegistrationRepository.findByIdAndUpdate(id, { status: "cancelled", cancelRequest: false });
    res.json({ message: "✅ Đã chấp thuận yêu cầu hủy" });
  } catch (error) {
    res.status(500).json({ message: "Lỗi phê duyệt hủy", error: error.message });
  }
};

/**
 * ❌ Từ chối yêu cầu hủy tham gia
 */
export const rejectCancelRequest = async (req, res) => {
  try {
    const { id } = req.params;

    const regDoc = await RegistrationRepository.findById(id, null, "event");
    if (!regDoc || !regDoc.event) return res.status(404).json({ message: "Không tìm thấy dữ liệu" });

    if (String(regDoc.event.createdBy) !== String(req.user._id)) {
      return res.status(403).json({ message: "Bạn không có quyền" });
    }

    await RegistrationRepository.findByIdAndUpdate(id, { cancelRequest: false });
    res.json({ message: "❌ Đã từ chối yêu cầu hủy" });
  } catch (error) {
    res.status(500).json({ message: { error: error.message } });
  }
};
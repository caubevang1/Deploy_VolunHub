// src/controllers/dashboard.controller.js
import RegistrationRepository from "../repositories/RegistrationRepository.js";
import EventRepository from "../repositories/EventRepository.js";

/**
 * 📊 Dashboard cho Volunteer
 */
export const getVolunteerDashboard = async (req, res) => {
  try {
    const volunteerId = req.user.id;
    
    // Repo trả về object chứa 4 mảng đã map id sạch sẽ
    const dashboardData = await RegistrationRepository.getVolunteerDashboardData(volunteerId);

    res.json(dashboardData);
  } catch (error) {
    res.status(500).json({ message: "Lỗi khi lấy dashboard volunteer", error: error.message });
  }
};

/**
 * 📅 Danh sách sự kiện do Manager tạo kèm thống kê
 */
export const getManagerEvents = async (req, res) => {
  try {
    const managerId = req.user.id;

    // Repo tự lo việc lấy sự kiện và map id
    const events = await EventRepository.getEventsByManager(managerId);
    const eventIds = events.map((e) => e.id);

    // Lấy stats hàng loạt dưới dạng Map từ Repo
    const statsMap = await RegistrationRepository.getRegistrationStatsBatch(eventIds);

    const data = events.map((e) => {
      const stats = statsMap[e.id] || { totalRegistrations: 0, cancelRequests: 0 };
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

    const eventDoc = await EventRepository.findById(eventId);
    if (!eventDoc) return res.status(404).json({ message: "Không tìm thấy sự kiện" });

    // So sánh chuỗi ID sạch, không dùng gạch dưới
    if (String(eventDoc.createdBy) !== String(req.user.id)) {
      return res.status(403).json({ message: "Bạn không có quyền xem" });
    }

    const regs = await RegistrationRepository.getRegistrationsByEvent(eventId);
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

    const regDoc = await RegistrationRepository.findById(id, null, "event");
    if (!regDoc || !regDoc.event) return res.status(404).json({ message: "Không tìm thấy dữ liệu" });

    // createdBy trong event lúc này đã là string ID từ mapping của Repo
    if (String(regDoc.event.createdBy) !== String(req.user.id)) {
      return res.status(403).json({ message: "Bạn không có quyền" });
    }

    if (!regDoc.cancelRequest || regDoc.status !== "approved") {
      return res.status(400).json({ message: "Yêu cầu không hợp lệ" });
    }

    await RegistrationRepository.updateCancelStatus(id, "cancelled");
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

    if (String(regDoc.event.createdBy) !== String(req.user.id)) {
      return res.status(403).json({ message: "Bạn không có quyền" });
    }

    await RegistrationRepository.denyCancelRequest(id);
    res.json({ message: "❌ Đã từ chối yêu cầu hủy" });
  } catch (error) {
    res.status(500).json({ message: { error: error.message } });
  }
};
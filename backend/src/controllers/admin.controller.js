// src/controllers/admin.controller.js
import UserRepository from "../repositories/UserRepository.js";
import EventRepository from "../repositories/EventRepository.js";
import RegistrationRepository from "../repositories/RegistrationRepository.js";
import PostRepository from "../repositories/PostRepository.js";
import CommentRepository from "../repositories/CommentRepository.js";
import EventActionRepository from "../repositories/EventActionRepository.js";
import { sendPushNotification } from "../utils/sendPush.js";
import fs from "fs";
import path from "path";
import { Parser } from "json2csv";

// --- HELPERS ---

const formatDateValue = (value) =>
  value instanceof Date
    ? value.toISOString()
    : value
    ? new Date(value).toISOString()
    : "";

const sendExportResponse = (res, data, filenamePrefix, format, fields) => {
  const normalizedFormat = format === "json" ? "json" : "csv";
  const dateStamp = new Date().toISOString().split("T")[0];
  const filename = `${filenamePrefix}-${dateStamp}.${normalizedFormat}`;

  if (normalizedFormat === "json") {
    res.header("Content-Type", "application/json");
    res.attachment(filename);
    res.send(JSON.stringify(data, null, 2));
    return;
  }

  const derivedFields = fields && fields.length ? fields : Object.keys(data[0] || {});
  const parser = new Parser({ fields: derivedFields });
  const csv = data.length ? parser.parse(data) : "";
  res.header("Content-Type", "text/csv");
  res.attachment(filename);
  res.send(csv);
};

const deleteEventFiles = (event) => {
  const defaultCover = "default-event-image.jpg";
  const filesToDelete = [event.coverImage, ...(event.galleryImages || [])];
  filesToDelete.forEach(img => {
    if (img && img !== defaultCover && !img.startsWith("http")) {
      const p = path.join(process.cwd(), img);
      try { if (fs.existsSync(p)) fs.unlinkSync(p); } catch (e) {}
    }
  });
};

// --- QUẢN LÝ SỰ KIỆN ---

/**
 * Lấy chi tiết sự kiện cho Admin/Manager
 */
export const getEventDetail = async (req, res) => {
  try {
    const arr = await EventRepository.getEventsWithStats({ _id: req.params.id });
    if (!arr || arr.length === 0) return res.status(404).json({ message: "Không tìm thấy" });
    res.status(200).json(arr[0]);
  } catch (error) {
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

/**
 * Lấy danh sách sự kiện chờ duyệt
 */
export const getPendingEvents = async (req, res) => {
  try {
    const events = await EventRepository.getEventsWithStats({ status: "pending" });
    res.status(200).json(events);
  } catch (error) {
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

export const approveEvent = async (req, res) => {
  try {
    const event = await EventRepository.findByIdAndUpdate(req.params.id, { status: "approved" });
    if (!event) return res.status(404).json({ message: "Không tìm thấy sự kiện" });
    res.status(200).json({ message: "Duyệt sự kiện thành công", event });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

export const rejectEvent = async (req, res) => {
  try {
    const { reason } = req.body;
    const updateData = { status: "rejected", rejectionReason: reason || "Không có lý do cụ thể" };
    const event = await EventRepository.findByIdAndUpdate(req.params.id, updateData);

    if (!event) return res.status(404).json({ message: "Không tìm thấy sự kiện" });

    if (event.createdBy) {
      // createdBy bây giờ là một ID sau khi dùng findByIdAndUpdate (lean mặc định)
      await sendPushNotification(
        event.createdBy,
        "Sự kiện bị từ chối",
        `Sự kiện "${event.name}" đã bị từ chối. Lý do: ${updateData.rejectionReason}`,
        "/quanlisukien/su-kien"
      ).catch(err => console.error("Lỗi gửi thông báo:", err));
    }
    res.status(200).json({ message: "Từ chối sự kiện thành công", event });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

export const deleteEventByAdmin = async (req, res) => {
  try {
    const event = await EventRepository.findById(req.params.id);
    if (!event) return res.status(404).json({ message: "Không tìm thấy sự kiện" });

    deleteEventFiles(event);
    await EventRepository.findByIdAndDelete(req.params.id);
    await Promise.all([
      RegistrationRepository.deleteMany({ event: req.params.id }),
      PostRepository.deleteMany({ event: req.params.id }),
      CommentRepository.deleteMany({ event: req.params.id }),
    ]);
    res.status(200).json({ message: "Xóa sự kiện thành công" });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

/**
 * Lấy tất cả sự kiện trong hệ thống (Dùng cho bảng quản lý Admin)
 */
export const getAllSystemEvents = async (req, res) => {
  try {
    // Luôn sử dụng getEventsWithStats để có đủ dữ liệu render bảng
    const events = await EventRepository.getEventsWithStats({});
    res.status(200).json(events);
  } catch (error) {
    console.error("❌ Lỗi getAllSystemEvents:", error);
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

// --- QUẢN LÝ NGƯỜI DÙNG ---

export const getAllUsers = async (req, res) => {
  try {
    const users = await UserRepository.find({}, "-password");
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

export const updateUserStatus = async (req, res) => {
  try {
    const user = await UserRepository.findByIdAndUpdate(req.params.id, { status: req.body.status });
    if (!user) return res.status(404).json({ message: "Không tìm thấy người dùng" });
    res.status(200).json({ message: "Cập nhật trạng thái thành công", user });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

export const updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ message: "Admin không thể tự thay đổi vai trò chính mình." });
    }
    const updatedUser = await UserRepository.findByIdAndUpdate(req.params.id, { role: role.toUpperCase() });
    if (!updatedUser) return res.status(404).json({ message: "Không tìm thấy người dùng." });
    res.status(200).json({ message: "Cập nhật vai trò thành công.", user: updatedUser });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

// --- XUẤT DỮ LIỆU ---

export const exportUsers = async (req, res) => {
  try {
    const format = (req.query.format || "csv").toLowerCase();
    const users = await UserRepository.find({}, "-password -__v");
    const data = users.map(u => ({
      id: u._id.toString(), name: u.name || "", birthday: formatDateValue(u.birthday),
      gender: u.gender || "", phone: u.phone || "", email: u.email,
      role: u.role, status: u.status, points: u.points || 0
    }));
    sendExportResponse(res, data, "users-export", format);
  } catch (error) {
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

export const exportEvents = async (req, res) => {
  try {
    const format = (req.query.format || "csv").toLowerCase();
    const events = await EventRepository.getEventsWithStats({});
    const data = events.map(e => ({
      id: e._id.toString(), name: e.name || "", category: e.category || "",
      startDate: formatDateValue(e.date), endDate: formatDateValue(e.endDate),
      location: e.location || "", status: e.status || "", manager: e.createdBy?.name || "N/A"
    }));
    sendExportResponse(res, data, "events-export", format);
  } catch (error) {
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

export const exportVolunteers = async (req, res) => {
  try {
    const format = (req.query.format || "csv").toLowerCase();
    const volunteers = await UserRepository.find({ role: "VOLUNTEER" });
    const data = await Promise.all(volunteers.map(async (v) => {
      const completedEvents = await RegistrationRepository.countDocuments({ volunteer: v._id, status: "completed" });
      return {
        id: v._id.toString(), name: v.name || "", email: v.email || "",
        phone: v.phone || "", status: v.status || "", points: v.points || 0,
        completedEvents
      };
    }));
    sendExportResponse(res, data, "volunteers-export", format);
  } catch (error) {
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

// --- DASHBOARD & RANKINGS ---

export const getDashboardStats = async (req, res) => {
  try {
    const [totalUsers, totalEvents, pending, approved, rejected, completed] = await Promise.all([
      UserRepository.countDocuments(),
      EventRepository.countDocuments(),
      EventRepository.countDocuments({ status: "pending" }),
      EventRepository.countDocuments({ status: "approved" }),
      EventRepository.countDocuments({ status: "rejected" }),
      EventRepository.countDocuments({ status: "completed" }),
    ]);
    
    // Gửi đúng tên trường Frontend Admin đang chờ
    res.status(200).json({ 
      totalUsers, 
      totalEvents, 
      pendingEventsCount: pending, 
      approvedEventsCount: approved, 
      rejectedEventsCount: rejected, 
      completedEventsCount: completed 
    });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

export const getTrendingEvents = async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - parseInt(days));
    const events = await EventRepository.getEventsWithStats({ status: "approved" });
    const data = await Promise.all(events.map(async (e) => {
      const [reg, likes, shares] = await Promise.all([
        RegistrationRepository.countDocuments({ event: e._id, createdAt: { $gte: cutoffDate } }),
        EventActionRepository.countDocuments({ event: e._id, type: "LIKE", createdAt: { $gte: cutoffDate } }),
        EventActionRepository.countDocuments({ event: e._id, type: "SHARE", createdAt: { $gte: cutoffDate } })
      ]);
      return { ...e, recentRegistrations: reg, recentLikes: likes, recentShares: shares, trendingScore: reg * 3 + likes * 2 + shares * 5 };
    }));
    res.status(200).json(data.sort((a, b) => b.trendingScore - a.trendingScore).slice(0, 10));
  } catch (error) {
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

export const getRecentActivity = async (req, res) => {
  try {
    const recentlyPublished = await EventRepository.getEventsWithStats({ status: "approved" });
    const recentPosts = await PostRepository.find({}, null, { sort: { createdAt: -1 }, limit: 10 }, "event author");
    const recentComments = await CommentRepository.find({}, null, { sort: { createdAt: -1 }, limit: 10 }, "event user");
    res.status(200).json({ 
      recentlyPublished: recentlyPublished.slice(0, 5), 
      recentPosts, 
      recentComments 
    });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

export const getVolunteerRanking = async (req, res) => {
  try {
    const volunteers = await UserRepository.find({ role: "VOLUNTEER" }, "name email avatar points", { sort: { points: -1 }, limit: 10 });
    const data = await Promise.all(volunteers.map(async (v, i) => {
      const completedEvents = await RegistrationRepository.countDocuments({ volunteer: v._id, status: "completed" });
      return { ...v, rank: i + 1, completedEvents };
    }));
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

export const getEventManagerRanking = async (req, res) => {
  try {
    const managers = await UserRepository.find({ role: "EVENTMANAGER" }, "name email avatar");
    const data = await Promise.all(managers.map(async (m) => {
      const [total, approved, completed] = await Promise.all([
        EventRepository.countDocuments({ createdBy: m._id }),
        EventRepository.countDocuments({ createdBy: m._id, status: "approved" }),
        EventRepository.countDocuments({ createdBy: m._id, status: "completed" })
      ]);
      return { ...m, totalEvents: total, approvedEvents: approved, completedEvents: completed, score: completed * 10 + approved };
    }));
    res.status(200).json(data.sort((a, b) => b.score - a.score).map((m, i) => ({ ...m, rank: i + 1 })));
  } catch (error) {
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};
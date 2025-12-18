// src/controllers/admin.controller.js
import UserRepository from "../repositories/UserRepository.js";
import EventRepository from "../repositories/EventRepository.js";
import RegistrationRepository from "../repositories/RegistrationRepository.js";
import PostRepository from "../repositories/PostRepository.js";
import CommentRepository from "../repositories/CommentRepository.js";
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
    res.header("Content-Type", "application/json; charset=utf-8");
    res.attachment(filename);
    res.send(JSON.stringify(data, null, 2));
    return;
  }
  const derivedFields =
    fields && fields.length ? fields : Object.keys(data[0] || {});
  const parser = new Parser({ fields: derivedFields });
  const csv = data.length ? parser.parse(data) : "";
  // Prepend UTF-8 BOM so Excel recognizes UTF-8 encoded CSV (fixes Vietnamese characters)
  const csvWithBom = "\uFEFF" + csv;
  res.header("Content-Type", "text/csv; charset=utf-8");
  res.attachment(filename);
  res.send(csvWithBom);
};

const deleteEventFiles = (event) => {
  const defaultCover = "default-event-image.jpg";
  const filesToDelete = [event.coverImage, ...(event.galleryImages || [])];
  filesToDelete.forEach((img) => {
    if (img && img !== defaultCover && !img.startsWith("http")) {
      const p = path.join(process.cwd(), img);
      try {
        if (fs.existsSync(p)) fs.unlinkSync(p);
      } catch (e) {}
    }
  });
};

// --- QUẢN LÝ SỰ KIỆN ---

export const getEventDetail = async (req, res) => {
  try {
    const event = await EventRepository.getEventWithStatsById(req.params.id);
    if (!event)
      return res
        .status(404)
        .json({ message: "Không tìm thấy sự kiện trong CSDL" });
    res.status(200).json(event);
  } catch (error) {
    console.error("LỖI CONTROLLER DETAIL:", error);
    res
      .status(500)
      .json({ message: "Lỗi server chi tiết", error: error.message });
  }
};

export const getPendingEvents = async (req, res) => {
  try {
    const events = await EventRepository.getEventsByStatus("pending");
    res.status(200).json(events);
  } catch (error) {
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

export const approveEvent = async (req, res) => {
  try {
    const event = await EventRepository.updateStatus(req.params.id, "approved");
    if (!event)
      return res.status(404).json({ message: "Không tìm thấy sự kiện" });
    res.status(200).json({ message: "Duyệt sự kiện thành công", event });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

export const rejectEvent = async (req, res) => {
  try {
    const { reason } = req.body;
    const event = await EventRepository.rejectEvent(req.params.id, reason);
    if (!event)
      return res.status(404).json({ message: "Không tìm thấy sự kiện" });

    if (event.createdBy) {
      sendPushNotification(
        event.createdBy,
        "Sự kiện bị từ chối",
        `Sự kiện "${event.name}" đã bị từ chối. Lý do: ${
          reason || "Không có lý do cụ thể"
        }`,
        "/quanlisukien/su-kien"
      ).catch((err) => console.error("Lỗi gửi thông báo:", err));
    }
    res.status(200).json({ message: "Từ chối sự kiện thành công", event });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

export const deleteEventByAdmin = async (req, res) => {
  try {
    const eventId = req.params.id;
    const event = await EventRepository.findById(eventId);
    if (!event)
      return res.status(404).json({ message: "Không tìm thấy sự kiện" });

    deleteEventFiles(event);
    await EventRepository.findByIdAndDelete(eventId);

    await Promise.all([
      RegistrationRepository.deleteByEvent(eventId),
      PostRepository.deleteByEvent(eventId),
      CommentRepository.deleteByEvent(eventId),
    ]);
    res.status(200).json({ message: "Xóa sự kiện thành công" });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

export const getAllSystemEvents = async (req, res) => {
  try {
    const events = await EventRepository.getAllSystemEventsWithStats();
    res.status(200).json(events);
  } catch (error) {
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

// --- QUẢN LÝ NGƯỜI DÙNG ---

export const getAllUsers = async (req, res) => {
  try {
    const users = await UserRepository.findAllExceptPassword();
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

export const updateUserStatus = async (req, res) => {
  try {
    const user = await UserRepository.updateStatus(
      req.params.id,
      req.body.status
    );
    if (!user)
      return res.status(404).json({ message: "Không tìm thấy người dùng" });
    res.status(200).json({ message: "Cập nhật trạng thái thành công", user });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

export const updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    const userId = req.params.id;
    const currentAdminId = req.user.id;

    if (String(userId) === String(currentAdminId)) {
      return res
        .status(400)
        .json({ message: "Admin không thể tự thay đổi vai trò chính mình." });
    }
    const updatedUser = await UserRepository.updateRole(userId, role);
    if (!updatedUser)
      return res.status(404).json({ message: "Không tìm thấy người dùng." });
    res
      .status(200)
      .json({ message: "Cập nhật vai trò thành công.", user: updatedUser });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

// --- XUẤT DỮ LIỆU ---

export const exportUsers = async (req, res) => {
  try {
    const format = (req.query.format || "csv").toLowerCase();
    const data = await UserRepository.getUsersForExport();
    sendExportResponse(res, data, "users-export", format);
  } catch (error) {
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

export const exportEvents = async (req, res) => {
  try {
    const format = (req.query.format || "csv").toLowerCase();
    const events = await EventRepository.getAllSystemEventsWithStats();
    const data = events.map((e) => ({
      id: String(e.id),
      name: e.name || "",
      category: e.category || "",
      startDate: formatDateValue(e.date),
      endDate: formatDateValue(e.endDate),
      location: e.location || "",
      status: e.status || "",
      manager: e.createdBy?.name || "N/A",
    }));
    sendExportResponse(res, data, "events-export", format);
  } catch (error) {
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

export const exportVolunteers = async (req, res) => {
  try {
    const format = (req.query.format || "csv").toLowerCase();
    const data = await RegistrationRepository.getVolunteersExportData();
    sendExportResponse(res, data, "volunteers-export", format);
  } catch (error) {
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

// --- DASHBOARD & RANKINGS ---

export const getDashboardStats = async (req, res) => {
  try {
    const stats = await EventRepository.getAdminDashboardStats();
    const userCount = await UserRepository.countDocuments();
    res.status(200).json({ totalUsers: userCount, ...stats });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

export const getTrendingEvents = async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const data = await EventRepository.getTrendingEvents(parseInt(days));
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

export const getRecentActivity = async (req, res) => {
  try {
    const recentlyPublished = await EventRepository.getEventsByStatus(
      "approved"
    );

    // Đảm bảo không lỗi nếu các Repository khác chưa có dữ liệu
    let recentPosts = [];
    try {
      recentPosts = await PostRepository.findRecent(10);
    } catch (e) {}

    let recentComments = [];
    try {
      recentComments = await CommentRepository.findRecent(10);
    } catch (e) {}

    res.status(200).json({
      recentlyPublished: recentlyPublished.slice(0, 5),
      recentPosts,
      recentComments,
    });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

export const getVolunteerRanking = async (req, res) => {
  try {
    const data = await RegistrationRepository.getVolunteerRankingWithCompletion(
      10
    );
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

export const getEventManagerRanking = async (req, res) => {
  try {
    const data = await UserRepository.getManagerRankingWithStats(10);
    res.status(200).json(data);
  } catch (error) {
    console.error("EVENT MANAGER RANKING ERROR:", error);
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

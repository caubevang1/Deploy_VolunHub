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

  const derivedFields =
    fields && fields.length
      ? fields
      : Array.from(
          data.reduce((set, item) => {
            Object.keys(item || {}).forEach((key) => set.add(key));
            return set;
          }, new Set())
        );

  if (!derivedFields.length) {
    res.header("Content-Type", "text/csv");
    res.attachment(filename);
    res.send("");
    return;
  }

  const parser = new Parser({ fields: derivedFields });
  const csv = parser.parse(data);
  res.header("Content-Type", "text/csv");
  res.attachment(filename);
  res.send(csv);
};

// --- HÀM HỖ TRỢ XÓA FILE ---
const deleteEventFiles = (event) => {
  const defaultCover = "default-event-image.jpg";
  // Xóa cover
  if (
    event.coverImage &&
    event.coverImage !== defaultCover &&
    !event.coverImage.startsWith("http")
  ) {
    const p = path.join(process.cwd(), event.coverImage);
    try {
      if (fs.existsSync(p)) fs.unlinkSync(p);
    } catch (e) {}
  }
  // Xóa gallery
  if (event.galleryImages && event.galleryImages.length > 0) {
    event.galleryImages.forEach((img) => {
      if (img && !img.startsWith("http")) {
        const p = path.join(process.cwd(), img);
        try {
          if (fs.existsSync(p)) fs.unlinkSync(p);
        } catch (e) {}
      }
    });
  }
};

// --- QUẢN LÝ SỰ KIỆN ---

export const getPendingEvents = async (req, res) => {
  try {
    const events = await EventRepository.find({ status: "pending" }, null, { sort: { createdAt: -1 } }, "createdBy");
    res.status(200).json(events);
  } catch (error) {
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

export const approveEvent = async (req, res) => {
  try {
    const event = await EventRepository.findByIdAndUpdate(
      req.params.id,
      { status: "approved" },
      { new: true }
    );
    if (!event)
      return res.status(404).json({ message: "Không tìm thấy sự kiện" });
    res.status(200).json({ message: "Duyệt sự kiện thành công", event });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

// [PUT] /api/admin/events/:id/reject
export const rejectEvent = async (req, res) => {
  try {
    const { reason } = req.body; // Lý do từ chối (tùy chọn)

    const updateData = {
      status: "rejected",
      rejectionReason: reason || "Không có lý do cụ thể",
    };

    const event = await EventRepository.findByIdAndUpdate(req.params.id, updateData, { new: true });

    if (!event)
      return res.status(404).json({ message: "Không tìm thấy sự kiện" });

    // Gửi thông báo cho Event Manager
    if (event.createdBy && event.createdBy._id) {
      const notificationTitle = `Sự kiện bị từ chối`;
      const notificationMessage = `Sự kiện "${event.name}" đã bị từ chối. Lý do: ${updateData.rejectionReason}`;
      const notificationUrl = `/quanlisukien/su-kien`;

      await sendPushNotification(
        event.createdBy._id,
        notificationTitle,
        notificationMessage,
        notificationUrl
      ).catch((err) =>
        console.error("❌ Lỗi gửi thông báo từ chối sự kiện:", err)
      );
    }

    res.status(200).json({
      message: "Từ chối sự kiện thành công",
      event,
    });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

// [DELETE] /api/admin/events/:id
export const deleteEventByAdmin = async (req, res) => {
  try {
    const eventId = req.params.id;
    const event = await EventRepository.findById(eventId);

    if (!event)
      return res.status(404).json({ message: "Không tìm thấy sự kiện" });

    // 1. Xóa file ảnh
    deleteEventFiles(event);

    // 2. Xóa Event
    await EventRepository.findByIdAndDelete(eventId);

    // 3. 🧹 Xóa dữ liệu mồ côi (Registrations, Posts, Comments)
    await Promise.all([
      RegistrationRepository.deleteMany({ event: eventId }),
      PostRepository.deleteMany({ event: eventId }),
      CommentRepository.deleteMany({ event: eventId }),
    ]);

    res
      .status(200)
      .json({ message: "Xóa sự kiện và dọn dẹp dữ liệu thành công" });
  } catch (error) {
    console.error("❌ Lỗi admin delete event:", error);
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
    const { status } = req.body;
    const user = await UserRepository.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!user)
      return res.status(404).json({ message: "Không tìm thấy người dùng" });
    // remove password if present
    if (user.password) {
      const u = user.toObject ? user.toObject() : user;
      delete u.password;
      return res.status(200).json({ message: "Cập nhật trạng thái thành công", user: u });
    }
    res.status(200).json({ message: "Cập nhật trạng thái thành công", user });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

export const updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    const userIdToUpdate = req.params.id;
    const adminId = req.user._id.toString();

    if (!role)
      return res
        .status(400)
        .json({ message: "Vui lòng cung cấp vai trò mới." });

    const validRoles = ["VOLUNTEER", "EVENTMANAGER", "ADMIN"];
    if (!validRoles.includes(role.toUpperCase())) {
      return res
        .status(400)
        .json({ message: `Vai trò '${role}' không hợp lệ.` });
    }

    if (userIdToUpdate === adminId) {
      return res.status(400).json({
        message: "Admin không thể tự thay đổi vai trò của chính mình.",
      });
    }

    const updatedUser = await UserRepository.findByIdAndUpdate(
      userIdToUpdate,
      { role: role.toUpperCase() },
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: "Không tìm thấy người dùng." });
    }

    const u = updatedUser.toObject ? updatedUser.toObject() : updatedUser;
    delete u.password;

    res.status(200).json({
      message: "Cập nhật vai trò người dùng thành công.",
      user: u,
    });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

// --- XUẤT DỮ LIỆU ---
export const exportUsers = async (req, res) => {
  try {
    const format = (req.query.format || "csv").toLowerCase();
    const { startDate, endDate } = req.query;

    const filter = {};
    if (startDate && endDate) {
      filter.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999)),
      };
    }

    const users = await UserRepository.find(filter, "-password -__v");

    const normalizedUsers = users.map((user) => ({
      id: user._id.toString(),
      name: user.name || "",
      birthday: formatDateValue(user.birthday),
      gender: user.gender || "",
      phone: user.phone || "",
      email: user.email,
      username: user.username,
      role: user.role,
      status: user.status,
      points: typeof user.points === "number" ? user.points : 0,
      createdAt: formatDateValue(user.createdAt),
      updatedAt: formatDateValue(user.updatedAt),
    }));

    sendExportResponse(res, normalizedUsers, "users-export", format, [
      "id",
      "name",
      "birthday",
      "gender",
      "phone",
      "email",
      "username",
      "role",
      "status",
      "points",
      "createdAt",
      "updatedAt",
    ]);
  } catch (error) {
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

export const exportEvents = async (req, res) => {
  try {
    const format = (req.query.format || "csv").toLowerCase();
    const { startDate, endDate } = req.query;

    const filter = {};
    if (startDate && endDate) {
      filter.date = {
        $gte: new Date(startDate),
        $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999)),
      };
    }

    const events = await EventRepository.find(filter, null, { sort: { createdAt: -1 } }, "createdBy");

    const normalizedEvents = events.map((event) => ({
      id: event._id.toString(),
      name: event.name || "",
      category: event.category || "",
      startDate: formatDateValue(event.date),
      endDate: formatDateValue(event.endDate),
      location: event.location || "",
      status: event.status || "",
      points: typeof event.points === "number" ? event.points : 0,
      maxParticipants:
        typeof event.maxParticipants === "number" ? event.maxParticipants : 0,
      managerName: event.createdBy?.name || "",
      managerEmail: event.createdBy?.email || "",
      createdAt: formatDateValue(event.createdAt),
      updatedAt: formatDateValue(event.updatedAt),
    }));

    sendExportResponse(res, normalizedEvents, "events-export", format, [
      "id",
      "name",
      "category",
      "startDate",
      "endDate",
      "location",
      "status",
      "points",
      "maxParticipants",
      "managerName",
      "managerEmail",
      "createdAt",
      "updatedAt",
    ]);
  } catch (error) {
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

export const exportVolunteers = async (req, res) => {
  try {
    const format = (req.query.format || "csv").toLowerCase();
    const { startDate, endDate } = req.query;

    const filter = { role: "VOLUNTEER" };
    if (startDate && endDate) {
      filter.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999)),
      };
    }

    const volunteers = await UserRepository.find(filter, "name email phone points status createdAt updatedAt");

    const completedCounts = await RegistrationRepository.aggregate([
      { $match: { status: "completed" } },
      { $group: { _id: "$volunteer", completedEvents: { $sum: 1 } } },
    ]);

    const completedMap = completedCounts.reduce((acc, item) => {
      acc.set(item._id.toString(), item.completedEvents || 0);
      return acc;
    }, new Map());

    const normalizedVolunteers = volunteers.map((volunteer) => ({
      id: volunteer._id.toString(),
      name: volunteer.name || "",
      email: volunteer.email || "",
      phone: volunteer.phone || "",
      status: volunteer.status || "",
      points: typeof volunteer.points === "number" ? volunteer.points : 0,
      completedEvents: completedMap.get(volunteer._id.toString()) ?? 0,
      createdAt: formatDateValue(volunteer.createdAt),
      updatedAt: formatDateValue(volunteer.updatedAt),
    }));

    sendExportResponse(res, normalizedVolunteers, "volunteers-export", format, [
      "id",
      "name",
      "email",
      "phone",
      "status",
      "points",
      "completedEvents",
      "createdAt",
      "updatedAt",
    ]);
  } catch (error) {
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

// --- DASHBOARD ---
export const getDashboardStats = async (req, res) => {
  try {
    const totalUsers = await UserRepository.countDocuments();
    const totalEvents = await EventRepository.countDocuments();
    const pendingEventsCount = await EventRepository.countDocuments({ status: "pending" });
    const approvedEventsCount = await EventRepository.countDocuments({ status: "approved" });
    const rejectedEventsCount = await EventRepository.countDocuments({ status: "rejected" });
    const completedEventsCount = await EventRepository.countDocuments({ status: "completed" });

    res.status(200).json({
      totalUsers,
      totalEvents,
      pendingEventsCount,
      approvedEventsCount,
      rejectedEventsCount,
      completedEventsCount,
    });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

export const getAllSystemEvents = async (req, res) => {
  try {
    const events = await EventRepository.find({}, null, { sort: { createdAt: -1 } }, "createdBy");
    res.status(200).json(events);
  } catch (error) {
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

// --- TRENDING EVENTS ---
export const getTrendingEvents = async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - parseInt(days));

    const events = await EventRepository.find({ status: "approved" }, null, {}, "createdBy");

    const eventsWithMetrics = await Promise.all(
      events.map(async (event) => {
        const recentRegistrations = await RegistrationRepository.countDocuments({
          event: event._id,
          createdAt: { $gte: cutoffDate },
        });

        const recentLikes = await EventActionRepository.countDocuments({
          event: event._id,
          type: "LIKE",
          createdAt: { $gte: cutoffDate },
        });

        const recentShares = await EventActionRepository.countDocuments({
          event: event._id,
          type: "SHARE",
          createdAt: { $gte: cutoffDate },
        });

        const trendingScore =
          recentRegistrations * 3 + recentLikes * 2 + recentShares * 5;

        return {
          ...event,
          recentRegistrations,
          recentLikes,
          recentShares,
          trendingScore,
        };
      })
    );

    const trendingEvents = eventsWithMetrics
      .sort((a, b) => b.trendingScore - a.trendingScore)
      .slice(0, 10);

    res.status(200).json(trendingEvents);
  } catch (error) {
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

// --- RECENT ACTIVITY ---
export const getRecentActivity = async (req, res) => {
  try {
    const recentlyPublished = await EventRepository.find({
      status: "approved",
      updatedAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
    }, null, { sort: { updatedAt: -1 }, limit: 5 }, "createdBy");

    const recentPosts = await PostRepository.find({
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    }, null, { sort: { createdAt: -1 }, limit: 10 }, "event author");

    const recentComments = await CommentRepository.find({
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    }, null, { sort: { createdAt: -1 }, limit: 10 }, "event user");

    res.status(200).json({
      recentlyPublished,
      recentPosts,
      recentComments,
    });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

// --- RANKINGS ---
// replace direct model calls with repositories where appropriate
export const getVolunteerRanking = async (req, res) => {
  try {
    const volunteers = await UserRepository.find({ role: "VOLUNTEER" }, "name email avatar points");

    const volunteersWithStats = await Promise.all(
      volunteers.map(async (volunteer) => {
        const completedEvents = await RegistrationRepository.countDocuments({
          volunteer: volunteer._id,
          status: "completed",
        });
        return {
          ...volunteer,
          completedEvents,
        };
      })
    );

    const sortedVolunteers = volunteersWithStats
      .sort((a, b) => b.points - a.points)
      .map((volunteer, index) => ({
        ...volunteer,
        rank: index + 1,
        avatar:
          volunteer.avatar && !volunteer.avatar.startsWith("http")
            ? `http://localhost:5000${volunteer.avatar}`
            : volunteer.avatar,
      }));

    res.status(200).json(sortedVolunteers);
  } catch (error) {
    console.error("❌ Lỗi lấy ranking:", error);
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

export const getEventManagerRanking = async (req, res) => {
  try {
    const managers = await UserRepository.find({ role: "EVENTMANAGER" }, "name email avatar");

    const managersWithStats = await Promise.all(
      managers.map(async (manager) => {
        const totalEvents = await EventRepository.countDocuments({ createdBy: manager._id });
        const approvedEvents = await EventRepository.countDocuments({ createdBy: manager._id, status: "approved" });
        const completedEvents = await EventRepository.countDocuments({ createdBy: manager._id, status: "completed" });

        const events = await EventRepository.find({ createdBy: manager._id }, "_id");
        const eventIds = events.map((e) => e._id);

        const totalVolunteers = await RegistrationRepository.countDocuments({
          event: { $in: eventIds },
          status: { $in: ["approved", "completed"] },
        });

        const score = completedEvents * 10 + totalVolunteers;

        return {
          ...manager,
          totalEvents,
          approvedEvents,
          completedEvents,
          totalVolunteers,
          score,
        };
      })
    );

    const sortedManagers = managersWithStats
      .sort((a, b) => b.score - a.score)
      .map((manager, index) => ({
        ...manager,
        rank: index + 1,
        avatar:
          manager.avatar && !manager.avatar.startsWith("http")
            ? `http://localhost:5000${manager.avatar}`
            : manager.avatar,
      }));

    res.status(200).json(sortedManagers);
  } catch (error) {
    console.error("❌ Lỗi lấy ranking event manager:", error);
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

// src/controllers/event.controller.js
import Joi from "joi";
import fs from "fs";
import path from "path";
import EventRepository from "../repositories/EventRepository.js";
import RegistrationRepository from "../repositories/RegistrationRepository.js";
import UserRepository from "../repositories/UserRepository.js";
import PostRepository from "../repositories/PostRepository.js";
import CommentRepository from "../repositories/CommentRepository.js";

// --- HÀM HỖ TRỢ (Helper Functions) ---

const rollbackEventUploads = (req) => {
  if (!req.files) return;
  const files = [
    ...(req.files.coverImage || []),
    ...(req.files.galleryImages || [])
  ];
  files.forEach((file) => {
    const p = path.join(process.cwd(), file.path);
    try {
      if (fs.existsSync(p)) fs.unlinkSync(p);
    } catch (e) {
      console.error("Lỗi rollback file:", e.message);
    }
  });
};

const deleteEventFiles = (event) => {
  const defaultCover = "default-event-image.jpg";
  const files = [event.coverImage, ...(event.galleryImages || [])];
  
  files.forEach((img) => {
    if (img && img !== defaultCover && !img.startsWith("http")) {
      const p = path.join(process.cwd(), img);
      try {
        if (fs.existsSync(p)) fs.unlinkSync(p);
      } catch (e) {
        console.error("⚠️ Lỗi xóa file cũ:", e.message);
      }
    }
  });
};

const eventSchema = Joi.object({
  name: Joi.string().min(3).required(),
  description: Joi.string().min(10).required(),
  date: Joi.date().iso().required(),
  endDate: Joi.date().iso().required().greater(Joi.ref("date")),
  location: Joi.string().required(),
  category: Joi.string().required(),
  maxParticipants: Joi.number().integer().min(1).required(),
});

// =========================================================================
// CÁC HÀM EXPORT CHÍNH
// =========================================================================

/**
 * Xử lý hoàn thành sự kiện: Cộng điểm và đổi trạng thái
 * ĐẢM BẢO EXPORT ĐỂ CRONJOB CÓ THỂ GỌI
 */
export const processEventCompletion = async (event) => {
  try {
    if (!event || event.status === "completed") return;

    // Tăng điểm cho manager thông qua hàm nghiệp vụ đã đóng gói trong Repository
    await UserRepository.incrementPoints(event.createdBy, event.points || 10);

    // Cập nhật trạng thái event thông qua Repository
    return await EventRepository.findByIdAndUpdate(
      event._id || event.id, 
      { status: "completed", endDate: new Date() }
    );
  } catch (error) {
    console.error("❌ Lỗi trong processEventCompletion:", error.message);
    throw error;
  }
};

// [POST] /api/events -> Tạo sự kiện
export const createEvent = async (req, res) => {
  try {
    const { error, value } = eventSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: "Dữ liệu không hợp lệ", details: error.details });
    }

    const pointMap = {
      Community: 15, Education: 20, Healthcare: 20, Environment: 25,
      EventSupport: 10, Technical: 25, Emergency: 35, Online: 10, Corporate: 15,
    };

    const eventPoints = pointMap[req.body.category] || 10;

    let coverImagePath = "default-event-image.jpg";
    let galleryPaths = [];
    if (req.files) {
      if (req.files.coverImage?.[0]) {
        coverImagePath = `/uploads/events/${req.files.coverImage[0].filename}`;
      }
      if (req.files.galleryImages) {
        galleryPaths = req.files.galleryImages.map(f => `/uploads/events/${f.filename}`);
      }
    }

    const newEvent = await EventRepository.create({
      ...value,
      points: eventPoints,
      coverImage: coverImagePath,
      galleryImages: galleryPaths,
      createdBy: req.user._id,
      status: "pending",
    });

    res.status(201).json({
      message: "Tạo sự kiện thành công. Điểm thưởng dự kiến: " + eventPoints,
      event: newEvent,
    });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

// [PUT] /api/events/:id -> Cập nhật sự kiện
export const updateEvent = async (req, res) => {
  try {
    const eventId = req.params.id;
    const event = await EventRepository.findById(eventId);

    if (!event) return res.status(404).json({ message: "Không tìm thấy" });
    if (String(event.createdBy) !== String(req.user._id)) {
      return res.status(403).json({ message: "Không có quyền sửa" });
    }
    if (event.status !== "pending") {
      return res.status(403).json({ message: `Sự kiện đã ở trạng thái '${event.status}'` });
    }

    const { error, value } = eventSchema.validate(req.body);
    if (error) return res.status(400).json({ message: "Dữ liệu lỗi", details: error.details });

    const updateData = { ...value };

    if (req.files) {
      if (req.files.coverImage?.[0]) {
        updateData.coverImage = `/uploads/events/${req.files.coverImage[0].filename}`;
        if (event.coverImage && event.coverImage !== "default-event-image.jpg") {
            try { fs.unlinkSync(path.join(process.cwd(), event.coverImage)); } catch (e) {}
        }
      }
      if (req.files.galleryImages) {
        updateData.galleryImages = req.files.galleryImages.map(f => `/uploads/events/${f.filename}`);
      }
    }

    const updatedEvent = await EventRepository.findByIdAndUpdate(eventId, updateData);

    res.status(200).json({ message: "Cập nhật thành công", event: updatedEvent });
  } catch (err) {
    rollbackEventUploads(req);
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};

// [DELETE] /api/events/:id -> Xóa sự kiện và dữ liệu liên quan
export const deleteEvent = async (req, res) => {
  try {
    const eventId = req.params.id;
    const event = await EventRepository.findById(eventId);

    if (!event) return res.status(404).json({ message: "Không tìm thấy" });

    if (event.createdBy.toString() !== req.user._id.toString() && req.user.role !== "ADMIN") {
      return res.status(403).json({ message: "Không có quyền xóa" });
    }

    deleteEventFiles(event);
    await EventRepository.findByIdAndDelete(eventId);

    await Promise.all([
      RegistrationRepository.deleteMany({ event: eventId }),
      PostRepository.deleteMany({ event: eventId }),
      CommentRepository.deleteMany({ event: eventId }),
    ]);

    res.status(200).json({ message: "Xóa sự kiện thành công." });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

// [PUT] /api/events/:id/complete -> Manager xác nhận hoàn thành
export const completeEvent = async (req, res) => {
  try {
    const event = await EventRepository.findById(req.params.id);
    if (!event) return res.status(404).json({ message: "Không tìm thấy" });
    if (String(event.createdBy) !== String(req.user._id)) return res.status(403).json({ message: "Không có quyền" });
    
    if (event.status !== "approved") return res.status(400).json({ message: "Sự kiện chưa duyệt" });
    if (event.status === "completed") return res.status(400).json({ message: "Đã hoàn thành trước đó" });

    const updatedEvent = await processEventCompletion(event);
    res.status(200).json({ message: "Hoàn thành!", event: updatedEvent });
  } catch (err) {
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};

// [GET] /api/events/public -> Danh sách sự kiện cho khách xem
export const getApprovedEvents = async (req, res) => {
  try {
    const { category, date } = req.query;
    const filter = { status: "approved" };

    if (category) filter.category = category;
    if (date) {
      const d = new Date(date);
      const nextD = new Date(date);
      nextD.setDate(nextD.getDate() + 1);
      filter.date = { $gte: d, $lt: nextD };
    }

    const events = await EventRepository.getEventsWithStats(filter);
    res.status(200).json(events);
  } catch (error) {
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

// [GET] /api/events/public/:id -> Chi tiết sự kiện (Hỗ trợ ID/Name/Slug)
export const getEventDetails = async (req, res) => {
  try {
    const param = req.params.id;
    
    // Xây dựng filter tìm kiếm linh hoạt
    const filter = {
      status: "approved",
      $or: [
        { name: param },
        { slug: param }
      ]
    };

    // Nếu param là ID hợp lệ, thêm vào filter tìm kiếm
    if (param.match(/^[0-9a-fA-F]{24}$/)) {
      filter.$or.push({ _id: param });
    }

    // Gọi hàm nghiệp vụ trong Repository
    const events = await EventRepository.getEventsWithStats(filter);

    if (!events || events.length === 0) {
      return res.status(404).json({ message: "Không tìm thấy hoặc chưa duyệt." });
    }

    // CỰC KỲ QUAN TRỌNG: Trả về Object đầu tiên (events[0]) thay vì cả mảng
    res.status(200).json(events[0]);
  } catch (error) {
    console.error("❌ Lỗi getEventDetails:", error.message);
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

// [GET] /api/events/my-events -> Sự kiện của Manager hiện tại
export const getMyEvents = async (req, res) => {
  try {
    const events = await EventRepository.getEventsWithStats({ createdBy: req.user._id });
    res.status(200).json(events);
  } catch (error) {
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

// [GET] /api/events/management/:id -> Quản lý chuyên sâu cho Manager
export const getEventDetailsForManagement = async (req, res) => {
  try {
    const eventId = req.params.id;
    const event = await EventRepository.findById(eventId);
    if (!event) return res.status(404).json({ message: "Không tìm thấy" });

    const [registrations, posts, comments] = await Promise.all([
      RegistrationRepository.find({ event: eventId }, null, { sort: { createdAt: -1 } }, "volunteer"),
      PostRepository.find({ event: eventId }, null, { sort: { createdAt: -1 } }, "author"),
      CommentRepository.find({ event: eventId }, null, { sort: { createdAt: -1 } }, "author")
    ]);

    const stats = {
      totalRegistrations: registrations.length,
      approvedCount: registrations.filter(r => ["approved", "completed"].includes(r.status)).length,
      pendingCount: registrations.filter(r => r.status === "pending").length,
      rejectedCount: registrations.filter(r => r.status === "rejected").length,
    };

    res.status(200).json({ event, registrations, posts, comments, stats });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};
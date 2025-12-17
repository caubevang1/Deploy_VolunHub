// src/controllers/event.controller.js
import mongoose from "mongoose";
import Joi from "joi";
import fs from "fs";
import path from "path";
import EventRepository from "../repositories/EventRepository.js";
import RegistrationRepository from "../repositories/RegistrationRepository.js";
import UserRepository from "../repositories/UserRepository.js";
import PostRepository from "../repositories/PostRepository.js";
import CommentRepository from "../repositories/CommentRepository.js";

// --- HÀM HỖ TRỢ ---
const rollbackEventUploads = (req) => {
  if (!req.files) return;
  if (req.files.coverImage && req.files.coverImage.length > 0) {
    const p = path.join(process.cwd(), req.files.coverImage[0].path);
    try {
      if (fs.existsSync(p)) fs.unlinkSync(p);
    } catch (e) {
      console.error("Lỗi rollback coverImage:", e.message);
    }
  }
  if (req.files.galleryImages && req.files.galleryImages.length > 0) {
    req.files.galleryImages.forEach((file) => {
      const p = path.join(process.cwd(), file.path);
      try {
        if (fs.existsSync(p)) fs.unlinkSync(p);
      } catch (e) {
        console.error("Lỗi rollback gallery:", e.message);
      }
    });
  }
};

export const processEventCompletion = async (event) => {
  // event may be plain object (lean). Use repositories to update.
  if (!event || event.status === "completed") return;

  // tăng điểm cho manager
  await UserRepository.findByIdAndUpdate(event.createdBy, { $inc: { points: event.points } });

  // cập nhật trạng thái event
  const updated = await EventRepository.findByIdAndUpdate(event._id || event.id, { status: "completed", endDate: new Date() }, { new: true });

  return updated;
};
const deleteEventFiles = (event) => {
  const defaultCover = "default-event-image.jpg";

  if (
    event.coverImage &&
    event.coverImage !== defaultCover &&
    !event.coverImage.startsWith("http")
  ) {
    const p = path.join(process.cwd(), event.coverImage);
    try {
      if (fs.existsSync(p)) fs.unlinkSync(p);
      console.log("🗑️ Đã xóa ảnh bìa:", p);
    } catch (e) {
      console.error("⚠️ Lỗi xóa ảnh bìa cũ:", e.message);
    }
  }

  if (event.galleryImages && event.galleryImages.length > 0) {
    event.galleryImages.forEach((img) => {
      if (img && !img.startsWith("http")) {
        const p = path.join(process.cwd(), img);
        try {
          if (fs.existsSync(p)) fs.unlinkSync(p);
          console.log("🗑️ Đã xóa ảnh gallery:", p);
        } catch (e) {
          console.error("⚠️ Lỗi xóa ảnh gallery cũ:", e.message);
        }
      }
    });
  }
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

// [POST] /api/events
// [POST] /api/events -> Tạo sự kiện (Đã cập nhật 9 loại Category & Điểm thưởng)
export const createEvent = async (req, res) => {
  try {
    const { error, value } = eventSchema.validate(req.body);
    if (error) {
      return res
        .status(400)
        .json({ message: "Dữ liệu không hợp lệ", details: error.details });
    }

    // 👇 CẤU HÌNH ĐIỂM THƯỞNG CHO 9 LOẠI HÌNH TÌNH NGUYỆN
    // (Bạn có thể điều chỉnh điểm số tùy ý muốn)
    const pointMap = {
      // 1. Tình nguyện cộng đồng (Dọn dẹp, sơn sửa, hỗ trợ người già...)
      Community: 15,

      // 2. Tình nguyện giáo dục (Dạy học, gia sư, thư viện...)
      Education: 20,

      // 3. Tình nguyện chăm sóc sức khỏe (Hiến máu, hỗ trợ bệnh viện...)
      Healthcare: 20,

      // 4. Tình nguyện môi trường (Trồng cây, tái chế, bảo vệ động vật...)
      Environment: 25,

      // 5. Tình nguyện sự kiện (Hỗ trợ hậu cần, lễ tân, hướng dẫn...)
      EventSupport: 10,

      // 6. Tình nguyện kỹ thuật (IT, thiết kế, xây dựng web, sửa chữa...)
      Technical: 25,

      // 7. Tình nguyện cứu trợ – khẩn cấp (Thiên tai, lũ lụt, dịch bệnh...) -> Điểm cao nhất
      Emergency: 35,

      // 8. Tình nguyện trực tuyến (Dịch thuật, nhập liệu, truyền thông online...) -> Điểm thấp hơn vì tiện lợi
      Online: 10,

      // 9. Tình nguyện doanh nghiệp (Hoạt động CSR của công ty)
      Corporate: 15,
    };

    // Lấy điểm theo category gửi lên.
    // Lưu ý: Frontend cần gửi đúng key tiếng Anh như trên (ví dụ: category: "Emergency")
    // Nếu category không khớp danh sách, mặc định là 10 điểm.
    const eventPoints = pointMap[req.body.category] || 10;

    // Xử lý ảnh
    let coverImagePath = "default-event-image.jpg";
    let galleryPaths = [];
    if (req.files) {
      if (req.files.coverImage && req.files.coverImage.length > 0) {
        coverImagePath = `/uploads/events/${req.files.coverImage[0].filename}`;
      }
      if (req.files.galleryImages && req.files.galleryImages.length > 0) {
        galleryPaths = req.files.galleryImages.map(
          (file) => `/uploads/events/${file.filename}`
        );
      }
    }

    const newEventDoc = {
      ...value,
      points: eventPoints, // 👈 Lưu điểm đã tính toán vào DB
      coverImage: coverImagePath,
      galleryImages: galleryPaths,
      createdBy: req.user._id,
      status: "pending",
    };

    const newEvent = await EventRepository.create(newEventDoc);

    res.status(201).json({
      message: "Tạo sự kiện thành công. Điểm thưởng dự kiến: " + eventPoints,
      event: newEvent,
    });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

// [PUT] /api/events/:id
export const updateEvent = async (req, res) => {
  try {
    const eventId = req.params.id;
    const event = await EventRepository.findById(eventId);

    if (!event) throw { status: 404, message: "Không tìm thấy sự kiện" };
    if (String(event.createdBy) !== String(req.user._id)) {
      throw { status: 403, message: "Bạn không có quyền sửa sự kiện này" };
    }
    if (event.status !== "pending") {
      throw {
        status: 403,
        message: `Không thể cập nhật. Sự kiện đã ở trạng thái '${event.status}'.`,
      };
    }

    const { error, value } = eventSchema.validate(req.body);
    if (error)
      throw {
        status: 400,
        message: "Dữ liệu không hợp lệ",
        details: error.details,
      };

    const updateData = { ...value };
    const defaultCover = "default-event-image.jpg";

    if (req.files) {
      if (req.files.coverImage && req.files.coverImage.length > 0) {
        updateData.coverImage = `/uploads/events/${req.files.coverImage[0].filename}`;
        if (
          event.coverImage &&
          event.coverImage !== defaultCover &&
          !event.coverImage.startsWith("http")
        ) {
          const oldPath = path.join(process.cwd(), event.coverImage);
          try {
            if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
          } catch (e) {}
        }
      }
      if (req.files.galleryImages && req.files.galleryImages.length > 0) {
        updateData.galleryImages = req.files.galleryImages.map(
          (file) => `/uploads/events/${file.filename}`
        );
        if (event.galleryImages && event.galleryImages.length > 0) {
          event.galleryImages.forEach((imagePath) => {
            if (imagePath && !imagePath.startsWith("http")) {
              const oldPath = path.join(process.cwd(), imagePath);
              try {
                if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
              } catch (e) {}
            }
          });
        }
      }
    }

    const updatedEvent = await EventRepository.findByIdAndUpdate(
      eventId,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    res
      .status(200)
      .json({ message: "Cập nhật sự kiện thành công", event: updatedEvent });
  } catch (err) {
    rollbackEventUploads(req);
    if (err.status)
      return res
        .status(err.status)
        .json({ message: err.message, details: err.details });
    console.error("❌ Lỗi updateEvent:", err);
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};

// [DELETE] /api/events/:id -> ĐÃ CẬP NHẬT LOGIC XÓA MỒ CÔI
export const deleteEvent = async (req, res) => {
  try {
    const eventId = req.params.id;
    const event = await EventRepository.findById(eventId);

    if (!event)
      return res.status(404).json({ message: "Không tìm thấy sự kiện" });

    const userRole = req.user.role.toUpperCase();
    // Kiểm tra quyền: Phải là người tạo hoặc là ADMIN
    if (
      event.createdBy.toString() !== req.user._id.toString() &&
      userRole !== "ADMIN"
    ) {
      return res
        .status(403)
        .json({ message: "Bạn không có quyền xóa sự kiện này" });
    }

    // 1. Xóa file ảnh vật lý trên server
    deleteEventFiles(event);

    // 2. Xóa Sự kiện trong DB
    await EventRepository.findByIdAndDelete(eventId);

    // 3. 🧹 DỌN DẸP DỮ LIỆU LIÊN QUAN (Dữ liệu mồ côi)
    // Xóa các đăng ký
    await RegistrationRepository.deleteMany({ event: eventId });
    // Xóa các bài post (via repository)
    await PostRepository.deleteMany({ event: eventId });
    // Xóa các comment liên quan đến sự kiện này (via repository)
    await CommentRepository.deleteMany({ event: eventId });

    res.status(200).json({
      message: "Xóa sự kiện và toàn bộ dữ liệu liên quan thành công.",
    });
  } catch (error) {
    console.error("❌ Lỗi deleteEvent:", error);
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

// [PUT] /api/events/:id/complete
export const completeEvent = async (req, res) => {
  try {
    const eventId = req.params.id;
    const event = await EventRepository.findById(eventId);

    if (!event)
      return res.status(404).json({ message: "Không tìm thấy sự kiện" });

    if (String(event.createdBy) !== String(req.user._id)) {
      return res
        .status(403)
        .json({ message: "Bạn không có quyền cập nhật sự kiện này" });
    }

    if (event.status !== "approved") {
      return res
        .status(400)
        .json({ message: "Chỉ sự kiện đã duyệt mới được hoàn thành." });
    }
    if (event.status === "completed") {
      return res
        .status(400)
        .json({ message: "Sự kiện đã hoàn thành trước đó rồi." });
    }

    const updatedEvent = await processEventCompletion(event);

    res.status(200).json({
      message: "Sự kiện hoàn thành. Manager đã được cộng điểm.",
      event: updatedEvent,
    });
  } catch (err) {
    console.error("❌ Lỗi completeEvent:", err);
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};

// [GET] /api/events/public -> Lấy danh sách sự kiện đã được duyệt
export const getApprovedEvents = async (req, res) => {
  try {
    const { category, date } = req.query;
    const filter = { status: "approved" };

    if (category) {
      filter.category = category;
    }
    if (date) {
      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + 1);
      filter.date = { $gte: startDate, $lt: endDate };
    }

    // Dùng repository.aggregate thay vì Event.aggregate trực tiếp
    const pipeline = [
      { $match: filter },
      {
        $lookup: {
          from: "registrations",
          localField: "_id",
          foreignField: "event",
          as: "registrations",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "createdBy",
          foreignField: "_id",
          as: "creatorInfo",
        },
      },
      {
        $project: {
          name: 1,
          description: 1,
          date: 1,
          endDate: 1,
          location: 1,
          category: 1,
          coverImage: 1,
          status: 1,
          maxParticipants: 1,
          currentParticipants: {
            $size: {
              $filter: {
                input: "$registrations",
                as: "reg",
                cond: { $in: ["$$reg.status", ["approved"]] },
              },
            },
          },
          createdBy: {
            $arrayElemAt: [
              {
                $map: {
                  input: "$creatorInfo",
                  as: "c",
                  in: { _id: "$$c._id", name: "$$c.name", phone: "$$c.phone" },
                },
              },
              0,
            ],
          },
        },
      },
      { $sort: { date: 1 } },
    ];

    const events = await EventRepository.aggregate(pipeline);

    res.status(200).json(events);
  } catch (error) {
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

// [GET] /api/events/public/:id
export const getEventDetails = async (req, res) => {
  try {
    // --- CHANGED: support ObjectId, slug, or exact name (case-insensitive) ---
    const param = req.params.id;

    // escape regex for name match
    const escapeRegex = (s = "") => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    // Build match stage depending on param
    let match;
    if (mongoose.isValidObjectId(param)) {
      match = { _id: new mongoose.Types.ObjectId(param), status: "approved" };
    } else {
      // try slug first, and also allow exact name (case-insensitive)
      const nameRegex = new RegExp(`^${escapeRegex(param)}$`, "i");
      match = { status: "approved", $or: [{ slug: param }, { name: nameRegex }] };
    }

    const pipeline = [
      { $match: match },
      {
        $lookup: {
          from: "registrations",
          localField: "_id",
          foreignField: "event",
          as: "registrations",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "createdBy",
          foreignField: "_id",
          as: "creatorInfo",
        },
      },
      {
        $project: {
          name: 1,
          description: 1,
          date: 1,
          endDate: 1,
          location: 1,
          category: 1,
          coverImage: 1,
          galleryImages: 1,
          status: 1,
          maxParticipants: 1,
          currentParticipants: {
            $size: {
              $filter: {
                input: "$registrations",
                as: "reg",
                cond: { $in: ["$$reg.status", ["approved"]] },
              },
            },
          },
          createdBy: {
            $arrayElemAt: [
              {
                $map: {
                  input: "$creatorInfo",
                  as: "c",
                  in: { _id: "$$c._id", name: "$$c.name", phone: "$$c.phone" },
                },
              },
              0,
            ],
          },
        },
      },
      { $limit: 1 },
    ];

    const arr = await EventRepository.aggregate(pipeline);

    // If not found via slug/name and original param looked like a slug/name,
    // try fallback: if param contained spaces/punctuation maybe DB stores normalized slug.
    if ((!arr || arr.length === 0) && !mongoose.isValidObjectId(param)) {
      // Try a looser name match (contains)
      const looseNameRegex = new RegExp(escapeRegex(param), "i");
      const fallbackPipeline = [...pipeline];
      fallbackPipeline[0] = { $match: { status: "approved", name: { $regex: looseNameRegex } } };
      const fallbackArr = await EventRepository.aggregate(fallbackPipeline);
      if (fallbackArr && fallbackArr.length > 0) {
        return res.status(200).json(fallbackArr[0]);
      }
      return res.status(404).json({ message: "Không tìm thấy sự kiện hoặc sự kiện chưa được duyệt." });
    }

    if (!arr || arr.length === 0) {
      return res.status(404).json({
        message: "Không tìm thấy sự kiện hoặc sự kiện chưa được duyệt.",
      });
    }
    res.status(200).json(arr[0]);
  } catch (error) {
    console.error("❌ Lỗi getEventDetails:", error);
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

// [GET] /api/events/my-events
export const getMyEvents = async (req, res) => {
  try {
    // Dùng repository.aggregate để giữ pattern tách DB
    const pipeline = [
      { $match: { createdBy: req.user._id } },
      {
        $lookup: {
          from: "registrations",
          localField: "_id",
          foreignField: "event",
          as: "registrations",
        },
      },
      {
        $project: {
          name: 1,
          date: 1,
          endDate: 1,
          location: 1,
          status: 1,
          maxParticipants: 1,
          rejectionReason: 1,
          currentParticipants: {
            $size: {
              $filter: {
                input: "$registrations",
                as: "reg",
                cond: { $in: ["$$reg.status", ["approved"]] },
              },
            },
          },
        },
      },
      { $sort: { createdAt: -1 } },
    ];

    const events = await EventRepository.aggregate(pipeline);
    res.status(200).json(events);
  } catch (error) {
    console.error("❌ Lỗi getMyEvents:", error);
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

// [GET] /api/events/management/:id
// Trả về chi tiết dành cho Manager (kèm đăng ký, bài viết, bình luận và stats)
export const getEventDetailsForManagement = async (req, res) => {
  try {
    const eventId = req.params.id;
    const event = await EventRepository.findById(eventId);
    if (!event) return res.status(404).json({ message: "Không tìm thấy sự kiện." });

    // Lấy registrations (populate volunteer)
    const registrations = await RegistrationRepository.find(
      { event: eventId },
      null,
      { sort: { createdAt: -1 } },
      { path: "volunteer", select: "name email avatar phone" }
    );

    // Lấy posts + comments liên quan (populate author)
    const posts = await PostRepository.find(
      { event: eventId },
      null,
      { sort: { createdAt: -1 } },
      { path: "author", select: "name avatar email" }
    );

    const comments = await CommentRepository.find(
      { event: eventId },
      null,
      { sort: { createdAt: -1 } },
      { path: "author", select: "name avatar email" }
    );

    // Thống kê: approvedCount bao gồm 'approved' và 'completed'
    const totalRegistrations = registrations.length;
    const approvedCount = registrations.filter((r) =>
      ["approved", "completed"].includes((r.status || "").toLowerCase())
    ).length;
    const pendingCount = registrations.filter((r) => (r.status || "").toLowerCase() === "pending").length;
    const rejectedCount = registrations.filter((r) => (r.status || "").toLowerCase() === "rejected").length;

    const stats = {
      totalRegistrations,
      approvedCount,
      pendingCount,
      rejectedCount,
    };

    res.status(200).json({ event, registrations, posts, comments, stats });
  } catch (error) {
    console.error("❌ Lỗi getEventDetailsForManagement:", error);
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

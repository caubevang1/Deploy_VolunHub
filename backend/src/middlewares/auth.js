import jwt from "jsonwebtoken";
import UserRepository from "../repositories/UserRepository.js";
import Registration from "../models/registration.js";
import Event from "../models/event.js";

export const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization || "";
  if (!authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Chưa đăng nhập." });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // UserRepository.findById trả về plain object
    const user = await UserRepository.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({ message: "Người dùng không tồn tại." });
    }

    // Gán vào req để các middleware/controller phía sau sử dụng
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Token không hợp lệ hoặc đã hết hạn." });
  }
};

export const admin = (req, res, next) => {
  const role = String(req.user?.role || "").toUpperCase();
  if (req.user && role === "ADMIN") {
    next();
  } else {
    res.status(403).json({ message: "Forbidden: Yêu cầu quyền Admin" });
  }
};

export const eventManager = (req, res, next) => {
  const userRole = String(req.user?.role || "").toUpperCase();
  if (userRole === "EVENTMANAGER" || userRole === "ADMIN") {
    next();
  } else {
    res.status(403).json({ message: "Forbidden: Yêu cầu quyền Quản lý" });
  }
};

export const isEventMember = async (req, res, next) => {
  try {
    const eventId = req.params.eventId || req.params.id || req.body.eventId;
    const userId = req.user._id;
    const userRole = String(req.user?.role || "").toUpperCase();

    if (userRole === "ADMIN") return next();

    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ message: "Không tìm thấy sự kiện." });

    if (userRole === "EVENTMANAGER" && event.createdBy.toString() === userId.toString()) {
      return next();
    }

    const registration = await Registration.findOne({
      event: eventId,
      volunteer: userId,
      status: "approved",
    });

    if (registration) return next();

    res.status(403).json({ message: "Bạn không có quyền truy cập sự kiện này." });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};
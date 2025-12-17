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

    // Sử dụng repository để lấy user
    req.user = await UserRepository.findById(decoded.userId);

    if (!req.user) {
      return res.status(401).json({ message: "Người dùng không tồn tại." });
    }

    next();
  } catch (err) {
    return res
      .status(401)
      .json({ message: "Token không hợp lệ hoặc đã hết hạn." });
  }
};

export const admin = (req, res, next) => {
  if (req.user && req.user.role.toUpperCase() === "ADMIN") {
    next();
  } else {
    res.status(403).json({ message: "Forbidden: Yêu cầu quyền Admin" });
  }
};

export const eventManager = (req, res, next) => {
  const userRole = (req.user.role || "").toUpperCase();
  if (userRole === "EVENTMANAGER" || userRole === "ADMIN") {
    next();
  } else {
    res
      .status(403)
      .json({ message: "Forbidden: Yêu cầu quyền Quản lý Sự kiện" });
  }
};

// ✅ Cải thiện middleware isEventMember
export const isEventMember = async (req, res, next) => {
  try {
    const eventId = req.params.eventId || req.body.eventId;
    const userId = req.user._id;
    const userRole = (req.user.role || "").toUpperCase();

    if (userRole === "ADMIN") {
      return next();
    }

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: "Không tìm thấy sự kiện." });
    }

    if (
      userRole === "EVENTMANAGER" &&
      event.createdBy.toString() === userId.toString()
    ) {
      return next();
    }

    const registration = await Registration.findOne({
      event: eventId,
      volunteer: userId,
      status: "approved",
    });

    if (registration) {
      return next();
    }

    res
      .status(403)
      .json({
        message: "Bạn phải là thành viên đã được duyệt của sự kiện này.",
      });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

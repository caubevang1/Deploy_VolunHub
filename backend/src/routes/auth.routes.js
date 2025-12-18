import express from "express";
import multer from "multer";
import { uploadAvatar } from "../middlewares/upload.js";
import { verifyToken } from "../middlewares/auth.js"; // ✅ Import middleware
import {
  register,
  login,
  sendRegisterOtp,
  getMe,
  updateProfile,
  changePassword,
  changeEmail,
} from "../controllers/auth.controller.js"; // ✅ Import getMe

const router = express.Router();

router.get("/test", (req, res) => {
  res.json({ message: "Auth routes working!" });
});

// ✅ Route send-otp (cho Register)
router.post("/send-otp", sendRegisterOtp);
router.post("/register/send-otp", sendRegisterOtp); // ✅ Alias route

router.post(
  "/register",
  (req, res, next) => {
    console.log("🎯 /register route hit");
    uploadAvatar(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        return res
          .status(400)
          .json({ message: `Upload error: ${err.message}` });
      } else if (err) {
        return res.status(400).json({ message: err.message });
      }
      next();
    });
  },
  register
);

router.post("/login", login);

// ✅ Route lấy thông tin user hiện tại
router.get("/me", verifyToken, getMe);

// ✅ Route cập nhật thông tin user
router.put("/me", verifyToken, uploadAvatar, updateProfile);

// Đổi mật khẩu
router.put("/change-password", verifyToken, changePassword);

// Đổi email (yêu cầu xác thực mật khẩu hiện tại)
router.put("/change-email", verifyToken, changeEmail);

export default router;

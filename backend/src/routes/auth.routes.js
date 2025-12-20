import express from "express";
import multer from "multer";
import { uploadAvatar } from "../middlewares/upload.js";
import { verifyToken } from "../middlewares/auth.js"; // ✅ Import middleware
import {
  register,
  login,
  sendRegisterOtp,
  sendResetOtp,
  resetPassword,
  getMe,
  updateProfile,
  changePassword,
  changeEmail,
} from "../controllers/auth.controller.js";

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

router.get("/me", verifyToken, getMe);
router.put("/me", verifyToken, uploadAvatar, updateProfile);
router.put("/change-password", verifyToken, changePassword);
router.put("/change-email", verifyToken, changeEmail);

// Password reset flow
router.post("/otp/reset/send-otp", sendResetOtp);
router.post("/otp/reset-password", resetPassword);

export default router;

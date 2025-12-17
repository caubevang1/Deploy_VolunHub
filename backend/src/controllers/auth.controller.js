import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import UserRepository from "../repositories/UserRepository.js";
import OtpRepository from "../repositories/OtpRepository.js";
import { generateOtp } from "../utils/generateOtp.js";
import { sendOtpEmail } from "../utils/sendMail.js";
import fs from "fs";
import path from "path";

const NAME_REGEX = /^(\p{Lu}\p{Ll}*)(\s\p{Lu}\p{Ll}*)+$/u;
const PHONE_REGEX = /^0[0-9]{9,10}$/;

const capitalizeName = (name) => {
  if (!name) return "";
  return name
    .trim()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
};

const validateUserEntry = (name, birthday, phone) => {
  const cleanName = capitalizeName(name);
  if (cleanName.split(" ").length < 2 || !NAME_REGEX.test(cleanName)) {
    return {
      error: "Họ tên phải từ 2 từ trở lên và không chứa ký tự đặc biệt.",
    };
  }

  const birthDate = new Date(birthday);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  if (
    today.getMonth() < birthDate.getMonth() ||
    (today.getMonth() === birthDate.getMonth() &&
      today.getDate() < birthDate.getDate())
  )
    age--;
  
  if (age < 10 || age > 80)
    return { error: `Tuổi (${age}) không phù hợp để tham gia hệ thống.` };

  const cleanPhone = phone?.replace(/\s/g, "");
  if (cleanPhone && !PHONE_REGEX.test(cleanPhone))
    return { error: "Số điện thoại không hợp lệ (10-11 số)." };

  return { cleanName, cleanPhone };
};

const rollbackUpload = (req) => {
  if (req.file) {
    const filePath = path.join(process.cwd(), req.file.path);
    try {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch (e) {}
  }
};

export const sendRegisterOtp = async (req, res) => {
  try {
    const { email } = req.body;
    if (await UserRepository.findOne({ email })) return res.status(400).json({ message: "Email đã tồn tại." });

    const otp = generateOtp();
    await OtpRepository.create({
      email,
      otp,
      purpose: "REGISTER",
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });
    await sendOtpEmail(email, otp, "Đăng ký tài khoản VolunteerHub");
    res.status(200).json({ message: "OTP đã được gửi." });
  } catch (err) {
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};

export const verifyAndRegister = async (req, res) => {
  try {
    const { email, name, username, birthday, password, otp, gender, phone, avatar, role } = req.body;

    const validation = validateUserEntry(name, birthday, phone);
    if (validation.error) return res.status(400).json({ message: validation.error });

    // SỬA: Dùng hàm verify đã đóng gói, không dùng rawModel()
    const record = await OtpRepository.findAndVerify(email, otp, "REGISTER");
    
    if (!record || record.expiresAt < new Date()) {
      return res.status(400).json({ message: "OTP hết hạn hoặc không tồn tại." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await UserRepository.create({
      email,
      name: validation.cleanName,
      username,
      birthday,
      password: hashedPassword,
      gender: gender === "Nam" ? "Male" : gender === "Nữ" ? "Female" : "Other",
      phone: validation.cleanPhone,
      avatar,
      role: role || "VOLUNTEER",
    });

    res.status(201).json({ message: "Đăng ký thành công." });
  } catch (err) {
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};

export const login = async (req, res) => {
  try {
    const { identifier, password } = req.body;

    // SỬA: Dùng hàm chuyên dụng để lấy kèm password mà vẫn giữ tính độc lập
    const user = await UserRepository.findByIdentifierWithPassword(identifier);

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(400).json({ message: "Sai tài khoản hoặc mật khẩu." });
    }

    if (user.status !== "ACTIVE") return res.status(403).json({ message: "Tài khoản bị khóa." });

    const token = jwt.sign(
      { userId: user._id, role: user.role }, 
      process.env.JWT_SECRET, 
      { expiresIn: "1d" }
    );

    const { password: _, ...userWithoutPassword } = user;
    res.json({ token, user: userWithoutPassword });
  } catch (err) {
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const { name, birthday, gender, phone } = req.body;
    const validation = validateUserEntry(name, birthday, phone);
    if (validation.error) throw { status: 400, message: validation.error };

    const updateData = {
      name: validation.cleanName,
      birthday,
      gender,
      phone: validation.cleanPhone,
    };
    if (req.file) {
      updateData.avatar = `/uploads/avatars/${req.file.filename}`;
      if (req.user.avatar?.startsWith("/uploads/avatars/")) {
        const old = path.join(process.cwd(), req.user.avatar);
        if (fs.existsSync(old)) fs.unlinkSync(old);
      }
    }

    const updated = await UserRepository.findByIdAndUpdate(req.user._id, { $set: updateData });
    
    // Đảm bảo trả về dữ liệu không có mật khẩu
    const { password, ...userWithoutPassword } = updated;
    res.json({ message: "Cập nhật thành công.", user: userWithoutPassword });
  } catch (err) {
    rollbackUpload(req);
    res.status(err.status || 500).json({ message: err.message });
  }
};

export const sendResetOtp = async (req, res) => {
  try {
    const { email } = req.body;
    if (!(await UserRepository.findOne({ email }))) return res.status(404).json({ message: "Email không tồn tại." });
    const otp = generateOtp();
    await OtpRepository.create({
      email,
      otp,
      purpose: "RESET",
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });
    await sendOtpEmail(email, otp, "Khôi phục mật khẩu");
    res.json({ message: "OTP đã gửi." });
  } catch (err) {
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    const record = await OtpRepository.findOne({ email, otp, purpose: "RESET" });
    if (!record || record.expiresAt < new Date()) return res.status(400).json({ message: "OTP sai hoặc hết hạn." });

    const hashed = await bcrypt.hash(newPassword, 10);
    await UserRepository.findOneAndUpdate({ email }, { password: hashed });
    await OtpRepository.deleteMany({ email, purpose: "RESET" });
    res.json({ message: "Đã đổi mật khẩu." });
  } catch (err) {
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};

export const changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    
    // SỬA: Dùng findByIdAndUpdate để tránh dùng save() trực tiếp trên Document
    const user = await UserRepository.findByIdWithPassword(req.user._id);
    if (!user) return res.status(404).json({ message: "Người dùng không tồn tại." });
    
    if (!(await bcrypt.compare(oldPassword, user.password))) {
      return res.status(400).json({ message: "Mật khẩu cũ sai." });
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    await UserRepository.findByIdAndUpdate(req.user._id, { password: hashedNewPassword });
    
    res.json({ message: "Đổi mật khẩu thành công." });
  } catch (err) {
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};

export const getMe = async (req, res) => res.json(req.user);

export const getAllUsers = async (req, res) => {
  if (req.user.role !== "ADMIN") return res.status(403).json({ message: "Từ chối." });
  const users = await UserRepository.find({}, "-password");
  res.json(users);
};

export const register = async (req, res) => {
  try {
    const { username, email, password, name, birthday, gender, phone, role } = req.body;
    const validation = validateUserEntry(name, birthday, phone);
    if (validation.error) return res.status(400).json({ message: validation.error });

    await UserRepository.create({
      username,
      email,
      password: await bcrypt.hash(password, 10),
      name: validation.cleanName,
      birthday,
      gender,
      phone: validation.cleanPhone,
      avatar: req.file ? `/uploads/avatars/${req.file.filename}` : null,
      role: role || "VOLUNTEER",
    });
    res.status(201).json({ message: "Đăng ký thành công" });
  } catch (err) {
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};
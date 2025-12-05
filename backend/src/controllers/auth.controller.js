import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/user.js";
import Otp from "../models/otp.js";
import { generateOtp } from "../utils/generateOtp.js";
import { sendOtpEmail } from "../utils/sendMail.js";
import fs from "fs";
import path from "path";

const rollbackUpload = (req) => {
  if (req.file) {
    const newAvatarPath = path.join(process.cwd(), req.file.path);
    try {
      if (fs.existsSync(newAvatarPath)) {
        fs.unlinkSync(newAvatarPath);
        console.log("Đã rollback (xóa) file upload do lỗi:", newAvatarPath);
      }
    } catch (unlinkErr) {
      console.error("LỖI KHI ROLLBACK FILE:", unlinkErr.message);
    }
  }
};
// --- ĐĂNG KÝ (Sử dụng OTP) ---

// 📩 Gửi OTP Đăng ký
export const sendRegisterOtp = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: "Vui lòng nhập email." });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(400).json({ message: "Email đã được sử dụng." });

    const otp = generateOtp();
    await Otp.create({
      email,
      otp,
      purpose: "REGISTER",
      expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 phút
    });

    await sendOtpEmail(email, otp, "Đăng ký tài khoản VolunteerHub");
    res.status(200).json({ message: "OTP đăng ký đã được gửi đến email." });
  } catch (err) {
    console.error("❌ Lỗi trong sendRegisterOtp:", err);
    return res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};

// ✅ Xác thực OTP & Tạo tài khoản
export const verifyAndRegister = async (req, res) => {
  try {
    const {
      email,
      name,
      username,
      birthday,
      password,
      otp,
      gender,
      phone,
      avatar,
    } = req.body;

    // --- BƯỚC 1: VALIDATE TOÀN BỘ FORM TRƯỚC ---

    // 1.1. Validate Name (ĐÃ SỬA LOGIC)
    // Regex này bắt buộc viết hoa chữ cái đầu của mỗi từ
    // và phải có ít nhất 2 từ (Họ và Tên)
    const nameRegex = /^(\p{Lu}\p{Ll}*)(\s\p{Lu}\p{Ll}*)+$/u;

    if (!nameRegex.test(name)) {
      return res.status(400).json({
        message:
          "Họ tên không hợp lệ. Vui lòng viết hoa chữ cái đầu mỗi từ và có ít nhất 2 chữ (ví dụ: Tuấn Anh).",
      });
    }

    // 1.2. Validate Ngày sinh (giữ nguyên)
    // ... (logic validate ngày sinh của bạn) ...
    const birthDate = new Date(birthday);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    birthDate.setHours(0, 0, 0, 0);
    if (birthDate >= today) {
      return res.status(400).json({ message: "Ngày sinh không hợp lệ." });
    }
    const tenYearsAgo = new Date();
    tenYearsAgo.setFullYear(tenYearsAgo.getFullYear() - 10);
    if (birthDate > tenYearsAgo) {
      return res
        .status(400)
        .json({ message: "Bạn phải lớn hơn 10 tuổi để đăng ký." });
    }

    // 1.3. Chuẩn hóa Gender (giữ nguyên)
    // ... (logic chuẩn hóa gender của bạn) ...
    let normalizedGender = null;
    if (gender) {
      const lowerGender = gender.toLowerCase();
      if (lowerGender === "nam") normalizedGender = "Male";
      else if (lowerGender === "nữ") normalizedGender = "Female";
      else if (["male", "female", "other"].includes(lowerGender)) {
        normalizedGender =
          lowerGender.charAt(0).toUpperCase() + lowerGender.slice(1);
      } else {
        return res
          .status(400)
          .json({ message: `Giá trị giới tính '${gender}' không hợp lệ.` });
      }
    }

    // 1.4. Validate Phone (ĐÃ SỬA LOGIC)
    const phoneRegex = /^0[0-9]{9,10}$/;
    let cleanedPhone = phone ? phone.replace(/\s/g, "") : null; // 👈 Xóa tất cả khoảng trắng

    if (cleanedPhone && !phoneRegex.test(cleanedPhone)) {
      return res.status(400).json({
        message:
          "Số điện thoại không hợp lệ. Phải bắt đầu bằng 0 và có 10-11 chữ số.",
      });
    }

    // --- BƯỚC 2: KIỂM TRA VÀ "ĐỐT" OTP (giữ nguyên) ---
    const record = await Otp.findOneAndDelete({
      email,
      otp,
      purpose: "REGISTER",
    });
    if (!record)
      return res
        .status(400)
        .json({ message: "OTP không hợp lệ hoặc đã được sử dụng." });
    if (record.expiresAt < new Date())
      return res.status(400).json({ message: "OTP đã hết hạn." });

    // --- BƯỚC 3: TẠO USER ---
    const hashed = await bcrypt.hash(password, 10);
    await User.create({
      email,
      name,
      username,
      birthday,
      password: hashed,
      gender: normalizedGender,
      phone: cleanedPhone, // 👈 Lưu SĐT đã được làm sạch
      avatar,
    });

    res.status(201).json({ message: "Tài khoản đã được tạo thành công." });
  } catch (err) {
    // ... (logic catch giữ nguyên) ...
  }
};

// --- ĐĂNG NHẬP VÀ QUẢN LÝ HỒ SƠ ---
/**
 * 🔑 Đăng nhập bằng email hoặc username
 */
export const login = async (req, res) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res
        .status(400)
        .json({ message: "Vui lòng nhập email và mật khẩu." });
    }

    // ✅ Tìm user theo email hoặc username
    const user = await User.findOne(
      identifier.includes("@")
        ? { email: identifier }
        : { username: identifier }
    );
    if (!user)
      return res.status(404).json({ message: "Tài khoản không tồn tại." });

    // ✅ Kiểm tra mật khẩu
    const ok = await bcrypt.compare(password, user.password);
    if (!ok)
      return res.status(400).json({ message: "Mật khẩu không chính xác." });

    // ✅ Kiểm tra trạng thái
    if (user.status && user.status !== "ACTIVE") {
      return res.status(403).json({ message: "Tài khoản đang bị khóa." });
    }

    // ✅ Tạo JWT
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    return res.json({
      message: "Đăng nhập thành công",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        username: user.username,
        birthday: user.birthday,
        role: user.role,
        status: user.status,
        gender: user.gender,
        phone: user.phone,
        avatar: user.avatar,
        points: user.points,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (err) {
    console.error("❌ Lỗi trong login:", err);
    return res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};

/**
 * 👤 Lấy thông tin người dùng hiện tại từ JWT
 */

export const getMe = async (req, res) => {
  try {
    // Middleware 'verifyToken' đã giải mã token, tìm người dùng trong DB,
    // và gán toàn bộ đối tượng user vào 'req.user'.

    // Chúng ta không cần kiểm tra 'req.user.userId' hay tìm lại user.
    // Nếu 'req.user' không tồn tại, middleware đã trả về lỗi 401 rồi.

    // Chỉ cần trả về đối tượng 'req.user' đã được gán sẵn.
    return res.status(200).json(req.user);
  } catch (err) {
    console.error("❌ Lỗi trong getMe:", err);
    return res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};

/**
 * ✏️ Cập nhật thông tin người dùng hiện tại
 * (Đã hoàn thiện - Hỗ trợ upload file avatar)
 */
export const updateProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    const currentUser = req.user;

    // --- BƯỚC 1: VALIDATE DỮ LIỆU TEXT TỪ REQ.BODY ---
    const { name, birthday, gender, phone } = req.body;

    // THAY ĐỔI: Thay vì 'return', chúng ta 'throw' lỗi 400
    if (!name || !birthday) {
      throw { status: 400, message: "Vui lòng nhập đầy đủ thông tin..." };
    }

    const nameRegex = /^(\p{Lu}\p{Ll}*)(\s\p{Lu}\p{Ll}*)+$/u;
    if (!nameRegex.test(name)) {
      throw {
        status: 400,
        message:
          "Họ tên không hợp lệ. Vui lòng viết hoa chữ cái đầu mỗi từ và có ít nhất 2 chữ (ví dụ: Tuấn Anh).",
      };
    }

    let normalizedGender;
    if (gender === null || gender === undefined || gender === "") {
      normalizedGender = null;
    } else {
      const lowerGender = gender.toLowerCase();
      if (lowerGender === "nam") normalizedGender = "Male";
      else if (lowerGender === "nữ") normalizedGender = "Female";
      else if (["male", "female", "other"].includes(lowerGender)) {
        normalizedGender =
          lowerGender.charAt(0).toUpperCase() + lowerGender.slice(1);
      } else {
        throw {
          status: 400,
          message: `Giá trị giới tính '${gender}' không hợp lệ.`,
        };
      }
    }

    const phoneRegex = /^0[0-9]{9,10}$/;
    let cleanedPhone = phone ? phone.replace(/\s/g, "") : null;
    if (cleanedPhone === "") cleanedPhone = null;

    if (cleanedPhone && !phoneRegex.test(cleanedPhone)) {
      throw {
        status: 400,
        message:
          "Số điện thoại không hợp lệ. Phải bắt đầu bằng 0 và có 10-11 chữ số.",
      };
    }

    // --- BƯỚC 2: CHUẨN BỊ DỮ LIỆU ĐỂ CẬP NHẬT ---
    const updateData = {
      name,
      birthday,
      gender: normalizedGender,
      phone: cleanedPhone,
    };

    // --- BƯỚC 3: XỬ LÝ FILE AVATAR (NẾU CÓ) ---
    // (Logic xóa ảnh cũ của bạn đã đúng)
    if (req.file) {
      updateData.avatar = `/uploads/avatars/${req.file.filename}`;
      const defaultAvatar =
        "https://cdn-icons-png.flaticon.com/512/149/149071.png";
      if (
        currentUser.avatar &&
        currentUser.avatar !== defaultAvatar &&
        !currentUser.avatar.startsWith("http")
      ) {
        const oldAvatarPath = path.join(process.cwd(), currentUser.avatar);
        try {
          if (fs.existsSync(oldAvatarPath)) {
            fs.unlinkSync(oldAvatarPath);
            console.log("Đã xóa avatar cũ:", oldAvatarPath);
          }
        } catch (unlinkErr) {
          console.error("Lỗi khi xóa avatar cũ:", unlinkErr.message);
        }
      }
    }

    // --- BƯỚC 4: CẬP NHẬT DATABASE ---
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select("-password");

    if (!updatedUser) {
      // THAY ĐỔI: 'throw' lỗi 404
      throw { status: 404, message: "Không tìm thấy người dùng." };
    }

    // --- BƯỚC 5: TRẢ VỀ KẾT QUẢ THÀNH CÔNG ---
    return res.json({
      message: "Cập nhật hồ sơ thành công.",
      user: updatedUser,
    });
  } catch (err) {
    // --- BƯỚC 6: KHỐI CATCH-ALL (BẮT TẤT CẢ LỖI) ---

    // THAY ĐỔI QUAN TRỌNG:
    // Luôn gọi rollback! Nếu req.file không tồn tại, hàm sẽ không làm gì.
    // Nếu req.file tồn tại, nó sẽ bị xóa.
    rollbackUpload(req);

    // Xử lý lỗi 400/404/403 mà chúng ta đã 'throw'
    if (err.status) {
      return res.status(err.status).json({ message: err.message });
    }

    // Xử lý lỗi trùng lặp (từ DB)
    if (err.code === 11000) {
      const field = Object.keys(err.keyValue)[0];
      return res.status(409).json({
        message: `Lỗi: ${
          field === "email" ? "Email" : "Username"
        } này đã được sử dụng.`,
      });
    }

    // Các lỗi 500 khác
    console.error("❌ Lỗi trong updateProfile:", err);
    return res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};
// --- QUÊN MẬT KHẨU ---

// 📩 Gửi OTP Reset Mật khẩu
export const sendResetOtp = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "Email không tồn tại." });

    const otp = generateOtp();
    await Otp.create({
      email,
      otp,
      purpose: "RESET",
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });

    await sendOtpEmail(email, otp, "Khôi phục mật khẩu VolunteerHub");
    res.status(200).json({ message: "OTP khôi phục mật khẩu đã được gửi." });
  } catch (err) {
    console.error("❌ Lỗi trong sendResetOtp:", err);
    return res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};

// 🔑 Reset Mật khẩu bằng OTP
export const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    const record = await Otp.findOne({ email, otp, purpose: "RESET" });
    if (!record) return res.status(400).json({ message: "OTP không hợp lệ." });
    if (record.expiresAt < new Date())
      return res.status(400).json({ message: "OTP đã hết hạn." });

    if (!newPassword || newPassword.length < 6) {
      return res
        .status(400)
        .json({ message: "Mật khẩu mới phải có ít nhất 6 ký tự." });
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await User.findOneAndUpdate({ email }, { password: hashed });

    await Otp.deleteMany({ email, purpose: "RESET" });
    res.status(200).json({ message: "Mật khẩu đã được cập nhật thành công." });
  } catch (err) {
    console.error("❌ Lỗi trong resetPassword:", err);
    return res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};

/**
 * 🔒 Thay đổi mật khẩu (khi người dùng đã đăng nhập)
 */
export const changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;

    // 1. Lấy userId từ middleware 'verifyToken'
    // Lưu ý: Dùng req.user._id (vì verifyToken mới đã gán đầy đủ user)
    const userId = req.user._id;

    // 2. Kiểm tra dữ liệu đầu vào
    if (!oldPassword || !newPassword) {
      return res
        .status(400)
        .json({ message: "Vui lòng nhập mật khẩu cũ và mới." });
    }

    if (newPassword.length < 6) {
      return res
        .status(400)
        .json({ message: "Mật khẩu mới phải có ít nhất 6 ký tự." });
    }

    // 3. Lấy thông tin user (lần này cần lấy cả password)
    // .select('+password') là cần thiết nếu bạn đã ẩn password trong schema
    const user = await User.findById(userId).select("+password");
    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng." });
    }

    // 4. Kiểm tra mật khẩu cũ
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Mật khẩu cũ không chính xác." });
    }

    // 5. Băm và lưu mật khẩu mới
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save(); // Lưu lại user với mật khẩu mới

    return res.status(200).json({ message: "Đổi mật khẩu thành công." });
  } catch (err) {
    console.error("❌ Lỗi khi thay đổi mật khẩu:", err);
    return res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};
/**
 * 👥 Lấy danh sách toàn bộ người dùng (chỉ ADMIN)
 */
export const getAllUsers = async (req, res) => {
  try {
    if (req.user.role !== "ADMIN") {
      return res.status(403).json({ message: "Bạn không có quyền truy cập." });
    }

    const users = await User.find().select("-password");
    return res.json(users);
  } catch (err) {
    console.error("❌ Lỗi khi lấy danh sách người dùng:", err);
    return res.status(500).json({ message: "Lỗi máy chủ", error: err.message });
  }
};

/**
 * 📋 Đăng ký tài khoản mới
 * (Không sử dụng OTP - ADMIN THÊM NGƯỜI DÙNG MỚI)
 */
export const register = async (req, res) => {
  try {
    console.log('📝 Register endpoint hit!'); // ✅ Thêm log này
    console.log('📦 Body:', req.body);
    console.log('📎 File:', req.file);

    const { username, email, password, name, birthday, gender, phone, otp } = req.body;

    // 1. Kiểm tra dữ liệu đầu vào
    if (!username || !email || !password || !name || !birthday) {
      return res.status(400).json({ message: "Vui lòng nhập đầy đủ thông tin." });
    }

    // 2. Kiểm tra trùng lặp (email, username)
    const existingUser = await User.findOne({
      $or: [{ email }, { username }],
    });
    if (existingUser) {
      return res.status(400).json({ message: "Email hoặc username đã được sử dụng." });
    }

    // 3. Băm mật khẩu
    const hashedPassword = await bcrypt.hash(password, 10);

    // ✅ Xử lý avatar
    let avatarPath = null;
    if (req.file) {
      avatarPath = `/uploads/avatars/${req.file.filename}`;
    }

    const newUser = new User({
      username,
      email,
      password: hashedPassword,
      name,
      birthday,
      gender,
      phone,
      avatar: avatarPath, // ✅ Thêm field avatar
      role: "VOLUNTEER",
    });

    await newUser.save();
    res.status(201).json({ message: "Đăng ký thành công" });
  } catch (error) {
    console.error("❌ Lỗi trong register:", error);
    return res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

// ✅ Kiểm tra tên function - có thể là:
// - sendOTP (viết hoa TP)
// - sendOtp (viết thường tp)  
// - generateOTP
// Hoặc function không tồn tại

// Nếu function có tên khác, đổi tên cho khớp:
export const sendOTP = async (req, res) => {
  // ...existing code...
};

import express from "express";
import { admin, verifyToken } from "../middlewares/auth.js";
import {
  getPendingEvents,
  approveEvent,
  rejectEvent,
  deleteEventByAdmin,
  getAllSystemEvents,
  getAllUsers,
  updateUserStatus,
  exportUsers,
  exportEvents,
  exportVolunteers,
  getDashboardStats,
  updateUserRole,
  getTrendingEvents,
  getRecentActivity,
  getVolunteerRanking,
  getEventManagerRanking,
} from "../controllers/admin.controller.js";

const router = express.Router();

// =============================================================================
// ROUTES QUẢN TRỊ VIÊN (ADMIN)
// =============================================================================

// Áp dụng middleware cho TẤT CẢ các route trong file này
// Bất kỳ ai truy cập các API này đều phải đăng nhập VÀ là Admin
router.use(verifyToken, admin);

// --- QUẢN LÝ SỰ KIỆN ---

// [GET] /api/admin/events/all
// 📋 Lấy danh sách TẤT CẢ sự kiện trong hệ thống
// - Chức năng: Xem toàn bộ sự kiện (pending, approved, rejected, completed).
// - Trả về: Danh sách mảng các object Event.
router.get("/events/all", getAllSystemEvents);

// [GET] /api/admin/events/pending
// ⏳ Lấy danh sách các sự kiện đang chờ duyệt
// - Chức năng: Lọc ra các sự kiện có status = "PENDING".
// - Trả về: Danh sách mảng các object Event chờ duyệt.
router.get("/events/pending", getPendingEvents);

// [PUT] /api/admin/events/:id/approve
// ✅ Phê duyệt một sự kiện
// - Chức năng: Chuyển trạng thái sự kiện từ "PENDING" sang "APPROVED".
// - Trả về: Object Event đã được cập nhật.
router.put("/events/:id/approve", approveEvent);

// [PUT] /api/admin/events/:id/reject
// ❌ Từ chối một sự kiện
// - Chức năng: Chuyển trạng thái sự kiện từ "PENDING" sang "REJECTED".
// - Body yêu cầu (tùy chọn): { "reason": "Lý do từ chối" }
// - Trả về: Object Event đã được cập nhật.
router.put("/events/:id/reject", rejectEvent);

// [DELETE] /api/admin/events/:id
// 🗑️ Xóa sự kiện (Quyền Admin)
// - Chức năng: Xóa cứng hoặc xóa mềm sự kiện khỏi hệ thống.
// - Trả về: Thông báo thành công.
router.delete("/events/:id", deleteEventByAdmin);

// --- QUẢN LÝ NGƯỜI DÙNG ---

// [GET] /api/admin/users
// 👥 Lấy danh sách tất cả người dùng
// - Chức năng: Xem danh sách Volunteer, Event Manager, Admin.
// - Trả về: Danh sách mảng các object User (thường ẩn password).
router.get("/users", getAllUsers);

// [PUT] /api/admin/users/:id/status
// 🔒 Cập nhật trạng thái người dùng
// - Chức năng: Khóa (LOCKED) hoặc Mở khóa (ACTIVE) tài khoản.
// - Body yêu cầu: { "status": "LOCKED" } hoặc { "status": "ACTIVE" }
// - Trả về: Object User đã cập nhật.
router.put("/users/:id/status", updateUserStatus);

// [PUT] /api/admin/users/:id/role
// 👮 Cập nhật vai trò người dùng
// - Chức năng: Thăng cấp hoặc hạ cấp user (VD: Volunteer -> Event Manager).
// - Body yêu cầu: { "role": "EVENTMANAGER" }
// - Trả về: Object User đã cập nhật.
router.put("/users/:id/role", updateUserRole);

// --- XUẤT DỮ LIỆU ---

// [GET] /api/admin/export/users
// 📤 Xuất danh sách người dùng
// - Chức năng: Tải về file (CSV/Excel) danh sách user.
// - Trả về: File stream (download).
router.get("/export/users", exportUsers);

// [GET] /api/admin/export/events
// 📤 Xuất danh sách sự kiện
// - Query: ?format=csv|json (mặc định csv)
router.get("/export/events", exportEvents);

// [GET] /api/admin/export/volunteers
// 📤 Xuất danh sách tình nguyện viên
// - Query: ?format=csv|json (mặc định csv)
router.get("/export/volunteers", exportVolunteers);

// --- DASHBOARD ---

// [GET] /api/admin/dashboard
// 📊 Thống kê Dashboard Admin
// - Chức năng: Lấy tổng số user, tổng sự kiện, sự kiện chờ duyệt...
// - Trả về: { totalUsers, totalEvents, pendingEvents, ... }
router.get("/dashboard", getDashboardStats);

// [GET] /api/admin/trending
// 🔥 Sự kiện đang trending
// - Chức năng: Lấy sự kiện có lượt đăng ký, bài viết, comment tăng nhanh
// - Query: ?days=7 (mặc định 7 ngày)
// - Trả về: Mảng events với metrics (recentRegistrations, recentPosts, recentComments, trendingScore)
router.get("/trending", getTrendingEvents);

// [GET] /api/admin/recent-activity
// 🆕 Hoạt động gần đây
// - Chức năng: Lấy sự kiện mới công bố và có tin bài mới
// - Trả về: { recentlyPublished, recentPosts, recentComments }
router.get("/recent-activity", getRecentActivity);

// [GET] /api/admin/ranking
// 🏆 Bảng xếp hạng tình nguyện viên
// - Chức năng: Lấy danh sách volunteers xếp hạng theo points
// - Trả về: Mảng volunteers với rank, points, completedEvents
router.get("/ranking", getVolunteerRanking);

// [GET] /api/admin/ranking/managers
// 🏆 Bảng xếp hạng quản lý sự kiện
// - Chức năng: Lấy danh sách event managers xếp hạng theo số sự kiện và tình nguyện viên
// - Trả về: Mảng managers với rank, totalEvents, completedEvents, totalVolunteers, score
router.get("/ranking/managers", getEventManagerRanking);

export default router;

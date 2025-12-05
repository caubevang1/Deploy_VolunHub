// =================================================================================================
// Import các module cần thiết
// =================================================================================================
import express from "express"; // Framework web chính
import dotenv from "dotenv"; // Để quản lý biến môi trường từ file .env
import cors from "cors"; // Middleware để xử lý Cross-Origin Resource Sharing
import { connectDB } from "./config/db.js"; // Hàm kết nối đến MongoDB
import { startCronJobs } from "./utils/cronJob.js"; // Hàm khởi động các cron jobs
// =================================================================================================
// Import các file routes
// =================================================================================================
import authRoutes from "./routes/auth.routes.js"; // Đúng
// import authRoutes from '../routes/auth.routes.js'; // ❌ Sai
import adminRoutes from "./routes/admin.routes.js";
import eventRoutes from "./routes/event.routes.js";
import registrationRoutes from "./routes/registration.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
import statisticsRoutes from "./routes/statistics.routes.js";
import notificationRoutes from "./routes/notification.routes.js";
import postRoutes from "./routes/post.routes.js";
import commentRoutes from "./routes/comment.routes.js";
import eventActionRoutes from "./routes/eventAction.routes.js";

import path from "path";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// =================================================================================================
// Cấu hình và khởi tạo Express App
// =================================================================================================
dotenv.config(); // Tải các biến môi trường từ file .env
const app = express(); // Tạo một instance của Express

// =================================================================================================
// Middlewares
// =================================================================================================
// Cho phép frontend (chạy trên domain khác) có thể gọi đến API này
app.use(cors());
// Middleware để phân tích body của request dưới dạng JSON
app.use(express.json());
// Middleware để phân tích các trường trong form
app.use(express.urlencoded({ extended: true }));

// =================================================================================================
// Kết nối cơ sở dữ liệu
// =================================================================================================
await connectDB();

startCronJobs();
// =================================================================================================
// Định nghĩa Routes
// =================================================================================================
// Route cơ bản để kiểm tra API có hoạt động không
app.get("/", (req, res) => {
  res.send("✅ VolunteerHub Backend API is running...");
});

// Gắn các routes vào ứng dụng với tiền tố tương ứng
app.use("/api/auth", authRoutes); // Routes xác thực người dùng
app.use("/api/admin", adminRoutes); // Routes cho admin
app.use("/api/events", eventRoutes); // Routes quản lý sự kiện
app.use("/api/actions", eventActionRoutes); // Routes cho các hành động trên sự kiện
app.use("/api/registrations", registrationRoutes); // Routes quản lý đăng ký
app.use("/api/posts", postRoutes); // Routes cho Post
app.use("/api/comments", commentRoutes); // Routes cho Comment
app.use("/api/dashboard", dashboardRoutes); // Routes cho dashboard
app.use("/api/statistics", statisticsRoutes); // Routes cho thống kê
app.use("/api/notifications", notificationRoutes); // Routes cho thông báo

// Tạo route ảo /uploads để trỏ vào thư mục /uploads thật
app.use("/uploads", express.static("uploads"));
// =================================================================================================
// Xử lý lỗi 404 - Route không tồn tại
// =================================================================================================
// Middleware này sẽ được gọi khi không có route nào khớp với request
app.use((req, res) => {
  res.status(404).json({ message: "❌ API route not found" });
});

// ✅ Catch-all 404 phải đặt CUỐI CÙNG (sau tất cả routes)
app.use((req, res) => {
  console.log("❌ 404 Not Found:", req.method, req.originalUrl);
  res.status(404).json({
    message: "API route not found",
    path: req.originalUrl,
  });
});

// =================================================================================================
// Khởi động Server
// =================================================================================================
const PORT = process.env.PORT || 5000; // Lấy port từ biến môi trường hoặc mặc định là 5000
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

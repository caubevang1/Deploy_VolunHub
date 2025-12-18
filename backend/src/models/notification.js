// backend/src/models/notification.js
import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // Tiêu đề/Loại thông báo (Đã bỏ enum để linh hoạt nội dung)
    type: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  { 
    timestamps: true,
    // Cấu hình vô trùng dữ liệu đầu ra cho toàn bộ hệ thống
    toJSON: {
      virtuals: true,
      versionKey: false,
      transform: (doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
      },
    },
    toObject: {
      virtuals: true,
      versionKey: false,
      transform: (doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
      },
    },
  }
);

// Tạo virtual field 'id' ánh xạ từ '_id' để Frontend (như Header.jsx) dễ dàng sử dụng
notificationSchema.virtual("id").get(function () {
  return this._id.toHexString();
});

const Notification = mongoose.model("Notification", notificationSchema);
export default Notification;
import mongoose from "mongoose";

const eventSchema = new mongoose.Schema(
  {
    // --- Thông tin cơ bản cho Tình nguyện viên xem ---
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    location: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      required: true,
    },
    points: {
      type: Number,
      default: 0,
      min: 0,
    },
    maxParticipants: {
      type: Number,
      required: true,
      min: 1, // Ít nhất phải cho 1 người tham gia
    },
    coverImage: {
      // Ảnh bìa sự kiện
      type: String,
      default: "default-event-image.jpg",
    },

    galleryImages: [
      {
        type: String,
      },
    ],

    // --- Trường Vận hành & Quản lý ---
    status: {
      // Dành cho Admin duyệt và quản lý vòng đời sự kiện
      type: String,
      enum: ["pending", "approved", "rejected", "completed"],
      default: "pending",
    },
    rejectionReason: {
      // Lý do từ chối sự kiện (nếu status = "rejected")
      type: String,
      default: null,
    },
    createdBy: {
      // Dành cho Event Manager, để biết ai tạo sự kiện
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    likesCount: { type: Number, default: 0 },
    sharesCount: { type: Number, default: 0 },
    viewsCount: { type: Number, default: 0 },
  },
  {
    // Tự động thêm 2 trường createdAt và updatedAt
    timestamps: true,
  }
);

const Event = mongoose.model("Event", eventSchema);
export default Event;

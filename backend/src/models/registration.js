import mongoose from "mongoose";

// Định nghĩa schema cho việc đăng ký sự kiện
const registrationSchema = new mongoose.Schema(
  {
    // ID của sự kiện mà tình nguyện viên đăng ký
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
    },
    // ID của tình nguyện viên đăng ký
    volunteer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // Trạng thái của đơn đăng ký
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "completed", "cancelled"],
      default: "pending",
    },
    performance: {
      type: String,
      enum: ["GOOD", "AVERAGE", "BAD", "NO_SHOW", null],
      default: null,
    },
    // Yêu cầu hủy đăng ký
    cancelRequest: {
      type: Boolean,
      default: false,
    },
    // Lý do từ chối đăng ký
    rejectionReason: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
    // --- CẤU HÌNH ĐỘC LẬP CSDL (PHASE 2) ---
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

// Ngăn một người đăng ký cùng một sự kiện nhiều lần
registrationSchema.index({ event: 1, volunteer: 1 }, { unique: true });

// Tạo virtual field 'id' ánh xạ từ '_id'
registrationSchema.virtual("id").get(function () {
  return this._id.toHexString();
});

const Registration = mongoose.model("Registration", registrationSchema);
export default Registration;

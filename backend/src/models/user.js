import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    birthday: {
      type: Date,
      required: true,
    },
    gender: {
      type: String,
      enum: ["Male", "Female", "Other"],
      default: null,
    },
    phone: {
      type: String,
      trim: true, 
      default: null,
    },
    avatar: {
      type: String,
      default: "https://cdn-icons-png.flaticon.com/512/149/149071.png", 
    },
    points: {
      type: Number,
      default: 0, 
      min: 0, 
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    role: {
      type: String,
      enum: ["VOLUNTEER", "EVENTMANAGER", "ADMIN"],
      required: true, // Sửa lại require -> required
    },
    status: {
      type: String,
      enum: ["ACTIVE", "LOCKED"],
      default: "ACTIVE",
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
        // Bảo mật: Không bao giờ trả về password khi convert sang JSON
        delete ret.password;
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

// Tạo virtual field 'id' ánh xạ từ '_id'
userSchema.virtual("id").get(function () {
  return this._id.toHexString();
});

// Bạn có thể thêm các method hỗ trợ tại đây nếu cần, ví dụ:
// userSchema.methods.comparePassword = ...

export default mongoose.model("User", userSchema);
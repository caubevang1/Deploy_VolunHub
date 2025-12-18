import mongoose from "mongoose";

const eventActionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
    },
    type: {
      type: String,
      enum: ["LIKE", "SHARE", "VIEW"],
      required: true,
    },
  },
  { 
    timestamps: true,
    // Cấu hình chuyển đổi dữ liệu đầu ra để đảm bảo tính độc lập CSDL
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

// Ràng buộc duy nhất: Một người dùng chỉ có thể thực hiện 1 loại hành động 1 lần trên 1 sự kiện
eventActionSchema.index({ user: 1, event: 1, type: 1 }, { unique: true });

// Tạo virtual 'id' để thống nhất cách truy cập thuộc tính định danh
eventActionSchema.virtual("id").get(function () {
  return this._id.toHexString();
});

const EventAction = mongoose.model("EventAction", eventActionSchema);
export default EventAction;
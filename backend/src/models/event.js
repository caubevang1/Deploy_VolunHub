import mongoose from "mongoose";

const eventSchema = new mongoose.Schema(
  {
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
      min: 1,
    },
    coverImage: {
      type: String,
      default: "default-event-image.jpg",
    },
    galleryImages: [
      {
        type: String,
      },
    ],
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "completed"],
      default: "pending",
    },
    rejectionReason: {
      type: String,
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    likesCount: { type: Number, default: 0 },
    sharesCount: { type: Number, default: 0 },
    viewsCount: { type: Number, default: 0 },
  },
  {
    timestamps: true,
    // --- Cấu hình vô trùng dữ liệu ---
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

// Tạo virtual field 'id' để thống nhất cách truy cập dữ liệu
eventSchema.virtual("id").get(function () {
  return this._id.toHexString();
});

const Event = mongoose.model("Event", eventSchema);
export default Event;
// src/models/subscription.js
import mongoose from "mongoose";

const subscriptionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    endpoint: {
      type: String,
      required: true,
    },
    keys: {
      p256dh: { type: String, required: true },
      auth: { type: String, required: true },
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

// Index để tìm kiếm nhanh theo user
subscriptionSchema.index({ user: 1 });

// Tạo virtual field 'id' ánh xạ từ '_id'
subscriptionSchema.virtual("id").get(function () {
  return this._id.toHexString();
});

const Subscription = mongoose.model("Subscription", subscriptionSchema);

export default Subscription;
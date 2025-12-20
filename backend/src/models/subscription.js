/**
 * Subscription Model
 * Manages push notification subscriptions for web push functionality.
 * Stores endpoint and encryption keys for service worker notifications.
 */

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

subscriptionSchema.index({ user: 1 });

subscriptionSchema.virtual("id").get(function () {
  return this._id.toHexString();
});

const Subscription = mongoose.model("Subscription", subscriptionSchema);

export default Subscription;
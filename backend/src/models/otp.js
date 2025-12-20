/**
 * OTP Model
 * Manages one-time passwords for user registration and password reset.
 * Includes expiration time for security.
 */

import mongoose from "mongoose";

const otpSchema = new mongoose.Schema(
  {
    email: { type: String, required: true },
    otp: { type: String, required: true },
    purpose: { type: String, enum: ["REGISTER", "RESET"], required: true },
    expiresAt: { type: Date, required: true },
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

otpSchema.virtual("id").get(function () {
  return this._id.toHexString();
});

export default mongoose.model("Otp", otpSchema);
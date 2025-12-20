/**
 * Registration Model
 * Manages volunteer event registrations with approval workflow.
 * Includes performance tracking and cancellation request handling.
 * Enforces one registration per user per event through unique index.
 */

import mongoose from "mongoose";

const registrationSchema = new mongoose.Schema(
  {
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
    },
    volunteer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
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
    cancelRequest: {
      type: Boolean,
      default: false,
    },
    rejectionReason: {
      type: String,
      default: null,
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

registrationSchema.index({ event: 1, volunteer: 1 }, { unique: true });

registrationSchema.virtual("id").get(function () {
  return this._id.toHexString();
});

const Registration = mongoose.model("Registration", registrationSchema);
export default Registration;

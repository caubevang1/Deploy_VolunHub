/**
 * EventAction Model
 * Tracks user engagement actions on events (LIKE, SHARE, VIEW).
 * Prevents duplicate actions through unique compound index.
 */

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

eventActionSchema.index({ user: 1, event: 1, type: 1 }, { unique: true });

eventActionSchema.virtual("id").get(function () {
  return this._id.toHexString();
});

const EventAction = mongoose.model("EventAction", eventActionSchema);
export default EventAction;
// backend/src/repositories/EventRepository.js
import mongoose from "mongoose";
import BaseRepository from "./BaseRepository.js";
import Event from "../models/event.js";

class EventRepository extends BaseRepository {
  constructor() {
    super(Event);
  }

  async getEventsWithStats(filter = {}) {
    // 1. Ép kiểu ObjectId cho Aggregate
    if (filter._id && typeof filter._id === "string" && mongoose.isValidObjectId(filter._id)) {
      filter._id = new mongoose.Types.ObjectId(filter._id);
    }

    const pipeline = [
      { $match: filter },
      {
        $lookup: {
          from: "registrations",
          localField: "_id",
          foreignField: "event",
          as: "registrations",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "createdBy",
          foreignField: "_id",
          as: "creatorInfo",
        },
      },
      {
        $project: {
          name: 1,
          description: 1,
          date: 1,
          endDate: 1,
          location: 1,
          category: 1,
          coverImage: 1,
          galleryImages: 1,
          status: 1,
          maxParticipants: 1,
          points: 1,
          likesCount: 1,
          sharesCount: 1,
          viewsCount: 1,
          rejectionReason: 1,
          createdAt: 1, // Cần thiết cho sorting
          createdBy: { $arrayElemAt: ["$creatorInfo", 0] },
          currentParticipants: {
            $size: {
              $filter: {
                input: "$registrations",
                as: "reg",
                cond: { $in: ["$$reg.status", ["approved", "completed"]] },
              },
            },
          },
        },
      },
      { $sort: { createdAt: -1 } },
    ];

    return await this.model.aggregate(pipeline);
  }

  async updateLikeCount(eventId, inc = 1) {
    return await this.model.findByIdAndUpdate(eventId, { $inc: { likesCount: inc } }, { new: true }).lean();
  }

  async incrementShareCount(eventId) {
    return await this.model.findByIdAndUpdate(eventId, { $inc: { sharesCount: 1 } }, { new: true }).lean();
  }

  async incrementViewCount(eventId) {
    return await this.model.findByIdAndUpdate(eventId, { $inc: { viewsCount: 1 } }, { new: true }).lean();
  }
}

export default new EventRepository();
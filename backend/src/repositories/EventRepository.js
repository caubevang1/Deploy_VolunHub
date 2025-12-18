// src/repositories/EventRepository.js
import mongoose from "mongoose";
import BaseRepository from "./BaseRepository.js";
import Event from "../models/event.js";

class EventRepository extends BaseRepository {
  constructor() {
    super(Event);
  }

  /**
   * Helper nội bộ: Chuyển đổi các định dạng filter sang MongoDB chuẩn
   */
  #prepareFilter(filter) {
    const mongoFilter = {};
    Object.keys(filter).forEach(key => {
      if (filter[key] !== undefined && filter[key] !== null && filter[key] !== "") {
        mongoFilter[key] = filter[key];
      }
    });
    
    const idVal = mongoFilter.id || mongoFilter._id;
    if (idVal && typeof idVal === "string" && mongoose.isValidObjectId(idVal)) {
      mongoFilter._id = new mongoose.Types.ObjectId(idVal);
      delete mongoFilter.id;
    }

    if (mongoFilter.createdBy && typeof mongoFilter.createdBy === "string" && mongoose.isValidObjectId(mongoFilter.createdBy)) {
      mongoFilter.createdBy = new mongoose.Types.ObjectId(mongoFilter.createdBy);
    }

    if (mongoFilter.date && typeof mongoFilter.date === "string") {
      const d = new Date(mongoFilter.date);
      if (!isNaN(d.getTime())) {
        const nextD = new Date(d);
        nextD.setDate(nextD.getDate() + 1);
        mongoFilter.date = { $gte: d, $lt: nextD };
      } else {
        delete mongoFilter.date;
      }
    }
    return mongoFilter;
  }

  /**
   * Lấy chi tiết 1 sự kiện kèm thống kê (Dùng cho Admin Detail)
   */
  async getEventWithStatsById(eventId) {
    try {
      if (!mongoose.isValidObjectId(eventId)) return null;
      const oId = new mongoose.Types.ObjectId(eventId);

      const results = await this.model.aggregate([
        { $match: { _id: oId } },
        {
          $lookup: {
            from: "registrations",
            localField: "_id",
            foreignField: "event",
            as: "registrations"
          }
        },
        {
          $lookup: {
            from: "users",
            localField: "createdBy",
            foreignField: "_id",
            as: "creator"
          }
        },
        {
          $project: {
            name: 1, description: 1, date: 1, endDate: 1, location: 1, category: 1,
            coverImage: 1, galleryImages: 1, status: 1, maxParticipants: 1,
            points: 1, likesCount: 1, sharesCount: 1, viewsCount: 1, rejectionReason: 1,
            createdBy: { $arrayElemAt: ["$creator", 0] },
            currentParticipants: {
              $size: {
                $filter: {
                  input: "$registrations",
                  as: "reg",
                  cond: { $eq: ["$$reg.status", "approved"] }
                }
              }
            }
          }
        }
      ]);
      return results.length > 0 ? this.transform(results[0]) : null;
    } catch (error) {
      throw new Error("Lỗi Repo Detail: " + error.message);
    }
  }

  /**
   * Lấy danh sách sự kiện theo trạng thái (Dùng cho Admin Pending List)
   */
  async getEventsByStatus(status) {
    const results = await this.model.aggregate([
      { $match: { status: status } },
      {
        $lookup: {
          from: "users",
          localField: "createdBy",
          foreignField: "_id",
          as: "creator"
        }
      },
      {
        $project: {
          name: 1, category: 1, status: 1, createdAt: 1, updatedAt: 1,
          createdBy: { $arrayElemAt: ["$creator", 0] },
        }
      },
      { $sort: { createdAt: -1 } }
    ]);
    return this.transform(results);
  }

  async getAllSystemEventsWithStats() {
    const results = await this.model.aggregate([
      {
        $lookup: {
          from: "registrations",
          localField: "_id",
          foreignField: "event",
          as: "registrations"
        }
      },
      {
        $lookup: {
          from: "users",
          localField: "createdBy",
          foreignField: "_id",
          as: "creator"
        }
      },
      {
        $project: {
          name: 1, date: 1, endDate: 1, location: 1, category: 1,
          status: 1, rejectionReason: 1, createdAt: 1,
          createdBy: { $arrayElemAt: ["$creator", 0] },
          totalRegistrations: { $size: "$registrations" },
          currentParticipants: {
            $size: {
              $filter: {
                input: "$registrations",
                as: "reg",
                cond: { $eq: ["$$reg.status", "approved"] }
              }
            }
          }
        }
      },
      { $sort: { createdAt: -1 } }
    ]);
    return this.transform(results);
  }

  async getEventsWithStats(filter = {}) {
    const mongoFilter = this.#prepareFilter(filter);
    const results = await this.model.aggregate([
      { $match: mongoFilter },
      { $lookup: { from: "registrations", localField: "_id", foreignField: "event", as: "registrations" } },
      { $lookup: { from: "users", localField: "createdBy", foreignField: "_id", as: "creator" } },
      {
        $project: {
          name: 1, description: 1, date: 1, endDate: 1, location: 1, category: 1,
          coverImage: 1, galleryImages: 1, status: 1, maxParticipants: 1,
          points: 1, likesCount: 1, sharesCount: 1, viewsCount: 1, rejectionReason: 1,
          createdBy: { $arrayElemAt: ["$creator", 0] },
          currentParticipants: {
            $size: { $filter: { input: "$registrations", as: "reg", cond: { $eq: ["$$reg.status", "approved"] } } },
          },
        },
      },
      { $sort: { date: 1 } },
    ]);
    return this.transform(results);
  }

  async getSinglePublicEventDetail(identifier) {
    const filter = { status: "approved", $or: [{ name: identifier }] };
    if (mongoose.isValidObjectId(identifier)) {
      filter.$or.push({ _id: new mongoose.Types.ObjectId(identifier) });
    }
    const arr = await this.getEventsWithStats(filter);
    return arr && arr.length > 0 ? arr[0] : null;
  }

  async getApprovedEventsFiltered({ category, date }) {
    return await this.getEventsWithStats({ status: "approved", category, date });
  }

  async getEventsByManager(managerId) {
    return await this.find({ createdBy: managerId }, null, { sort: { date: 1 } });
  }

  async updateStatus(id, status) {
    return await this.findByIdAndUpdate(id, { status });
  }

  async rejectEvent(id, reason) {
    return await this.findByIdAndUpdate(id, { 
      status: "rejected", 
      rejectionReason: reason || "Không có lý do cụ thể" 
    });
  }

  async getAdminDashboardStats() {
    const [pending, approved, rejected, completed] = await Promise.all([
      this.countDocuments({ status: "pending" }),
      this.countDocuments({ status: "approved" }),
      this.countDocuments({ status: "rejected" }),
      this.countDocuments({ status: "completed" }),
    ]);
    return {
      pendingEventsCount: pending,
      approvedEventsCount: approved,
      rejectedEventsCount: rejected,
      completedEventsCount: completed,
      totalEvents: pending + approved + rejected + completed
    };
  }

  async getTrendingEvents(days = 7) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    const events = await this.getEventsWithStats({ status: "approved" });
    const data = await Promise.all(events.map(async (e) => {
      const eId = new mongoose.Types.ObjectId(e.id);
      const [reg, likes, shares] = await Promise.all([
        mongoose.model("Registration").countDocuments({ event: eId, createdAt: { $gte: cutoffDate } }),
        mongoose.model("EventAction").countDocuments({ event: eId, type: "LIKE", createdAt: { $gte: cutoffDate } }),
        mongoose.model("EventAction").countDocuments({ event: eId, type: "SHARE", createdAt: { $gte: cutoffDate } })
      ]);
      return { ...e, recentRegistrations: reg, recentLikes: likes, recentShares: shares, trendingScore: reg * 3 + likes * 2 + shares * 5 };
    }));
    return data.sort((a, b) => b.trendingScore - a.trendingScore).slice(0, 10);
  }

  async getStatsBatch(eventIds) {
    const objectIds = eventIds.filter(id => mongoose.isValidObjectId(id)).map(id => new mongoose.Types.ObjectId(id));
    const events = await this.model.find({ _id: { $in: objectIds } }, "likesCount sharesCount viewsCount").lean();
    return events.reduce((acc, ev) => {
      acc[String(ev._id)] = { likesCount: ev.likesCount || 0, sharesCount: ev.sharesCount || 0, viewsCount: ev.viewsCount || 0 };
      return acc;
    }, {});
  }

  async updateLikeCount(eventId, inc = 1) {
    return await this.findByIdAndUpdate(eventId, { $inc: { likesCount: inc } });
  }

  async incrementShareCount(eventId) {
    return await this.findByIdAndUpdate(eventId, { $inc: { sharesCount: 1 } });
  }

  async incrementViewCount(eventId) {
    return await this.findByIdAndUpdate(eventId, { $inc: { viewsCount: 1 } });
  }
}

export default new EventRepository();
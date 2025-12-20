/**
 * RegistrationRepository
 * Manages volunteer event registrations with status tracking and analytics.
 * Provides batch statistics and dashboard data aggregation.
 */

import mongoose from "mongoose";
import BaseRepository from "./BaseRepository.js";
import Registration from "../models/registration.js";

class RegistrationRepository extends BaseRepository {
  constructor() {
    super(Registration);
  }

  /**
   * Check if user is an approved member of an event.
   */
  async checkMemberStatus(userId, eventId) {
    const reg = await this.findOne({
      event: eventId,
      volunteer: userId,
      status: "approved",
    });
    return !!reg;
  }

  /**
   * Find registration record for specific user and event.
   */
  async findOneUserRegistration(userId, eventId) {
    try {
      const res = await this.model
        .findOne({
          volunteer: new mongoose.Types.ObjectId(userId),
          event: new mongoose.Types.ObjectId(eventId),
        })
        .lean();
      return this.transform(res);
    } catch (error) {
      return null;
    }
  }

  /**
   * Get all registrations for an event with volunteer details.
   */
  async getRegistrationsByEvent(eventId) {
    return await this.find(
      { event: eventId },
      null,
      { sort: { createdAt: -1 } },
      "volunteer"
    );
  }

  /**
   * Get registration statistics for multiple events in batch.
   * Returns map of event IDs to their registration counts.
   */
  async getRegistrationStatsBatch(eventIds) {
    if (!eventIds || eventIds.length === 0) {
      return {};
    }

    const objectEventIds = eventIds.map(
      (id) => new mongoose.Types.ObjectId(id)
    );

    const stats = await this.model.aggregate([
      {
        $match: {
          event: { $in: objectEventIds },
        },
      },
      {
        $group: {
          _id: "$event",
          totalRegistrations: { $sum: 1 },
          cancelRequests: {
            $sum: {
              $cond: ["$cancelRequest", 1, 0],
            },
          },
        },
      },
    ]);

    const statsMap = stats.reduce((acc, item) => {
      acc[item._id.toString()] = {
        totalRegistrations: item.totalRegistrations,
        cancelRequests: item.cancelRequests,
      };
      return acc;
    }, {});

    return statsMap;
  }

  /**
   * Get volunteer dashboard data with event statistics.
   * Uses aggregation pipeline for optimized database queries.
   */
  async getVolunteerDashboardData(volunteerId) {
    const vId = new mongoose.Types.ObjectId(volunteerId);
    const now = new Date();

    const results = await this.model.aggregate([
      { $match: { volunteer: vId } },
      {
        $lookup: {
          from: "events",
          localField: "event",
          foreignField: "_id",
          as: "eventData",
        },
      },
      {
        $unwind: {
          path: "$eventData",
          preserveNullAndEmptyArrays: false,
        },
      },
      {
        $facet: {
          completedEvents: [
            { $match: { status: "completed" } },
            { $sort: { createdAt: -1 } },
          ],
          currentEvents: [
            {
              $match: {
                status: "approved",
                "eventData.date": { $lte: now },
              },
            },
            { $sort: { createdAt: -1 } },
          ],
          upcomingEvents: [
            {
              $match: {
                status: "approved",
                "eventData.date": { $gt: now },
              },
            },
            { $sort: { "eventData.date": 1 } },
          ],
          pendingEvents: [
            { $match: { status: "pending" } },
            { $sort: { createdAt: -1 } },
          ],
        },
      },
    ]);

    const data = results[0] || {
      completedEvents: [],
      currentEvents: [],
      upcomingEvents: [],
      pendingEvents: [],
    };

    // Transform từng mảng
    return {
      completedEvents: this.transform(data.completedEvents),
      currentEvents: this.transform(data.currentEvents),
      upcomingEvents: this.transform(data.upcomingEvents),
      pendingEvents: this.transform(data.pendingEvents),
    };
  }

  /**
   * Thống kê tổng quan số lượng cho Tình nguyện viên bằng Pipeline Aggregate
   */
  async getVolunteerDashboardStats(volunteerId) {
    const vId = new mongoose.Types.ObjectId(volunteerId);
    const stats = await this.model.aggregate([
      { $match: { volunteer: vId } },
      {
        $group: {
          _id: null,
          totalRegistrations: { $sum: 1 },
          totalCompleted: {
            $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] },
          },
          totalApproved: {
            $sum: { $cond: [{ $eq: ["$status", "approved"] }, 1, 0] },
          },
          totalPending: {
            $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] },
          },
          totalCancelRequests: { $sum: { $cond: ["$cancelRequest", 1, 0] } },
        },
      },
    ]);

    const result = stats[0] || {
      totalRegistrations: 0,
      totalCompleted: 0,
      totalApproved: 0,
      totalPending: 0,
      totalCancelRequests: 0,
    };

    return {
      ...result,
      completionRate: result.totalRegistrations
        ? ((result.totalCompleted / result.totalRegistrations) * 100).toFixed(2)
        : 0,
      approvalRate: result.totalRegistrations
        ? ((result.totalApproved / result.totalRegistrations) * 100).toFixed(2)
        : 0,
    };
  }

  /**
   * Thống kê lượt đăng ký theo từng tháng cho Quản lý (Manager)
   */
  async getManagerMonthlyRegistrationStats(eventIds, year) {
    const ids = eventIds.map((id) => new mongoose.Types.ObjectId(id));
    const start = new Date(`${year}-01-01T00:00:00.000Z`);
    const end = new Date(`${year}-12-31T23:59:59.999Z`);

    const regs = await this.model
      .find({
        event: { $in: ids },
        createdAt: { $gte: start, $lte: end },
      })
      .select("createdAt")
      .lean();

    const monthly = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      registrations: 0,
    }));
    regs.forEach((r) => {
      monthly[new Date(r.createdAt).getMonth()].registrations++;
    });
    return monthly;
  }

  /**
   * Trả về dữ liệu xuất báo cáo Tình nguyện viên (Loại bỏ mật khẩu và Mongo IDs)
   * ✅ OPTIMIZED: Dùng Aggregation thay vì N queries
   */
  async getVolunteersExportData() {
    const User = mongoose.model("User");

    const results = await User.aggregate([
      { $match: { role: "VOLUNTEER" } },
      {
        $lookup: {
          from: "registrations",
          let: { userId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$volunteer", "$$userId"] },
                    { $eq: ["$status", "completed"] },
                  ],
                },
              },
            },
            { $count: "total" },
          ],
          as: "completedStats",
        },
      },
      {
        $project: {
          id: { $toString: "$_id" },
          name: { $ifNull: ["$name", ""] },
          email: { $ifNull: ["$email", ""] },
          phone: { $ifNull: ["$phone", ""] },
          status: { $ifNull: ["$status", ""] },
          points: { $ifNull: ["$points", 0] },
          completedEventsCount: {
            $ifNull: [{ $arrayElemAt: ["$completedStats.total", 0] }, 0],
          },
        },
      },
    ]);

    return results;
  }

  /**
   * Bảng xếp hạng Tình nguyện viên kèm tỷ lệ hoàn thành
   * ✅ OPTIMIZED: Dùng Aggregation thay vì N queries
   */
  async getVolunteerRankingWithCompletion(limit = 10) {
    const User = mongoose.model("User");

    const results = await User.aggregate([
      { $match: { role: "VOLUNTEER" } },
      {
        $lookup: {
          from: "registrations",
          let: { userId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$volunteer", "$$userId"] },
                    { $eq: ["$status", "completed"] },
                  ],
                },
              },
            },
            { $count: "total" },
          ],
          as: "completedStats",
        },
      },
      {
        $project: {
          password: 0,
          __v: 0,
        },
      },
      {
        $addFields: {
          id: { $toString: "$_id" },
          completedEvents: {
            $ifNull: [{ $arrayElemAt: ["$completedStats.total", 0] }, 0],
          },
        },
      },
      { $sort: { points: -1 } },
      { $limit: limit },
      {
        $project: {
          _id: 0,
          completedStats: 0,
        },
      },
    ]);

    // Add rank sau khi sort
    return results.map((r, i) => ({ ...r, rank: i + 1 }));
  }

  /**
   * Mark registrations that were approved as completed and set performance to GOOD
   */
  async markApprovedAsCompletedWithGood(eventId) {
    try {
      const filter = { event: eventId, status: "approved" };
      const update = { $set: { status: "completed", performance: "GOOD" } };
      return await this.model.updateMany(filter, update);
    } catch (error) {
      console.error("Error markApprovedAsCompletedWithGood:", error.message);
      throw error;
    }
  }

  /**
   * Reject pending registrations because the event has been completed
   */
  async rejectPendingDueToEventCompleted(
    eventId,
    reason = "Sự kiện đã hoàn thành"
  ) {
    try {
      const filter = { event: eventId, status: "pending" };
      const update = { $set: { status: "rejected", rejectionReason: reason } };
      return await this.model.updateMany(filter, update);
    } catch (error) {
      console.error("Error rejectPendingDueToEventCompleted:", error.message);
      throw error;
    }
  }

  /**
   * Delete all registrations for a specific event.
   * Used when deleting an event.
   */
  async deleteByEvent(eventId) {
    return await this.deleteMany({ event: eventId });
  }
}
export default new RegistrationRepository();

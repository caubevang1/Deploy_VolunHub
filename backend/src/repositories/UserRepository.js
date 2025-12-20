/**
 * UserRepository
 * Manages user data access with role-based queries and ranking calculations.
 * Provides authentication support and user statistics aggregation.
 */

import mongoose from "mongoose";
import BaseRepository from "./BaseRepository.js";
import User from "../models/user.js";

class UserRepository extends BaseRepository {
  constructor() {
    super(User);
  }

  /**
   * Find user with password by email or username for authentication.
   */
  async findByIdentifierWithPassword(identifier) {
    const filter = identifier.includes("@") ? { email: identifier } : { username: identifier };
    const user = await this.model.findOne(filter).select("+password").lean();
    return this.transform(user);
  }

  /**
   * Find user by ID including password field.
   */
  async findByIdWithPassword(id) {
    const user = await this.model.findById(id).select("+password").lean();
    return this.transform(user);
  }

  /**
   * Increment user points for event participation rewards.
   */
  async incrementPoints(userId, points) {
    return await this.findByIdAndUpdate(userId, { $inc: { points } });
  }

  /**
   * Get all users excluding password field for security.
   */
  async findAllExceptPassword() {
    return await this.find({}, "-password");
  }

  /**
   * Update user account status (ACTIVE/LOCKED).
   */
  async updateStatus(id, status) {
    return await this.findByIdAndUpdate(id, { status });
  }

  /**
   * Update user role (ADMIN/VOLUNTEER/EVENTMANAGER).
   */
  async updateRole(id, role) {
    return await this.findByIdAndUpdate(id, { role: role.toUpperCase() });
  }

  /**
   * Prepare user data for Excel/CSV export.
   */
  async getUsersForExport() {
    const users = await this.find({}, "-password -__v");
    return users.map(u => ({
      ...u,
      birthday: u.birthday ? new Date(u.birthday).toISOString() : "",
    }));
  }

  /**
   * Get top volunteers ranked by points.
   */
  async getTopVolunteers(limit = 10) {
    return await this.find(
      { role: "VOLUNTEER", status: "ACTIVE" },
      "name avatar points email",
      { sort: { points: -1 }, limit }
    );
  }

  /**
   * Update password by email for password reset flow.
   */
  async updatePasswordByEmail(email, hashedPassword) {
    return await this.findOneAndUpdate(
      { email },
      { password: hashedPassword }
    );
  }

  /**
   * Get event manager ranking with aggregated statistics.
   * Calculates score based on events created and volunteers recruited.
   * Optimized with aggregation pipeline to avoid N+1 queries.
   */
  async getManagerRankingWithStats(limit = 10) {
    const results = await this.model.aggregate([
      { $match: { role: "EVENTMANAGER", status: "ACTIVE" } },

      {
        $lookup: {
          from: "events",
          localField: "_id",
          foreignField: "createdBy",
          as: "events"
        }
      },

      {
        $lookup: {
          from: "registrations",
          let: { eventIds: "$events._id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $in: ["$event", "$$eventIds"] },
                    { $eq: ["$status", "approved"] }
                  ]
                }
              }
            },
            { $count: "total" }
          ],
          as: "volunteerStats"
        }
      },

      {
        $project: {
          name: 1,
          email: 1,
          avatar: 1,
          points: 1,
          totalEvents: { $size: "$events" },
          completedEvents: {
            $size: {
              $filter: {
                input: "$events",
                as: "evt",
                cond: { $eq: ["$$evt.status", "completed"] }
              }
            }
          },
          totalVolunteers: {
            $ifNull: [
              { $arrayElemAt: ["$volunteerStats.total", 0] },
              0
            ]
          }
        }
      },

      {
        $addFields: {
          score: {
            $add: [
              { $multiply: ["$totalEvents", 10] },
              "$totalVolunteers"
            ]
          }
        }
      },

      { $sort: { score: -1 } },
      { $limit: limit }
    ]);

    return this.transform(results);
  }
}

export default new UserRepository();
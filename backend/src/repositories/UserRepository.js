// src/repositories/UserRepository.js
import mongoose from "mongoose";
import BaseRepository from "./BaseRepository.js";
import User from "../models/user.js";

class UserRepository extends BaseRepository {
  constructor() {
    super(User);
  }

  /**
   * Tìm người dùng kèm mật khẩu qua email hoặc username
   */
  async findByIdentifierWithPassword(identifier) {
    const filter = identifier.includes("@") ? { email: identifier } : { username: identifier };
    const user = await this.model.findOne(filter).select("+password").lean();
    return this.transform(user);
  }

  /**
   * Tìm người dùng bằng ID kèm mật khẩu
   */
  async findByIdWithPassword(id) {
    const user = await this.model.findById(id).select("+password").lean();
    return this.transform(user);
  }

  /**
   * Tăng điểm tích lũy cho người dùng
   */
  async incrementPoints(userId, points) {
    return await this.findByIdAndUpdate(userId, { $inc: { points } });
  }

  /**
   * Lấy toàn bộ danh sách người dùng (loại bỏ mật khẩu)
   */
  async findAllExceptPassword() {
    return await this.find({}, "-password");
  }

  /**
   * Cập nhật trạng thái (ACTIVE/LOCKED)
   */
  async updateStatus(id, status) {
    return await this.findByIdAndUpdate(id, { status });
  }

  /**
   * Cập nhật quyền hạn (ADMIN/VOLUNTEER/EVENTMANAGER)
   */
  async updateRole(id, role) {
    return await this.findByIdAndUpdate(id, { role: role.toUpperCase() });
  }

  /**
   * Chuẩn bị dữ liệu để xuất file Excel/CSV
   */
  async getUsersForExport() {
    const users = await this.find({}, "-password -__v");
    return users.map(u => ({
      ...u,
      birthday: u.birthday ? new Date(u.birthday).toISOString() : "",
    }));
  }

  /**
   * Lấy danh sách Top tình nguyện viên theo điểm số
   */
  async getTopVolunteers(limit = 10) {
    return await this.find(
      { role: "VOLUNTEER", status: "ACTIVE" },
      "name avatar points email",
      { sort: { points: -1 }, limit }
    );
  }

  /**
   * Cập nhật mật khẩu qua email (Dùng cho Reset Password)
   */
  async updatePasswordByEmail(email, hashedPassword) {
    return await this.findOneAndUpdate(
      { email },
      { password: hashedPassword }
    );
  }

  /**
   * 🏆 Lấy bảng xếp hạng Quản lý sự kiện (EventManager)
   * Tính toán dựa trên: Số sự kiện đã tạo + Số lượng tình nguyện viên tham gia
   * ✅ OPTIMIZED: Dùng Aggregation Pipeline thay vì N+1 queries
   */
  async getManagerRankingWithStats(limit = 10) {
    const results = await this.model.aggregate([
      // Chỉ lấy EventManager đang hoạt động
      { $match: { role: "EVENTMANAGER", status: "ACTIVE" } },

      // Join với Event collection
      {
        $lookup: {
          from: "events",
          localField: "_id",
          foreignField: "createdBy",
          as: "events"
        }
      },

      // Join với Registration collection để đếm volunteers
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

      // Tính toán các metrics
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

      // Tính score: (Mỗi sự kiện * 10) + (Mỗi TNV * 1)
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

      // Sắp xếp và giới hạn
      { $sort: { score: -1 } },
      { $limit: limit }
    ]);

    return this.transform(results);
  }
}

export default new UserRepository();
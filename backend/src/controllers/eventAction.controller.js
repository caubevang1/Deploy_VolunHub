// backend/src/controllers/eventAction.controller.js
import EventActionRepository from "../repositories/EventActionRepository.js";
import EventRepository from "../repositories/EventRepository.js";
import mongoose from "mongoose";

// [POST] /api/events/:eventId/action
export const handleEventAction = async (req, res) => {
  try {
    const { type } = req.body;
    const { eventId } = req.params;
    const userId = req.user._id;

    if (!["LIKE", "SHARE", "VIEW"].includes(type)) {
      return res.status(400).json({ message: "Hành động không hợp lệ" });
    }

    const event = await EventRepository.findById(eventId);
    if (!event) return res.status(404).json({ message: "Sự kiện không tồn tại" });

    if (type === "LIKE") {
      const existingLike = await EventActionRepository.findOne({
        user: userId,
        event: eventId,
        type: "LIKE",
      });

      if (existingLike) {
        await EventActionRepository.findByIdAndDelete(existingLike._id);
        const updatedEvent = await EventRepository.updateLikeCount(eventId, -1);
        return res.status(200).json({
          message: "Đã bỏ thích",
          liked: false,
          likesCount: updatedEvent?.likesCount || 0,
        });
      } else {
        await EventActionRepository.create({ user: userId, event: eventId, type: "LIKE" });
        const updatedEvent = await EventRepository.updateLikeCount(eventId, 1);
        return res.status(200).json({
          message: "Đã thích",
          liked: true,
          likesCount: updatedEvent?.likesCount || 0,
        });
      }
    }

    if (type === "SHARE") {
      const clientUrl = process.env.CLIENT_URL || "http://localhost:3000";
      const shareLink = `${clientUrl}/su-kien/${eventId}`;
      
      await EventActionRepository.create({ user: userId, event: eventId, type: "SHARE" });
      const updatedEvent = await EventRepository.incrementShareCount(eventId);
      
      return res.status(200).json({
        message: "Đã ghi nhận chia sẻ",
        shareLink,
        sharesCount: updatedEvent?.sharesCount || 0,
      });
    }

    if (type === "VIEW") {
      const updatedEvent = await EventRepository.incrementViewCount(eventId);
      return res.status(200).json({
        message: "Đã tăng lượt xem",
        viewsCount: updatedEvent?.viewsCount || 0,
      });
    }
  } catch (error) {
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

// [GET] /api/actions/:eventId/status
export const getUserActionStatus = async (req, res) => {
  try {
    const { eventId } = req.params;
    // Đảm bảo eventId hợp lệ trước khi tìm kiếm
    if (!mongoose.isValidObjectId(eventId)) return res.status(200).json({ hasLiked: false });

    const liked = await EventActionRepository.findOne({
      user: req.user._id,
      event: eventId,
      type: "LIKE",
    });
    res.status(200).json({ hasLiked: !!liked });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

// [GET] /api/actions/:eventId/stats
export const getEventStats = async (req, res) => {
  try {
    const { eventId } = req.params;
    const event = await EventRepository.findById(eventId, "likesCount sharesCount viewsCount");
    
    if (!event) return res.status(404).json({ message: "Không tồn tại" });

    res.status(200).json({
      likesCount: event.likesCount || 0,
      sharesCount: event.sharesCount || 0,
      viewsCount: event.viewsCount || 0,
    });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

// [POST] /api/actions/stats -> Thống kê hàng loạt
export const getEventsStatsBatch = async (req, res) => {
  try {
    const eventIds = Array.isArray(req.body?.eventIds) ? req.body.eventIds : [];
    if (eventIds.length === 0) return res.status(200).json({ stats: {} });

    const events = await EventRepository.find(
      { _id: { $in: eventIds } },
      "likesCount sharesCount viewsCount"
    );

    const statsMap = events.reduce((acc, ev) => {
      acc[String(ev._id)] = {
        likesCount: ev.likesCount || 0,
        sharesCount: ev.sharesCount || 0,
        viewsCount: ev.viewsCount || 0,
      };
      return acc;
    }, {});

    res.status(200).json({ stats: statsMap });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};
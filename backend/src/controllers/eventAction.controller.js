// backend/src/controllers/eventAction.controller.js
import EventActionRepository from "../repositories/EventActionRepository.js";
import EventRepository from "../repositories/EventRepository.js";

// [POST] /api/events/:eventId/action
export const handleEventAction = async (req, res) => {
  try {
    const { type } = req.body;
    const { eventId } = req.params;

    // Đã sửa: Chỉ dùng .id (Tầng Middleware/Repository đã đảm bảo trường này)
    const userId = req.user.id;

    if (!["LIKE", "SHARE", "VIEW"].includes(type)) {
      return res.status(400).json({ message: "Hành động không hợp lệ" });
    }

    const event = await EventRepository.findById(eventId);
    if (!event)
      return res.status(404).json({ message: "Sự kiện không tồn tại" });

    if (type === "LIKE") {
      const { value } = req.body; // value: true (like), false (unlike), undefined (toggle)
      const existingLike = await EventActionRepository.findUserLike(
        userId,
        eventId
      );

      // Xác định hành động thực tế cần làm
      let shouldLike = value !== undefined ? value : !existingLike;

      if (existingLike && !shouldLike) {
        // Thực hiện UNLIKE
        await EventActionRepository.findByIdAndDelete(existingLike.id);
        const updatedEvent = await EventRepository.updateLikeCount(eventId, -1);
        return res.status(200).json({
          message: "Đã bỏ thích",
          liked: false,
          likesCount: updatedEvent?.likesCount || 0,
        });
      } else if (!existingLike && shouldLike) {
        // Thực hiện LIKE
        try {
          await EventActionRepository.create({
            user: userId,
            event: eventId,
            type: "LIKE",
          });
          const updatedEvent = await EventRepository.updateLikeCount(
            eventId,
            1
          );
          return res.status(200).json({
            message: "Đã thích",
            liked: true,
            likesCount: updatedEvent?.likesCount || 0,
          });
        } catch (err) {
          // Race condition: đã được tạo bởi request khác
          const currentEvent = await EventRepository.findById(eventId);
          return res.status(200).json({
            message: "Đã thích",
            liked: true,
            likesCount: currentEvent?.likesCount || 0,
          });
        }
      } else {
        // Trạng thái đã khớp, không làm gì cả nhưng vẫn trả về data mới nhất
        const currentEvent = await EventRepository.findById(eventId);
        return res.status(200).json({
          message: shouldLike ? "Đã thích" : "Đã bỏ thích",
          liked: shouldLike,
          likesCount: currentEvent?.likesCount || 0,
        });
      }
    }

    if (type === "SHARE") {
      const clientUrl = process.env.CLIENT_URL || "http://localhost:3000";
      const shareLink = `${clientUrl}/su-kien/${eventId}`;

      // Kiểm tra xem user đã share chưa
      const existingShare = await EventActionRepository.findOne({
        user: userId,
        event: eventId,
        type: "SHARE",
      });

      let updatedEvent;
      if (!existingShare) {
        await EventActionRepository.create({
          user: userId,
          event: eventId,
          type: "SHARE",
        });
        updatedEvent = await EventRepository.incrementShareCount(eventId);
      } else {
        updatedEvent = await EventRepository.findById(eventId);
      }

      return res.status(200).json({
        message: "Đã ghi nhận chia sẻ",
        shareLink,
        sharesCount: updatedEvent?.sharesCount || 0,
        isNewShare: !existingShare,
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
    const userId = req.user.id;

    const hasLiked = await EventActionRepository.checkUserLiked(
      userId,
      eventId
    );
    res.status(200).json({ hasLiked });
  } catch (error) {
    res.status(200).json({ hasLiked: false });
  }
};

// [GET] /api/actions/:eventId/stats
export const getEventStats = async (req, res) => {
  try {
    const { eventId } = req.params;
    const event = await EventRepository.findById(eventId);

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

    const statsMap = await EventRepository.getStatsBatch(eventIds);

    res.status(200).json({ stats: statsMap });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

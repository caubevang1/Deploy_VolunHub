import Registration from "../models/registration.js";
import Event from "../models/event.js";
import User from "../models/user.js";
import { sendPushNotification } from "../utils/sendPush.js";

// --- Chức năng cho Volunteer ---

export const registerForEvent = async (req, res) => {
  try {
    const eventId = req.params.eventId;
    const volunteerId = req.user._id;

    const event = await Event.findById(eventId);
    if (!event || event.status !== "approved") {
      return res.status(404).json({ message: "Sự kiện không tồn tại hoặc chưa được duyệt." });
    }

    const currentParticipants = await Registration.countDocuments({
      event: eventId,
      status: { $in: ["approved"] },
    });

    if (currentParticipants >= event.maxParticipants) {
      return res.status(409).json({ message: "Rất tiếc, sự kiện này đã đủ số lượng người tham gia." });
    }

    const newRegistration = new Registration({
      event: eventId,
      volunteer: volunteerId,
    });
    await newRegistration.save();
    res.status(201).json({ message: "Đăng ký thành công, vui lòng chờ duyệt", registration: newRegistration });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: "Bạn đã đăng ký sự kiện này rồi." });
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

export const cancelRegistration = async (req, res) => {
  try {
    const eventId = req.params.eventId;
    const volunteerId = req.user._id;
    const registration = await Registration.findOne({ event: eventId, volunteer: volunteerId });

    if (!registration) return res.status(404).json({ message: "Bạn chưa đăng ký sự kiện này." });

    const event = await Event.findById(eventId);
    let penaltyMessage = "";

    if (event) {
      const now = new Date();
      const eventDate = new Date(event.date);
      const diffDays = Math.ceil((eventDate - now) / (1000 * 60 * 60 * 24));

      if (diffDays <= 2) {
        await User.findByIdAndUpdate(volunteerId, { $inc: { points: -10 } });
        penaltyMessage = " (Bạn bị trừ 10 điểm uy tín do hủy sát ngày diễn ra)";
      }
    }

    await Registration.findByIdAndDelete(registration._id);
    res.status(200).json({ message: "Hủy đăng ký thành công." + penaltyMessage });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

export const getMyHistory = async (req, res) => {
  try {
    const history = await Registration.find({ volunteer: req.user._id })
      .populate("event", "name date status")
      .sort({ createdAt: -1 });
    res.status(200).json(history);
  } catch (error) {
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

// --- Chức năng cho Event Manager ---

export const getEventRegistrations = async (req, res) => {
  try {
    const eventId = req.params.eventId;
    const event = await Event.findById(eventId).select("points status");
    if (!event) return res.status(404).json({ message: "Sự kiện không tồn tại" });

    const registrations = await Registration.find({ event: eventId })
      .populate("volunteer", "name email avatar phone")
      .lean();

    const results = registrations.map((reg) => {
      let evaluation = "Chưa đánh giá";
      let pointsAwarded = 0;

      if (reg.status === "completed") {
        const eventPoints = event.points || 0;
        if (reg.performance) {
          evaluation = reg.performance;
          switch (reg.performance) {
            case "GOOD": pointsAwarded = eventPoints; break;
            case "AVERAGE": pointsAwarded = Math.floor(eventPoints / 2); break;
            case "BAD": pointsAwarded = Math.floor(eventPoints / 5); break;
            case "NO_SHOW": pointsAwarded = -10; break;
            default: pointsAwarded = eventPoints;
          }
        }
      }
      return { ...reg, evaluation, pointsAwarded };
    });
    res.status(200).json(results);
  } catch (error) {
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

/**
 * CẬP NHẬT: Sửa tiêu đề thông báo duyệt/từ chối thân thiện hơn
 */
export const updateRegistrationStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const updatedReg = await Registration.findByIdAndUpdate(
      req.params.registrationId,
      { status },
      { new: true }
    ).populate("event", "name");

    res.status(200).json({ message: "Cập nhật trạng thái thành công", registration: updatedReg });

    if (updatedReg) {
      const volunteerId = updatedReg.volunteer;
      const url = `${process.env.CLIENT_URL || "http://localhost:3000"}/my-registrations`;

      if (status === "approved") {
        sendPushNotification(
          volunteerId,
          "Đăng ký thành công! ✅", 
          `Yêu cầu tham gia sự kiện "${updatedReg.event.name}" của bạn đã được chấp thuận.`,
          url
        );
      } else if (status === "rejected") {
        sendPushNotification(
          volunteerId,
          "Thông báo từ chối ❌",
          `Rất tiếc, yêu cầu đăng ký sự kiện "${updatedReg.event.name}" đã bị từ chối.`,
          url
        );
      }
    }
  } catch (error) {
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

/**
 * CẬP NHẬT: Đánh giá hoàn thành với 4 mức độ (Theo ảnh bạn gửi)
 */
export const markAsCompleted = async (req, res) => {
  try {
    const { registrationId } = req.params;
    const { performance } = req.body;
    const validPerformance = ["GOOD", "AVERAGE", "BAD", "NO_SHOW"];
    const rating = validPerformance.includes(performance) ? performance : "GOOD";

    const registration = await Registration.findById(registrationId).populate("event");
    if (!registration) return res.status(404).json({ message: "Không tìm thấy đơn đăng ký." });

    const eventPoints = registration.event.points || 0;
    let pointsToAdd = 0;
    let pushTitle = "";
    let pushBody = "";

    switch (rating) {
      case "GOOD":
        pointsToAdd = eventPoints;
        pushTitle = "Đánh giá: Tốt 🌟";
        pushBody = `Bạn đã hoàn thành tốt nhiệm vụ tại "${registration.event.name}", thái độ tích cực. (+${pointsToAdd}đ)`;
        break;
      case "AVERAGE":
        pointsToAdd = Math.floor(eventPoints / 2);
        pushTitle = "Đánh giá: Trung bình 😐";
        pushBody = `Bạn đã hoàn thành nhiệm vụ ở mức cơ bản tại "${registration.event.name}". (+${pointsToAdd}đ)`;
        break;
      case "BAD":
        pointsToAdd = Math.floor(eventPoints / 5);
        pushTitle = "Đánh giá: Kém 🔴";
        pushBody = `Thái độ chưa tốt hoặc không hoàn thành nhiệm vụ tại "${registration.event.name}". (+${pointsToAdd}đ)`;
        break;
      case "NO_SHOW":
        pointsToAdd = -10;
        pushTitle = "Đánh giá: Vắng mặt 👤-";
        pushBody = `Bạn đã đăng ký nhưng không tham gia sự kiện "${registration.event.name}". (Bị trừ ${Math.abs(pointsToAdd)}đ)`;
        break;
    }

    await User.findByIdAndUpdate(registration.volunteer, { $inc: { points: pointsToAdd } });
    registration.status = "completed";
    registration.performance = rating;
    await registration.save();

    res.status(200).json({ message: "Đánh giá thành công", points: pointsToAdd });

    const url = `${process.env.CLIENT_URL || "http://localhost:3000"}/my-registrations`;
    sendPushNotification(registration.volunteer, pushTitle, pushBody, url);

  } catch (error) {
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};
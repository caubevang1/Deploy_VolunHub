// src/utils/cronJob.js
import cron from "node-cron";
import EventRepository from "../repositories/EventRepository.js";
import { processEventCompletion } from "../controllers/event.controller.js";

export const startCronJobs = () => {
  // Chạy mỗi ngày vào lúc 00:00 (nửa đêm) - "0 0 * * *"
  // Hoặc mỗi 24 giờ - "0 */24 * * *"
  cron.schedule("50 1 * * *", async () => {
    console.log("[CRON JOB] Khởi động lúc:", new Date().toISOString());
    try {
      const now = new Date();
      console.log("[CRON JOB] Đang quét các sự kiện hết hạn...");

      // Tìm các sự kiện đã approved và đã quá endDate qua repository
      const expiredEvents = await EventRepository.find({
        status: "approved",
        endDate: { $lte: now },
      });

      console.log(
        `[CRON JOB] Tìm thấy ${expiredEvents.length} sự kiện quá hạn`
      );

      if (expiredEvents.length > 0) {
        // Log ra danh sách các event sẽ được xử lý
        expiredEvents.forEach((event) => {
          console.log(
            ` - Event ID: ${event._id}, Name: ${event.name}, EndDate: ${event.endDate}`
          );
        });

        // Duyệt qua từng sự kiện và thực hiện logic xử lý
        for (const event of expiredEvents) {
          console.log(`[CRON JOB] Đang xử lý event: ${event.name}`);
          await processEventCompletion(event);
          console.log(`[CRON JOB] Hoàn thành xử lý event: ${event.name}`);
        }
      } else {
        console.log("[CRON JOB] Không có sự kiện nào cần xử lý.");
      }
    } catch (error) {
      console.error("[CRON JOB] Lỗi:", error.message);
    }
  });

  console.log("Cron job đã được thiết lập - chạy mỗi ngày lúc 00:00.");
};

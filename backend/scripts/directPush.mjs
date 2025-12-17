import dotenv from "dotenv";
dotenv.config();
import mongoose from "mongoose";
import webpush from "web-push";
import SubscriptionRepository from "../src/repositories/SubscriptionRepository.js";

const userId = "6917248f89aa0d9001eba365"; // volunteer id (from earlier)

(async () => {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
    });
    console.log("Connected.");

    if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
      console.warn("VAPID keys missing in env; push will likely fail.");
    }

    webpush.setVapidDetails(
      "mailto:mr.tuanhoang84@gmail.com",
      process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    );

    console.log("Looking up subscriptions for user", userId);
    const subs = await SubscriptionRepository.find({ user: new mongoose.Types.ObjectId(userId) });
    console.log("Found", subs.length, "subscription(s)");
    if (subs.length === 0) {
      await mongoose.disconnect();
      process.exit(0);
    }

    const payload = JSON.stringify({
      title: "VolunteerHub Test",
      body: "This is a direct push test",
      icon: "/logo192.png",
      data: { url: "/" },
    });

    await Promise.all(
      subs.map(async (s) => {
        try {
          console.log("Sending to endpoint:", (s.endpoint || "").slice(0, 60) + "...");
          await webpush.sendNotification(s, payload);
          console.log("Sent successfully to subscription");
        } catch (err) {
          console.error("Send error for subscription", err.statusCode || "", err.message || err);
          if (err && err.statusCode === 410) {
            console.log("Subscription gone; deleting via repository");
            try {
              await SubscriptionRepository.findByIdAndDelete(s._id);
            } catch (delErr) {
              console.error("Failed to delete subscription:", delErr);
            }
          }
        }
      })
    );

    console.log("All sends attempted.");
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error("Direct push error:", err);
    try {
      await mongoose.disconnect();
    } catch (_) {}
    process.exit(2);
  }
})();

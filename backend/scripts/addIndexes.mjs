/**
 * Script tạo indexes để tối ưu performance
 * Chạy: node backend/scripts/addIndexes.mjs
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load env từ root
dotenv.config({ path: resolve(__dirname, "../../.env") });

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/volunteerhub";

async function addIndexes() {
    try {
        console.log("🔗 Đang kết nối MongoDB...");
        await mongoose.connect(MONGO_URI);
        console.log("✅ Kết nối thành công!\n");

        const db = mongoose.connection.db;

        // ===== USERS COLLECTION =====
        console.log("📌 Tạo indexes cho collection: users");
        await db.collection("users").createIndexes([
            { key: { email: 1 }, unique: true, name: "idx_users_email" },
            { key: { username: 1 }, unique: true, name: "idx_users_username" },
            { key: { role: 1, status: 1 }, name: "idx_users_role_status" },
            { key: { role: 1, points: -1 }, name: "idx_users_role_points" },
        ]);
        console.log("✅ Users indexes created\n");

        // ===== EVENTS COLLECTION =====
        console.log("📌 Tạo indexes cho collection: events");
        await db.collection("events").createIndexes([
            { key: { status: 1, date: 1 }, name: "idx_events_status_date" },
            { key: { createdBy: 1, status: 1 }, name: "idx_events_createdby_status" },
            { key: { category: 1, status: 1 }, name: "idx_events_category_status" },
            { key: { date: 1, status: 1 }, name: "idx_events_date_status" },
            { key: { createdAt: -1 }, name: "idx_events_createdat" },
        ]);
        console.log("✅ Events indexes created\n");

        // ===== REGISTRATIONS COLLECTION =====
        console.log("📌 Tạo indexes cho collection: registrations");
        await db.collection("registrations").createIndexes([
            { key: { volunteer: 1, event: 1 }, unique: true, name: "idx_reg_volunteer_event" },
            { key: { event: 1, status: 1 }, name: "idx_reg_event_status" },
            { key: { volunteer: 1, status: 1 }, name: "idx_reg_volunteer_status" },
            { key: { event: 1, createdAt: 1 }, name: "idx_reg_event_createdat" },
            { key: { cancelRequest: 1, status: 1 }, name: "idx_reg_cancel_status" },
        ]);
        console.log("✅ Registrations indexes created\n");

        // ===== POSTS COLLECTION =====
        console.log("📌 Tạo indexes cho collection: posts");
        await db.collection("posts").createIndexes([
            { key: { event: 1, createdAt: -1 }, name: "idx_posts_event_createdat" },
            { key: { author: 1, createdAt: -1 }, name: "idx_posts_author_createdat" },
            { key: { createdAt: -1 }, name: "idx_posts_createdat" },
        ]);
        console.log("✅ Posts indexes created\n");

        // ===== COMMENTS COLLECTION =====
        console.log("📌 Tạo indexes cho collection: comments");
        await db.collection("comments").createIndexes([
            { key: { post: 1, createdAt: -1 }, name: "idx_comments_post_createdat" },
            { key: { event: 1, createdAt: -1 }, name: "idx_comments_event_createdat" },
            { key: { author: 1 }, name: "idx_comments_author" },
        ]);
        console.log("✅ Comments indexes created\n");

        // ===== EVENTACTIONS COLLECTION =====
        console.log("📌 Tạo indexes cho collection: eventactions");
        await db.collection("eventactions").createIndexes([
            { key: { event: 1, user: 1, type: 1 }, unique: true, name: "idx_eventactions_unique" },
            { key: { event: 1, type: 1, createdAt: 1 }, name: "idx_eventactions_event_type_date" },
            { key: { user: 1, type: 1 }, name: "idx_eventactions_user_type" },
        ]);
        console.log("✅ EventActions indexes created\n");

        // ===== NOTIFICATIONS COLLECTION =====
        console.log("📌 Tạo indexes cho collection: notifications");
        await db.collection("notifications").createIndexes([
            { key: { userId: 1, isRead: 1, createdAt: -1 }, name: "idx_notif_user_read_date" },
            { key: { userId: 1, createdAt: -1 }, name: "idx_notif_user_date" },
        ]);
        console.log("✅ Notifications indexes created\n");

        // ===== OTPS COLLECTION =====
        console.log("📌 Tạo indexes cho collection: otps");
        await db.collection("otps").createIndexes([
            { key: { email: 1, otp: 1 }, name: "idx_otp_email_otp" },
            { key: { expiresAt: 1 }, expireAfterSeconds: 0, name: "idx_otp_ttl" }, // TTL index
        ]);
        console.log("✅ OTPs indexes created\n");

        // ===== SUBSCRIPTIONS COLLECTION =====
        console.log("📌 Tạo indexes cho collection: subscriptions");
        await db.collection("subscriptions").createIndexes([
            { key: { userId: 1 }, name: "idx_subscriptions_userid" },
            { key: { endpoint: 1 }, unique: true, name: "idx_subscriptions_endpoint" },
        ]);
        console.log("✅ Subscriptions indexes created\n");

        console.log("🎉 TẤT CẢ INDEXES ĐÃ ĐƯỢC TẠO THÀNH CÔNG!");
        console.log("\n📊 Kiểm tra indexes:");
        console.log("   db.users.getIndexes()");
        console.log("   db.events.getIndexes()");
        console.log("   db.registrations.getIndexes()");

    } catch (error) {
        console.error("❌ Lỗi:", error.message);
        process.exit(1);
    } finally {
        await mongoose.connection.close();
        console.log("\n🔌 Đã đóng kết nối MongoDB");
        process.exit(0);
    }
}

addIndexes();

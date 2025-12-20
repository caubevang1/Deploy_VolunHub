/**
 * Script test performance trước và sau optimization
 * Chạy: node backend/scripts/testPerformance.mjs
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, "../../.env") });

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/volunteerhub";

// Import repositories
import UserRepository from "../src/repositories/UserRepository.js";
import EventRepository from "../src/repositories/EventRepository.js";
import RegistrationRepository from "../src/repositories/RegistrationRepository.js";

async function testPerformance() {
    try {
        console.log("🔗 Đang kết nối MongoDB...");
        await mongoose.connect(MONGO_URI);
        console.log("✅ Kết nối thành công!\n");

        console.log("=".repeat(60));
        console.log("🧪 BẮT ĐẦU TEST PERFORMANCE");
        console.log("=".repeat(60) + "\n");

        // Test 1: Manager Ranking
        console.log("📊 Test 1: Manager Ranking with Stats");
        let start = Date.now();
        const managers = await UserRepository.getManagerRankingWithStats(10);
        let elapsed = Date.now() - start;
        console.log(`   ✅ Completed in: ${elapsed}ms`);
        console.log(`   📈 Found ${managers.length} managers\n`);

        // Test 2: Trending Events
        console.log("🔥 Test 2: Trending Events");
        start = Date.now();
        const trending = await EventRepository.getTrendingEvents(7);
        elapsed = Date.now() - start;
        console.log(`   ✅ Completed in: ${elapsed}ms`);
        console.log(`   📈 Found ${trending.length} trending events\n`);

        // Test 3: Volunteer Dashboard (cần có volunteerId thật)
        const User = mongoose.model("User");
        const volunteer = await User.findOne({ role: "VOLUNTEER" }).lean();

        if (volunteer) {
            console.log("👤 Test 3: Volunteer Dashboard Data");
            start = Date.now();
            const dashboard = await RegistrationRepository.getVolunteerDashboardData(volunteer._id);
            elapsed = Date.now() - start;
            console.log(`   ✅ Completed in: ${elapsed}ms`);
            console.log(`   📈 Completed: ${dashboard.completedEvents.length}, Current: ${dashboard.currentEvents.length}, Upcoming: ${dashboard.upcomingEvents.length}\n`);
        }

        // Test 4: Volunteers Export Data
        console.log("📋 Test 4: Volunteers Export Data");
        start = Date.now();
        const exportData = await RegistrationRepository.getVolunteersExportData();
        elapsed = Date.now() - start;
        console.log(`   ✅ Completed in: ${elapsed}ms`);
        console.log(`   📈 Found ${exportData.length} volunteers\n`);

        // Test 5: Volunteer Ranking
        console.log("🏆 Test 5: Volunteer Ranking with Completion");
        start = Date.now();
        const ranking = await RegistrationRepository.getVolunteerRankingWithCompletion(10);
        elapsed = Date.now() - start;
        console.log(`   ✅ Completed in: ${elapsed}ms`);
        console.log(`   📈 Found ${ranking.length} top volunteers\n`);

        console.log("=".repeat(60));
        console.log("✨ TẤT CẢ TESTS ĐÃ HOÀN THÀNH!");
        console.log("=".repeat(60));

        console.log("\n📝 KẾT LUẬN:");
        console.log("   - Nếu mỗi test < 200ms: 🎉 XUẤT SẮC!");
        console.log("   - Nếu mỗi test < 500ms: ✅ TỐT");
        console.log("   - Nếu mỗi test > 1000ms: ⚠️  CẦN TỐI ƯU THÊM");

    } catch (error) {
        console.error("❌ Lỗi:", error.message);
        console.error(error.stack);
        process.exit(1);
    } finally {
        await mongoose.connection.close();
        console.log("\n🔌 Đã đóng kết nối MongoDB");
        process.exit(0);
    }
}

testPerformance();

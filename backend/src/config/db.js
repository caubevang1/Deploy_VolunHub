/**
 * Database Configuration
 * Handles MongoDB connection with proper error handling and logging.
 */

import mongoose from "mongoose";

export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log("✅ MongoDB connected");
    console.log("📍 Host:", conn.connection.host);
    console.log("📁 Database name:", conn.connection.name);
  } catch (err) {
    console.error("❌ MongoDB connection error:", err.message);
    process.exit(1);
  }
};

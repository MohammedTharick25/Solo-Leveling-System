import mongoose from "mongoose";
import config from "../../config/env.js";

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(config.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`[DB] MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`[DB] Connection error: ${error.message}`);
    process.exit(1);
  }
};

mongoose.connection.on("disconnected", () => {
  console.warn("[DB] MongoDB disconnected");
});

mongoose.connection.on("error", (err) => {
  console.error(`[DB] MongoDB error: ${err.message}`);
});

export default connectDB;

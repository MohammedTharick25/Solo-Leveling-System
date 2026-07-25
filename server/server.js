import "dotenv/config";
import http from "http";
import app from "./src/app.js";
import connectDB from "./src/infrastructure/db/mongoose.js";
import { initSocket } from "./src/infrastructure/socket/socketManager.js";
import { startCronJobs } from "./src/infrastructure/scheduler/cronJobs.js";
import config from "./src/config/env.js";

const bootstrap = async () => {

  
  // 1. Connect to MongoDB
  await connectDB();

  // 2. Create HTTP server from Express app
  const httpServer = http.createServer(app);

  // 3. Attach Socket.io and get the io instance
  const io = initSocket(httpServer);

  // 4. Make io accessible inside Express request handlers via app.get('io')
  app.set("io", io);

  // 5. Start cron scheduler
  startCronJobs(io);

  // 6. Start listening
  httpServer.listen(config.PORT, () => {
    console.log(`
╔════════════════════════════════════════════╗
║     SOLO LEVELING SYSTEM — ONLINE          ║
║     Port    : ${config.PORT}                         ║
║     Env     : ${config.NODE_ENV}                  ║
║     The System awaits its hunters.         ║
╚════════════════════════════════════════════╝
    `);
  });

  // 7. Graceful shutdown
  const shutdown = async (signal) => {
    console.log(`\n[SERVER] ${signal} received. Shutting down gracefully...`);
    httpServer.close(() => {
      console.log("[SERVER] HTTP server closed.");
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));

  process.on("unhandledRejection", (err) => {
    console.error("[SERVER] Unhandled rejection:", err.message);
    if (config.NODE_ENV === "production") shutdown("unhandledRejection");
  });

  process.on("uncaughtException", (err) => {
    console.error("[SERVER] Uncaught exception:", err.message);
    shutdown("uncaughtException");
  });
};

bootstrap();

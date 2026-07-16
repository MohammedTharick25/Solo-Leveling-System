import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import config from "../../config/env.js";
import User from "../../modules/user/user.model.js";

export const initSocket = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: config.CLIENT_URL,
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // ── Auth Middleware ────────────────────────────────────────────────────────
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token)
        return next(new Error("Authentication error: No token provided."));

      const decoded = jwt.verify(token, config.JWT_SECRET);
      const user = await User.findById(decoded.userId).select(
        "_id hunterName isActive",
      );

      if (!user || !user.isActive)
        return next(new Error("Authentication error: User not found."));

      socket.userId = decoded.userId.toString();
      socket.hunterName = user.hunterName;
      next();
    } catch {
      next(new Error("Authentication error: Invalid token."));
    }
  });

  // ── Connection Handler ─────────────────────────────────────────────────────
  io.on("connection", (socket) => {
    const userId = socket.userId;
    console.log(`[SOCKET] Hunter connected: ${socket.hunterName} (${userId})`);

    // Join personal room
    socket.join(`user:${userId}`);

    // ── Guild rooms ──────────────────────────────────────────────────────────
    socket.on("guild:join", (guildId) => {
      if (guildId) {
        socket.join(`guild:${guildId}`);
        console.log(
          `[SOCKET] ${socket.hunterName} joined guild room: ${guildId}`,
        );
      }
    });

    socket.on("guild:leave", (guildId) => {
      if (guildId) socket.leave(`guild:${guildId}`);
    });

    // ── Focus session live ticks ─────────────────────────────────────────────
    socket.on("focus:tick", ({ sessionId, elapsed, remaining }) => {
      // Broadcast to all of this user's connected devices
      socket
        .to(`user:${userId}`)
        .emit("focus:tick", { sessionId, elapsed, remaining });
    });

    // ── Presence / activity ping ────────────────────────────────────────────
    socket.on("presence:ping", () => {
      socket.emit("presence:pong", { timestamp: Date.now() });
    });

    // ── Disconnect ───────────────────────────────────────────────────────────
    socket.on("disconnect", (reason) => {
      console.log(
        `[SOCKET] Hunter disconnected: ${socket.hunterName} — ${reason}`,
      );
    });
  });

  return io;
};

// ── Emit helpers used by services ────────────────────────────────────────────

export const emitToUser = (io, userId, event, data) => {
  if (!io) return;
  io.to(`user:${userId}`).emit(event, data);
};

export const emitToGuild = (io, guildId, event, data) => {
  if (!io) return;
  io.to(`guild:${guildId}`).emit(event, data);
};

/*
  Server-side events emitted to client:
  ─────────────────────────────────────────────────────────────────
  system:level-up         { newLevel, previousLevel, xpEarned }
  system:rank-up          { newRank, previousRank }
  system:quest-assigned   { quest }
  system:shadow-unlocked  { shadow }
  system:shadow-evolved   { shadow }
  system:boss-appeared    { boss }
  system:boss-defeated    { boss }
  notification:new        { notification }
  dungeon:entered         { dungeon }
  dungeon:completed       { dungeon }
  focus:tick              { sessionId, elapsed, remaining }
  guild:member-joined     { guildId, hunterName }
  guild:member-left       { guildId }
  presence:pong           { timestamp }
*/

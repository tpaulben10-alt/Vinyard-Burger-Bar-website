const jwt = require("jsonwebtoken");
const pool = require("../db");

async function broadcastOnlineUsers(io) {
  const [users] = await pool.execute(
    "SELECT id, name, email, role, last_seen FROM users WHERE is_online = TRUE ORDER BY last_seen DESC"
  );
  io.to("admins").emit("admin:online_users", users);
}

function registerSocketHandlers(io) {
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;

    if (!token) {
      return next();
    }

    try {
      socket.user = jwt.verify(token, process.env.JWT_SECRET);
    } catch (_error) {
      socket.user = null;
    }

    return next();
  });

  io.on("connection", (socket) => {
    if (socket.user?.id) {
      socket.join(`user:${socket.user.id}`);
      if (socket.user.role === "admin") {
        socket.join("admins");
      }
    }

    socket.on("user:online", async (payload = {}) => {
      try {
        const userId = socket.user?.id || payload.user_id;
        if (!userId) return;

        socket.join(`user:${userId}`);
        if (socket.user?.role === "admin" || payload.role === "admin") {
          socket.join("admins");
        }

        await pool.execute("UPDATE users SET is_online = TRUE, last_seen = CURRENT_TIMESTAMP WHERE id = ?", [userId]);
        await broadcastOnlineUsers(io);
      } catch (error) {
        console.error("user:online failed", error);
      }
    });

    socket.on("user:offline", async (payload = {}) => {
      try {
        const userId = socket.user?.id || payload.user_id;
        if (!userId) return;

        await pool.execute("UPDATE users SET is_online = FALSE, last_seen = CURRENT_TIMESTAMP WHERE id = ?", [userId]);
        await broadcastOnlineUsers(io);
      } catch (error) {
        console.error("user:offline failed", error);
      }
    });

    socket.on("admin:join", async () => {
      if (socket.user?.role !== "admin") return;
      socket.join("admins");
      await broadcastOnlineUsers(io);
    });

    socket.on("disconnect", async () => {
      try {
        if (!socket.user?.id) return;
        await pool.execute("UPDATE users SET is_online = FALSE, last_seen = CURRENT_TIMESTAMP WHERE id = ?", [
          socket.user.id
        ]);
        await broadcastOnlineUsers(io);
      } catch (error) {
        console.error("disconnect presence update failed", error);
      }
    });
  });
}

module.exports = registerSocketHandlers;

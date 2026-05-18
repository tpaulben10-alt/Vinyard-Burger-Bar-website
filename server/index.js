const path = require("path");
const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
require("dotenv").config();

const authRoutes = require("./middleware/routes/auth");
const menuRoutes = require("./middleware/routes/menu");
const orderRoutes = require("./middleware/routes/orders");
const adminRoutes = require("./middleware/routes/admin");
const userRoutes = require("./middleware/routes/users");
const registerSocketHandlers = require("./socket/socketHandler");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || "*",
    methods: ["GET", "POST", "PATCH"]
  }
});

app.set("io", io);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "..")));

app.use("/api/auth", authRoutes);
app.use("/api/menu", menuRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/users", userRoutes);

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "vinyard-burger-bar" });
});

app.use((_req, res) => {
  res.status(404).json({ message: "Route not found" });
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ message: err.message || "Server error" });
});

registerSocketHandlers(io);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Vinyard Burger Bar running on port ${PORT}`);
});

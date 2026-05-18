const express = require("express");
const pool = require("../../db");
const authMiddleware = require("../authMiddleware");

const router = express.Router();

router.get("/me", authMiddleware, async (req, res) => {
  res.json({ user: req.user });
});

router.patch("/presence", authMiddleware, async (req, res, next) => {
  try {
    const isOnline = Boolean(req.body.is_online);
    await pool.execute("UPDATE users SET is_online = ?, last_seen = CURRENT_TIMESTAMP WHERE id = ?", [
      isOnline,
      req.user.id
    ]);
    res.json({ message: "Presence updated", is_online: isOnline });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../db");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role
  };
}

function signToken(user) {
  return jwt.sign(publicUser(user), process.env.JWT_SECRET, { expiresIn: "8h" });
}

router.post("/register", async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email, and password are required" });
    }

    const [existing] = await pool.execute("SELECT id FROM users WHERE email = ?", [email]);
    if (existing.length) {
      return res.status(409).json({ message: "Email is already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const [result] = await pool.execute(
      "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, 'customer')",
      [name.trim(), email.trim().toLowerCase(), hashedPassword]
    );

    res.status(201).json({
      message: "Account created",
      user: { id: result.insertId, name: name.trim(), email: email.trim().toLowerCase(), role: "customer" }
    });
  } catch (error) {
    next(error);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const [rows] = await pool.execute("SELECT * FROM users WHERE email = ?", [email.trim().toLowerCase()]);
    const user = rows[0];

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    await pool.execute("UPDATE users SET is_online = TRUE, last_seen = CURRENT_TIMESTAMP WHERE id = ?", [user.id]);

    const safeUser = publicUser(user);
    const token = signToken(safeUser);
    res.json({ token, user: safeUser });
  } catch (error) {
    next(error);
  }
});

router.post("/logout", authMiddleware, async (req, res, next) => {
  try {
    await pool.execute("UPDATE users SET is_online = FALSE, last_seen = CURRENT_TIMESTAMP WHERE id = ?", [req.user.id]);
    res.json({ message: "Logged out" });
  } catch (error) {
    next(error);
  }
});

router.get("/me", authMiddleware, async (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;

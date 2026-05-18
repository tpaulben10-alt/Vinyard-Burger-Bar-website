const express = require("express");
const pool = require("../db");
const authMiddleware = require("../middleware/authMiddleware");
const requireAdmin = require("../middleware/roleMiddleware");

const router = express.Router();

router.get("/", async (_req, res, next) => {
  try {
    const [items] = await pool.execute(
      "SELECT id, name, description, price, category, image_url, is_available, stock FROM menu_items WHERE is_available = TRUE ORDER BY FIELD(category, 'burger', 'pasta', 'fries', 'rice', 'chicken', 'drinks'), name"
    );
    res.json({ items });
  } catch (error) {
    next(error);
  }
});

router.get("/admin/all", authMiddleware, requireAdmin, async (_req, res, next) => {
  try {
    const [items] = await pool.execute(
      "SELECT id, name, description, price, category, image_url, is_available, stock FROM menu_items ORDER BY FIELD(category, 'burger', 'pasta', 'fries', 'rice', 'chicken', 'drinks'), name"
    );
    res.json({ items });
  } catch (error) {
    next(error);
  }
});

router.post("/", authMiddleware, requireAdmin, async (req, res, next) => {
  try {
    const { name, description, price, category, image_url, stock } = req.body;
    if (!name || !description || !price || !category) {
      return res.status(400).json({ message: "Name, description, price, and category are required" });
    }

    const [result] = await pool.execute(
      "INSERT INTO menu_items (name, description, price, category, image_url, stock, is_available) VALUES (?, ?, ?, ?, ?, ?, TRUE)",
      [name.trim(), description.trim(), Number(price), category, image_url || null, Math.max(0, Number(stock) || 0)]
    );
    res.status(201).json({ message: "Menu item added", id: result.insertId });
  } catch (error) {
    next(error);
  }
});

router.put("/:id", authMiddleware, requireAdmin, async (req, res, next) => {
  try {
    const { name, description, price, category, image_url, stock, is_available } = req.body;
    await pool.execute(
      "UPDATE menu_items SET name = ?, description = ?, price = ?, category = ?, image_url = ?, stock = ?, is_available = ? WHERE id = ?",
      [
        name?.trim(),
        description?.trim(),
        Number(price),
        category,
        image_url || null,
        Math.max(0, Number(stock) || 0),
        is_available === false ? 0 : 1,
        req.params.id
      ]
    );
    res.json({ message: "Menu item updated" });
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", authMiddleware, requireAdmin, async (req, res, next) => {
  try {
    await pool.execute("UPDATE menu_items SET is_available = FALSE, stock = 0 WHERE id = ?", [req.params.id]);
    res.json({ message: "Menu item removed" });
  } catch (error) {
    next(error);
  }
});

router.patch("/:id/stock", authMiddleware, requireAdmin, async (req, res, next) => {
  try {
    const delta = Number(req.body.delta || 0);
    const stock = req.body.stock;
    if (stock !== undefined) {
      await pool.execute("UPDATE menu_items SET stock = GREATEST(0, ?) WHERE id = ?", [Number(stock), req.params.id]);
    } else {
      await pool.execute("UPDATE menu_items SET stock = GREATEST(0, stock + ?) WHERE id = ?", [delta, req.params.id]);
    }
    res.json({ message: "Stock updated" });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

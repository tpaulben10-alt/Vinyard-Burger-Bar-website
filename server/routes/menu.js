const express = require("express");
const pool = require("../db");

const router = express.Router();

router.get("/", async (_req, res, next) => {
  try {
    const [items] = await pool.execute(
      "SELECT id, name, description, price, category, image_url, is_available FROM menu_items WHERE is_available = TRUE ORDER BY FIELD(category, 'burger', 'sides', 'drinks', 'combos'), name"
    );
    res.json({ items });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

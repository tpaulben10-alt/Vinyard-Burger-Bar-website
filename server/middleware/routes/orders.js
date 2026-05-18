const express = require("express");
const pool = require("../../db");
const authMiddleware = require("../authMiddleware");

const router = express.Router();

function publicOrderCode() {
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `VBB-${Date.now().toString(36).toUpperCase()}-${random}`;
}

function normalizeOrderRows(rows) {
  const orders = new Map();

  rows.forEach((row) => {
    if (!orders.has(row.id)) {
      orders.set(row.id, {
        id: row.id,
        user_id: row.user_id || row.customer_id,
        customer_name: row.customer_name,
        total_amount: Number(row.total_amount ?? row.total),
        status: row.status === "completed" ? "delivered" : row.status,
        notes: row.notes,
        created_at: row.created_at,
        updated_at: row.updated_at,
        items: []
      });
    }

    if (row.menu_item_id) {
      orders.get(row.id).items.push({
        menu_item_id: row.menu_item_id,
        name: row.item_name,
        quantity: row.quantity,
        unit_price: Number(row.unit_price)
      });
    }
  });

  return [...orders.values()];
}

router.post("/", authMiddleware, async (req, res, next) => {
  const connection = await pool.getConnection();

  try {
    const { items, notes } = req.body;
    if (!Array.isArray(items) || !items.length) {
      return res.status(400).json({ message: "At least one order item is required" });
    }

    await connection.beginTransaction();
    const itemIds = items.map((item) => Number(item.menu_item_id));
    const [menuRows] = await connection.query(
      `SELECT id, name, price, stock FROM menu_items WHERE is_available = TRUE AND id IN (${itemIds.map(() => "?").join(",")}) FOR UPDATE`,
      itemIds
    );

    const menuById = new Map(menuRows.map((item) => [item.id, item]));
    let total = 0;
    const orderItems = items.map((item) => {
      const menuItem = menuById.get(Number(item.menu_item_id));
      const quantity = Number(item.quantity);

      if (!menuItem || !Number.isInteger(quantity) || quantity < 1) {
        throw Object.assign(new Error("Invalid menu item or quantity"), { status: 400 });
      }

      if (Number(menuItem.stock) < quantity) {
        throw Object.assign(new Error(`${menuItem.name} has only ${menuItem.stock} left in stock`), { status: 409 });
      }

      total += Number(menuItem.price) * quantity;
      return { menu_item_id: menuItem.id, name: menuItem.name, quantity, unit_price: Number(menuItem.price) };
    });

    for (const item of orderItems) {
      await connection.execute("UPDATE menu_items SET stock = stock - ? WHERE id = ?", [
        item.quantity,
        item.menu_item_id
      ]);
    }

    const [[user]] = await connection.execute("SELECT name FROM users WHERE id = ?", [req.user.id]);
    const customerName = user?.name || req.user.name || "Customer";
    const [orderResult] = await connection.execute(
      `INSERT INTO orders
       (public_order_code, customer_id, customer_name, customer_phone, customer_address, customer_notes, service_type, payment_method, status, total)
       VALUES (?, ?, ?, ?, ?, ?, 'pickup', 'cash_on_pickup', 'pending', ?)`,
      [publicOrderCode(), req.user.id, customerName, "N/A", "N/A", notes || null, total]
    );

    for (const item of orderItems) {
      await connection.execute(
        "INSERT INTO order_items (order_id, menu_item_id, item_name, unit_price, quantity, subtotal) VALUES (?, ?, ?, ?, ?, ?)",
        [orderResult.insertId, item.menu_item_id, item.name, item.unit_price, item.quantity, item.unit_price * item.quantity]
      );
    }

    await connection.commit();

    const io = req.app.get("io");
    io.to("admins").emit("order:new", { order_id: orderResult.insertId, user_id: req.user.id, total_amount: total });

    res.status(201).json({ message: "Order placed", order_id: orderResult.insertId, total_amount: total });
  } catch (error) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
});

router.get("/my", authMiddleware, async (req, res, next) => {
  try {
    const [rows] = await pool.execute(
      `SELECT o.*, u.name AS customer_name, oi.menu_item_id, oi.quantity, oi.unit_price, mi.name AS item_name
       FROM orders o
       JOIN users u ON u.id = o.customer_id
       LEFT JOIN order_items oi ON oi.order_id = o.id
       LEFT JOIN menu_items mi ON mi.id = oi.menu_item_id
       WHERE o.customer_id = ?
       ORDER BY o.created_at DESC, o.id DESC`,
      [req.user.id]
    );

    res.json({ orders: normalizeOrderRows(rows) });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

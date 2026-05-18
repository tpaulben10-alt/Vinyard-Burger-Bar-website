const express = require("express");
const pool = require("../db");
const authMiddleware = require("../middleware/authMiddleware");
const requireAdmin = require("../middleware/roleMiddleware");

const router = express.Router();
router.use(authMiddleware, requireAdmin);

function normalizeOrderRows(rows) {
  const orders = new Map();

  rows.forEach((row) => {
    if (!orders.has(row.id)) {
      orders.set(row.id, {
        id: row.id,
        user_id: row.user_id,
        customer_name: row.customer_name,
        customer_email: row.customer_email,
        total_amount: Number(row.total_amount),
        status: row.status,
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

router.get("/orders", async (req, res, next) => {
  try {
    const { status } = req.query;
    const params = [];
    let where = "";

    if (status && status !== "all") {
      where = "WHERE o.status = ?";
      params.push(status);
    }

    const [rows] = await pool.execute(
      `SELECT o.*, u.name AS customer_name, u.email AS customer_email, oi.menu_item_id, oi.quantity, oi.unit_price, mi.name AS item_name
       FROM orders o
       JOIN users u ON u.id = o.user_id
       LEFT JOIN order_items oi ON oi.order_id = o.id
       LEFT JOIN menu_items mi ON mi.id = oi.menu_item_id
       ${where}
       ORDER BY o.created_at DESC, o.id DESC`,
      params
    );

    res.json({ orders: normalizeOrderRows(rows) });
  } catch (error) {
    next(error);
  }
});

router.patch("/orders/:id/status", async (req, res, next) => {
  try {
    const { status } = req.body;
    const allowed = ["pending", "confirmed", "preparing", "ready", "delivered", "cancelled"];

    if (!allowed.includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const [existing] = await pool.execute("SELECT id, user_id FROM orders WHERE id = ?", [req.params.id]);
    const order = existing[0];
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    await pool.execute("UPDATE orders SET status = ? WHERE id = ?", [status, req.params.id]);

    const payload = { order_id: Number(req.params.id), status };
    const io = req.app.get("io");
    io.to(`user:${order.user_id}`).emit("order:status_update", payload);
    io.to("admins").emit("order:status_update", payload);

    res.json({ message: "Order status updated", ...payload });
  } catch (error) {
    next(error);
  }
});

router.get("/users", async (_req, res, next) => {
  try {
    const [users] = await pool.execute(
      "SELECT id, name, email, role, is_online, last_seen, created_at FROM users ORDER BY created_at DESC"
    );
    res.json({ users });
  } catch (error) {
    next(error);
  }
});

router.get("/users/online", async (_req, res, next) => {
  try {
    const [users] = await pool.execute(
      "SELECT id, name, email, role, last_seen FROM users WHERE is_online = TRUE ORDER BY last_seen DESC"
    );
    res.json({ users });
  } catch (error) {
    next(error);
  }
});

router.get("/stats", async (_req, res, next) => {
  try {
    const [[today]] = await pool.execute("SELECT COUNT(*) AS count FROM orders WHERE DATE(created_at) = CURDATE()");
    const [[pending]] = await pool.execute("SELECT COUNT(*) AS count FROM orders WHERE status = 'pending'");
    const [[online]] = await pool.execute("SELECT COUNT(*) AS count FROM users WHERE is_online = TRUE");
    const [[registered]] = await pool.execute("SELECT COUNT(*) AS count FROM users");

    res.json({
      stats: {
        totalOrdersToday: today.count,
        pendingOrders: pending.count,
        onlineCustomers: online.count,
        registeredUsers: registered.count
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

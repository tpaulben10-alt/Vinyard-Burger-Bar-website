const fs = require("fs");
const path = require("path");
const pool = require("./db");
const menuItems = require("./menu-data");

async function runSqlFile(fileName) {
  const filePath = path.join(__dirname, "sql", fileName);
  const sql = fs.readFileSync(filePath, "utf8");
  const statements = sql
    .split(";")
    .map((statement) => statement.trim())
    .filter(Boolean);

  for (const statement of statements) {
    await pool.query(statement);
  }
}

async function seed() {
  await runSqlFile("schema.sql");
  const [menuColumns] = await pool.execute("SHOW COLUMNS FROM menu_items LIKE 'stock'");
  if (!menuColumns.length) {
    await pool.execute("ALTER TABLE menu_items ADD COLUMN stock INT NOT NULL DEFAULT 0");
  }
  await pool.execute(
    "ALTER TABLE orders MODIFY status ENUM('pending', 'confirmed', 'preparing', 'ready', 'delivered', 'completed', 'cancelled') NOT NULL DEFAULT 'pending'"
  );

  await pool.execute("UPDATE menu_items SET is_available = FALSE");

  let inserted = 0;
  let updated = 0;

  for (const item of menuItems) {
    const [existing] = await pool.execute(
      "SELECT id FROM menu_items WHERE name = ? ORDER BY id LIMIT 1",
      [item.name]
    );

    if (existing.length) {
      await pool.execute(
        "UPDATE menu_items SET description = ?, price = ?, category = ?, image_url = ?, is_available = TRUE, stock = CASE WHEN stock <= 0 THEN 20 ELSE stock END WHERE id = ?",
        [item.description, item.price, item.category, item.image_url, existing[0].id]
      );
      updated += 1;
    } else {
      await pool.execute(
        "INSERT INTO menu_items (name, description, price, category, image_url, is_available, stock) VALUES (?, ?, ?, ?, ?, TRUE, ?)",
        [item.name, item.description, item.price, item.category, item.image_url, item.stock ?? 20]
      );
      inserted += 1;
    }
  }

  console.log(`Menu sync complete. Inserted: ${inserted}. Updated: ${updated}. Available items: ${menuItems.length}.`);

  await pool.end();
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});

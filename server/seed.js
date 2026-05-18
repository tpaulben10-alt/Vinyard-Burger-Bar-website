const fs = require("fs");
const path = require("path");
const pool = require("./db");

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

  const [[existing]] = await pool.query("SELECT COUNT(*) AS count FROM menu_items");
  if (existing.count === 0) {
    await runSqlFile("seed.sql");
    console.log("Seeded menu items.");
  } else {
    console.log("Menu items already exist; skipping seed inserts.");
  }

  await pool.end();
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});

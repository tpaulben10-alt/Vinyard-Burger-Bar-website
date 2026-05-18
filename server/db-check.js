const pool = require("./db");

async function checkDatabase() {
  const [[result]] = await pool.query("SELECT 1 AS ok");
  console.log(`Database connection OK: ${result.ok === 1 ? "yes" : "no"}`);
  await pool.end();
}

checkDatabase().catch((error) => {
  console.error("Database connection failed:");
  console.error(error.message);
  process.exit(1);
});

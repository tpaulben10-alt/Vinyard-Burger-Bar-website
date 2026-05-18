const bcrypt = require("bcryptjs");
const pool = require("./db");

async function createAdmin() {
  const name = process.env.ADMIN_NAME || "Admin";
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error("Set ADMIN_EMAIL and ADMIN_PASSWORD before running npm run admin:create");
  }

  const hashedPassword = await bcrypt.hash(password, 12);
  await pool.execute(
    `INSERT INTO users (name, email, password, role)
     VALUES (?, ?, ?, 'admin')
     ON DUPLICATE KEY UPDATE name = VALUES(name), password = VALUES(password), role = 'admin'`,
    [name, email.trim().toLowerCase(), hashedPassword]
  );

  console.log(`Admin account ready: ${email.trim().toLowerCase()}`);
  await pool.end();
}

createAdmin().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

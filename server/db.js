const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");
require("dotenv").config();

function buildSslConfig() {
  if (String(process.env.DB_SSL).toLowerCase() !== "true") {
    return undefined;
  }

  const rejectUnauthorized = String(process.env.DB_SSL_REJECT_UNAUTHORIZED || "true").toLowerCase() !== "false";
  const caSource = process.env.DB_CA_CERT || process.env.AIVEN_CA_CERT;

  if (caSource) {
    const maybePath = path.resolve(process.cwd(), caSource);
    const ca = fs.existsSync(maybePath) ? fs.readFileSync(maybePath, "utf8") : caSource.replace(/\\n/g, "\n");
    return { ca, rejectUnauthorized };
  }

  return { rejectUnauthorized };
}

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: buildSslConfig(),
  waitForConnections: true,
  connectionLimit: 10,
  namedPlaceholders: true
});

module.exports = pool;

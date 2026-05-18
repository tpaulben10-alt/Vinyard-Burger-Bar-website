const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");
require("dotenv").config();

function buildSslConfig() {
  if (String(process.env.DB_SSL).toLowerCase() !== "true") {
    return undefined;
  }

  if (process.env.DB_CA_CERT) {
    const certPath = path.resolve(process.cwd(), process.env.DB_CA_CERT);
    return { ca: fs.readFileSync(certPath, "utf8"), rejectUnauthorized: true };
  }

  return { rejectUnauthorized: true };
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

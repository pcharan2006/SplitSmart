const mysql = require('mysql2/promise');
require('dotenv').config({ quiet: true });

// A "pool" keeps several connections open and reuses them, which is much faster
// than opening a new connection for every request.
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  // Managed MySQL services (Railway, Aiven, PlanetScale, AWS RDS ...) usually require an encrypted connection.
  // DB_SSL=true turns on TLS and verifies the server's certificate against the system's trusted authorities.
  ssl: process.env.DB_SSL === 'true' ? { minVersion: 'TLSv1.2', rejectUnauthorized: true } : undefined,
  waitForConnections: true,
  connectionLimit: 10,
  // Money is stored as integer paise; BIGINT would otherwise come back as strings.
  supportBigNumbers: true,
  bigNumberStrings: false,
  dateStrings: true,
});

/**
 * Run several queries as ONE all-or-nothing unit.
 * Usage: await withTransaction(async (conn) => { await conn.query(...); ... });
 */
async function withTransaction(work) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await work(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

module.exports = { pool, withTransaction };

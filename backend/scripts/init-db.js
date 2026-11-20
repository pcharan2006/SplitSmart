/*
 * Creates (or updates) all tables in the database named by your DB_* settings.
 *   npm run db:init
 *
 * Why this exists: database/schema.sql starts with CREATE DATABASE / USE, which managed MySQL services
 * usually don't allow. This script drops those two lines and runs the rest against the database you
 * already created in the provider's dashboard. Every statement is "CREATE TABLE IF NOT EXISTS", so
 * running it again is safe and never touches existing data.
 */
require('dotenv').config({ quiet: true });
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

async function main() {
  const { DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME, DB_SSL } = process.env;
  if (!DB_HOST || !DB_USER || !DB_NAME) {
    throw new Error('Set DB_HOST, DB_USER and DB_NAME (and DB_PASSWORD) first, in backend/.env or your shell.');
  }

  const sql = fs
    .readFileSync(path.join(__dirname, '..', 'database', 'schema.sql'), 'utf8')
    .replace(/^\s*CREATE DATABASE[^;]*;/im, '')
    .replace(/^\s*USE\s+[^;]*;/im, '');

  const conn = await mysql.createConnection({
    host: DB_HOST,
    port: Number(DB_PORT) || 3306,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    multipleStatements: true,
    ssl: DB_SSL === 'true' ? { minVersion: 'TLSv1.2', rejectUnauthorized: true } : undefined,
  });

  try {
    await conn.query(sql);
    const [rows] = await conn.query('SELECT COUNT(*) AS n FROM information_schema.tables WHERE table_schema = ?', [DB_NAME]);
    console.log(`Done. Database "${DB_NAME}" on ${DB_HOST} now has ${rows[0].n} tables.`);
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error('db:init failed:', err.message);
  process.exit(1);
});

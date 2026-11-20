const { pool } = require('../config/db');

// Models contain ONLY SQL. Always parameterized (?) to prevent SQL injection.
const PUBLIC_COLUMNS = 'id, name, email, profile_image, created_at';

async function findById(id) {
  const [rows] = await pool.query(`SELECT ${PUBLIC_COLUMNS} FROM users WHERE id = ?`, [id]);
  return rows[0] || null;
}

async function findByEmail(email) {
  // Includes the password hash: only for login / password checks.
  const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
  return rows[0] || null;
}

async function findByIdWithPassword(id) {
  const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [id]);
  return rows[0] || null;
}

async function create({ name, email, passwordHash }) {
  const [result] = await pool.query(
    'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
    [name, email, passwordHash]
  );
  return findById(result.insertId);
}

async function updateProfile(id, { name, profileImage }) {
  await pool.query(
    'UPDATE users SET name = COALESCE(?, name), profile_image = COALESCE(?, profile_image) WHERE id = ?',
    [name ?? null, profileImage ?? null, id]
  );
  return findById(id);
}

async function updatePassword(id, passwordHash) {
  await pool.query(
    'UPDATE users SET password = ?, reset_token_hash = NULL, reset_token_expires = NULL WHERE id = ?',
    [passwordHash, id]
  );
}

async function setResetToken(id, tokenHash, expires) {
  await pool.query('UPDATE users SET reset_token_hash = ?, reset_token_expires = ? WHERE id = ?', [
    tokenHash,
    expires,
    id,
  ]);
}

async function findByValidResetToken(tokenHash) {
  const [rows] = await pool.query(
    'SELECT * FROM users WHERE reset_token_hash = ? AND reset_token_expires > NOW()',
    [tokenHash]
  );
  return rows[0] || null;
}

module.exports = {
  findById,
  findByEmail,
  findByIdWithPassword,
  create,
  updateProfile,
  updatePassword,
  setResetToken,
  findByValidResetToken,
};

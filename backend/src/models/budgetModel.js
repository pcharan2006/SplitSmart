const { pool } = require('../config/db');

async function create({ userId, groupId, category, amount, month, year }) {
  const [r] = await pool.query(
    'INSERT INTO budgets (user_id, group_id, category, amount, month, year) VALUES (?, ?, ?, ?, ?, ?)',
    [userId, groupId || null, category, amount, month, year]
  );
  return r.insertId;
}

async function findOwned(id, userId) {
  const [rows] = await pool.query(
    `SELECT b.*, g.name AS group_name FROM budgets b LEFT JOIN \`groups\` g ON g.id = b.group_id
      WHERE b.id = ? AND b.user_id = ?`,
    [id, userId]
  );
  return rows[0] || null;
}

async function listForMonth(userId, month, year) {
  const [rows] = await pool.query(
    `SELECT b.*, g.name AS group_name FROM budgets b
       LEFT JOIN \`groups\` g ON g.id = b.group_id
      WHERE b.user_id = ? AND b.month = ? AND b.year = ?
      ORDER BY (b.category = 'ALL') DESC, b.category`,
    [userId, month, year]
  );
  return rows;
}

// Changing the amount resets the alert memory so the new limit alerts fresh.
async function updateAmount(id, amount) {
  await pool.query('UPDATE budgets SET amount = ?, last_alert_level = 0 WHERE id = ?', [amount, id]);
}

async function setAlertLevel(id, level) {
  await pool.query('UPDATE budgets SET last_alert_level = ? WHERE id = ?', [level, id]);
}

async function remove(id) {
  await pool.query('DELETE FROM budgets WHERE id = ?', [id]);
}

module.exports = { create, findOwned, listForMonth, updateAmount, setAlertLevel, remove };

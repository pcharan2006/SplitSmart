const { pool } = require('../config/db');

async function create({ userId, title, message }, conn) {
  await (conn || pool).query('INSERT INTO notifications (user_id, title, message) VALUES (?, ?, ?)', [
    userId,
    title,
    message,
  ]);
}

async function list(userId, { unreadOnly, page, limit }) {
  const [rows] = await pool.query(
    `SELECT id, title, message, is_read, created_at FROM notifications
      WHERE user_id = ? ${unreadOnly ? 'AND is_read = 0' : ''}
      ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`,
    [userId, limit, (page - 1) * limit]
  );
  return rows.map((r) => ({ ...r, is_read: Boolean(r.is_read) }));
}

async function unreadCount(userId) {
  const [[r]] = await pool.query('SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND is_read = 0', [userId]);
  return r.n;
}

// Scoped by user_id so nobody can touch someone else's notifications. Returns true if one was updated.
async function markRead(id, userId) {
  const [r] = await pool.query('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?', [id, userId]);
  return r.affectedRows > 0;
}

async function markAllRead(userId) {
  await pool.query('UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0', [userId]);
}

module.exports = { create, list, unreadCount, markRead, markAllRead };

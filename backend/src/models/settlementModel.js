const { pool } = require('../config/db');

/**
 * One row per group member with the four totals needed for balances (all integer paise).
 * Only COMPLETED settlements count; pending ones don't change balances yet.
 * CAST(... AS UNSIGNED) is required because MySQL's SUM() returns DECIMAL, which JS receives as a string.
 */
async function getMemberTotals(groupId, conn) {
  const [rows] = await (conn || pool).query(
    `SELECT u.id AS user_id, u.name,
       CAST((SELECT COALESCE(SUM(e.amount), 0) FROM expenses e
              WHERE e.group_id = gm.group_id AND e.paid_by = u.id) AS UNSIGNED) AS total_paid,
       CAST((SELECT COALESCE(SUM(s.share_amount), 0) FROM expense_splits s
               JOIN expenses e ON e.id = s.expense_id
              WHERE e.group_id = gm.group_id AND s.user_id = u.id) AS UNSIGNED) AS total_owed,
       CAST((SELECT COALESCE(SUM(st.amount), 0) FROM settlements st
              WHERE st.group_id = gm.group_id AND st.paid_by = u.id AND st.status = 'completed') AS UNSIGNED) AS settlements_paid,
       CAST((SELECT COALESCE(SUM(st.amount), 0) FROM settlements st
              WHERE st.group_id = gm.group_id AND st.paid_to = u.id AND st.status = 'completed') AS UNSIGNED) AS settlements_received
       FROM group_members gm JOIN users u ON u.id = gm.user_id
      WHERE gm.group_id = ?
      ORDER BY u.id`,
    [groupId]
  );
  return rows;
}

// Serializes settlement changes per group: a second transaction waits here until the first commits.
async function lockGroup(conn, groupId) {
  await conn.query('SELECT id FROM `groups` WHERE id = ? FOR UPDATE', [groupId]);
}

async function insert(conn, s) {
  const [r] = await conn.query(
    `INSERT INTO settlements (group_id, paid_by, paid_to, amount, status, payment_date)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [s.group_id, s.paid_by, s.paid_to, s.amount, s.status, s.payment_date]
  );
  return r.insertId;
}

async function findById(id, conn) {
  const [rows] = await (conn || pool).query('SELECT * FROM settlements WHERE id = ?', [id]);
  return rows[0] || null;
}

async function setStatus(conn, id, status) {
  await conn.query(
    'UPDATE settlements SET status = ?, payment_date = COALESCE(payment_date, CURDATE()) WHERE id = ?',
    [status, id]
  );
}

async function remove(conn, id) {
  await conn.query('DELETE FROM settlements WHERE id = ?', [id]);
}

// Money already promised in pending requests, per person (so the same debt can't be "paid" twice).
async function pendingTotals(groupId, conn) {
  const [rows] = await conn.query(
    `SELECT paid_by, paid_to, CAST(SUM(amount) AS UNSIGNED) AS total
       FROM settlements WHERE group_id = ? AND status = 'pending' GROUP BY paid_by, paid_to`,
    [groupId]
  );
  const out = {};
  const incoming = {};
  for (const r of rows) {
    out[r.paid_by] = (out[r.paid_by] || 0) + r.total;
    incoming[r.paid_to] = (incoming[r.paid_to] || 0) + r.total;
  }
  return { out, incoming };
}

async function findPendingDuplicate(conn, { group_id, paid_by, paid_to, amount }) {
  const [rows] = await conn.query(
    `SELECT id FROM settlements
      WHERE group_id = ? AND paid_by = ? AND paid_to = ? AND amount = ? AND status = 'pending' LIMIT 1`,
    [group_id, paid_by, paid_to, amount]
  );
  return rows[0] || null;
}

async function listByGroup(groupId, status) {
  const params = [groupId];
  let filter = '';
  if (status) { filter = 'AND s.status = ?'; params.push(status); }
  const [rows] = await pool.query(
    `SELECT s.id, s.group_id, s.paid_by, payer.name AS paid_by_name, s.paid_to, payee.name AS paid_to_name,
            s.amount, s.status, s.payment_date, s.created_at
       FROM settlements s
       JOIN users payer ON payer.id = s.paid_by
       JOIN users payee ON payee.id = s.paid_to
      WHERE s.group_id = ? ${filter}
      ORDER BY s.created_at DESC, s.id DESC`,
    params
  );
  return rows;
}

// Pending payments involving this user, across all their groups (for the dashboard).
async function listPendingForUser(userId) {
  const [rows] = await pool.query(
    `SELECT s.id, s.group_id, g.name AS group_name, s.paid_by, payer.name AS paid_by_name,
            s.paid_to, payee.name AS paid_to_name, s.amount, s.created_at
       FROM settlements s
       JOIN group_members gm ON gm.group_id = s.group_id AND gm.user_id = ?
       JOIN \`groups\` g ON g.id = s.group_id
       JOIN users payer ON payer.id = s.paid_by
       JOIN users payee ON payee.id = s.paid_to
      WHERE s.status = 'pending' AND (s.paid_by = ? OR s.paid_to = ?)
      ORDER BY s.created_at DESC`,
    [userId, userId, userId]
  );
  return rows;
}

module.exports = {
  listPendingForUser, getMemberTotals, lockGroup, insert, findById, setStatus, remove, pendingTotals, findPendingDuplicate, listByGroup,
};

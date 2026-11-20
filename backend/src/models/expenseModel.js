const { pool } = require('../config/db');

async function insert(conn, e) {
  const [r] = await conn.query(
    `INSERT INTO expenses (group_id, paid_by, title, description, amount, category, split_type, expense_date, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [e.group_id, e.paid_by, e.title, e.description || null, e.amount, e.category, e.split_type, e.expense_date, e.created_by]
  );
  return r.insertId;
}

async function update(conn, id, e) {
  await conn.query(
    `UPDATE expenses SET paid_by = ?, title = ?, description = ?, amount = ?, category = ?, split_type = ?, expense_date = ?
      WHERE id = ?`,
    [e.paid_by, e.title, e.description || null, e.amount, e.category, e.split_type, e.expense_date, id]
  );
}

async function replaceSplits(conn, expenseId, splits) {
  await conn.query('DELETE FROM expense_splits WHERE expense_id = ?', [expenseId]);
  const values = splits.map((s) => [expenseId, s.user_id, s.share_amount]);
  await conn.query('INSERT INTO expense_splits (expense_id, user_id, share_amount) VALUES ?', [values]);
}

async function remove(id) {
  await pool.query('DELETE FROM expenses WHERE id = ?', [id]); // splits cascade
}

async function findRaw(id) {
  const [rows] = await pool.query('SELECT * FROM expenses WHERE id = ?', [id]);
  return rows[0] || null;
}

async function findWithSplits(id) {
  const [rows] = await pool.query(
    `SELECT e.*, p.name AS paid_by_name FROM expenses e JOIN users p ON p.id = e.paid_by WHERE e.id = ?`,
    [id]
  );
  if (!rows[0]) return null;
  const [splits] = await pool.query(
    `SELECT s.user_id, u.name, s.share_amount FROM expense_splits s JOIN users u ON u.id = s.user_id
      WHERE s.expense_id = ? ORDER BY s.id`,
    [id]
  );
  return { ...rows[0], splits };
}

/** Filtered, paginated list for a group. All filter values are passed as ? parameters. */
async function listByGroup(groupId, userId, { search, category, from, to, page = 1, limit = 20 }) {
  const where = ['e.group_id = ?'];
  const params = [groupId];
  if (search) {
    where.push('(e.title LIKE ? OR e.description LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }
  if (category) { where.push('e.category = ?'); params.push(category); }
  if (from) { where.push('e.expense_date >= ?'); params.push(from); }
  if (to) { where.push('e.expense_date <= ?'); params.push(to); }
  const clause = where.join(' AND ');

  const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM expenses e WHERE ${clause}`, params);
  const [rows] = await pool.query(
    `SELECT e.id, e.group_id, e.title, e.description, e.amount, e.category, e.split_type, e.expense_date,
            e.paid_by, p.name AS paid_by_name, e.created_by, e.created_at,
            CAST(COALESCE(my.share_amount, 0) AS UNSIGNED) AS my_share
       FROM expenses e
       JOIN users p ON p.id = e.paid_by
       LEFT JOIN expense_splits my ON my.expense_id = e.id AND my.user_id = ?
      WHERE ${clause}
      ORDER BY e.expense_date DESC, e.id DESC
      LIMIT ? OFFSET ?`,
    [userId, ...params, limit, (page - 1) * limit]
  );
  return { expenses: rows, total, page, limit };
}

module.exports = { insert, update, replaceSplits, remove, findRaw, findWithSplits, listByGroup };

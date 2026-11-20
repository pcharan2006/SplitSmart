const { pool } = require('../config/db');

// "My spending" = my SHARE of expenses (what I actually consumed), not what I fronted.
// Every SUM is CAST to an integer: MySQL's SUM() returns DECIMAL, which JS would see as a string.
const INT = (expr) => `CAST(COALESCE(${expr}, 0) AS UNSIGNED)`;

async function userTotals(userId) {
  const [[r]] = await pool.query(
    `SELECT
       ${INT(`(SELECT SUM(e.amount) FROM expenses e
                 JOIN group_members gm ON gm.group_id = e.group_id AND gm.user_id = ?)`)} AS total_expenses,
       ${INT(`(SELECT SUM(e.amount) FROM expenses e
                 JOIN group_members gm ON gm.group_id = e.group_id AND gm.user_id = ?
                WHERE e.paid_by = ?)`)} AS total_paid,
       ${INT(`(SELECT SUM(s.share_amount) FROM expense_splits s
                 JOIN expenses e ON e.id = s.expense_id
                 JOIN group_members gm ON gm.group_id = e.group_id AND gm.user_id = ?
                WHERE s.user_id = ?)`)} AS my_total_share`,
    [userId, userId, userId, userId, userId]
  );
  return r;
}

// Builds the shared "my share between two dates" filter.
function shareFilter(userId, { from, to, groupId, category }) {
  const where = ['s.user_id = ?', 'e.expense_date >= ?', 'e.expense_date <= ?'];
  const params = [userId, from, to];
  if (groupId) { where.push('e.group_id = ?'); params.push(groupId); }
  if (category) { where.push('e.category = ?'); params.push(category); }
  return { clause: where.join(' AND '), params };
}

async function spentInRange(userId, filter) {
  const { clause, params } = shareFilter(userId, filter);
  const [[r]] = await pool.query(
    `SELECT ${INT('SUM(s.share_amount)')} AS total
       FROM expense_splits s JOIN expenses e ON e.id = s.expense_id WHERE ${clause}`,
    params
  );
  return r.total;
}

async function myMonthlySpending(userId, { from, to, groupId }) {
  const { clause, params } = shareFilter(userId, { from, to, groupId });
  const [rows] = await pool.query(
    `SELECT YEAR(e.expense_date) AS year, MONTH(e.expense_date) AS month, ${INT('SUM(s.share_amount)')} AS total
       FROM expense_splits s JOIN expenses e ON e.id = s.expense_id
      WHERE ${clause} GROUP BY year, month`,
    params
  );
  return rows;
}

async function myCategorySpending(userId, { from, to, groupId }) {
  const { clause, params } = shareFilter(userId, { from, to, groupId });
  const [rows] = await pool.query(
    `SELECT e.category, ${INT('SUM(s.share_amount)')} AS total
       FROM expense_splits s JOIN expenses e ON e.id = s.expense_id
      WHERE ${clause} GROUP BY e.category ORDER BY total DESC`,
    params
  );
  return rows;
}

async function recentExpenses(userId, limit = 10) {
  const [rows] = await pool.query(
    `SELECT e.id, e.group_id, g.name AS group_name, e.title, e.amount, e.category, e.expense_date,
            e.paid_by, p.name AS paid_by_name, ${INT('my.share_amount')} AS my_share
       FROM expenses e
       JOIN group_members gm ON gm.group_id = e.group_id AND gm.user_id = ?
       JOIN \`groups\` g ON g.id = e.group_id
       JOIN users p ON p.id = e.paid_by
       LEFT JOIN expense_splits my ON my.expense_id = e.id AND my.user_id = ?
      ORDER BY e.expense_date DESC, e.id DESC LIMIT ?`,
    [userId, userId, limit]
  );
  return rows;
}

// ---- whole-group figures (everyone's spending, not just mine) ----

async function groupSummary(groupId) {
  const [[r]] = await pool.query(
    `SELECT COUNT(*) AS expense_count, ${INT('SUM(amount)')} AS total_spent FROM expenses WHERE group_id = ?`,
    [groupId]
  );
  return r;
}

async function groupCategoryTotals(groupId, { from, to } = {}) {
  const [rows] = await pool.query(
    `SELECT category, ${INT('SUM(amount)')} AS total FROM expenses
      WHERE group_id = ? AND expense_date >= ? AND expense_date <= ?
      GROUP BY category ORDER BY total DESC`,
    [groupId, from || '0001-01-01', to || '9999-12-31']
  );
  return rows;
}

async function groupMonthlyTotals(groupId, { from, to }) {
  const [rows] = await pool.query(
    `SELECT YEAR(expense_date) AS year, MONTH(expense_date) AS month, ${INT('SUM(amount)')} AS total
       FROM expenses WHERE group_id = ? AND expense_date >= ? AND expense_date <= ? GROUP BY year, month`,
    [groupId, from, to]
  );
  return rows;
}

async function groupBiggestExpense(groupId) {
  const [rows] = await pool.query(
    `SELECT e.id, e.title, e.amount, e.category, e.expense_date, u.name AS paid_by_name
       FROM expenses e JOIN users u ON u.id = e.paid_by
      WHERE e.group_id = ? ORDER BY e.amount DESC, e.id DESC LIMIT 1`,
    [groupId]
  );
  return rows[0] || null;
}

// Largest expenses across the given groups (caller must already have verified membership).
async function topExpenses(groupIds, limit = 5) {
  if (!groupIds.length) return [];
  const [rows] = await pool.query(
    `SELECT e.title, e.amount, e.category, e.expense_date, g.name AS group_name, u.name AS paid_by_name, e.paid_by
       FROM expenses e JOIN \`groups\` g ON g.id = e.group_id JOIN users u ON u.id = e.paid_by
      WHERE e.group_id IN (?) ORDER BY e.amount DESC, e.id DESC LIMIT ?`,
    [groupIds, limit]
  );
  return rows;
}

module.exports = {
  topExpenses, userTotals, spentInRange, myMonthlySpending, myCategorySpending, recentExpenses,
  groupSummary, groupCategoryTotals, groupMonthlyTotals, groupBiggestExpense,
};

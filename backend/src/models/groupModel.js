const { pool } = require('../config/db');

// `conn` is optional so the same function works inside or outside a transaction.
const run = (conn) => conn || pool;

async function create({ name, description, userId }, conn) {
  const [r] = await run(conn).query(
    'INSERT INTO `groups` (name, description, created_by) VALUES (?, ?, ?)',
    [name, description || null, userId]
  );
  return r.insertId;
}

async function addMember(groupId, userId, role = 'member', conn) {
  await run(conn).query('INSERT INTO group_members (group_id, user_id, role) VALUES (?, ?, ?)', [
    groupId,
    userId,
    role,
  ]);
}

async function findById(id) {
  const [rows] = await pool.query('SELECT * FROM `groups` WHERE id = ?', [id]);
  return rows[0] || null;
}

async function findMembership(groupId, userId) {
  const [rows] = await pool.query('SELECT * FROM group_members WHERE group_id = ? AND user_id = ?', [
    groupId,
    userId,
  ]);
  return rows[0] || null;
}

async function listForUser(userId) {
  const [rows] = await pool.query(
    `SELECT g.id, g.name, g.description, g.created_by, g.is_archived, g.created_at, gm.role,
            (SELECT COUNT(*) FROM group_members WHERE group_id = g.id) AS member_count
       FROM \`groups\` g
       JOIN group_members gm ON gm.group_id = g.id AND gm.user_id = ?
      ORDER BY g.is_archived, g.created_at DESC`,
    [userId]
  );
  return rows;
}

async function listMembers(groupId) {
  const [rows] = await pool.query(
    `SELECT u.id, u.name, u.email, u.profile_image, gm.role, gm.joined_at
       FROM group_members gm JOIN users u ON u.id = gm.user_id
      WHERE gm.group_id = ? ORDER BY gm.joined_at`,
    [groupId]
  );
  return rows;
}

async function update(id, { name, description }) {
  await pool.query(
    'UPDATE `groups` SET name = COALESCE(?, name), description = COALESCE(?, description) WHERE id = ?',
    [name ?? null, description ?? null, id]
  );
}

async function setArchived(id, archived) {
  await pool.query('UPDATE `groups` SET is_archived = ? WHERE id = ?', [archived ? 1 : 0, id]);
}

async function remove(id) {
  await pool.query('DELETE FROM `groups` WHERE id = ?', [id]); // members etc. cascade
}

async function removeMember(groupId, userId) {
  await pool.query('DELETE FROM group_members WHERE group_id = ? AND user_id = ?', [groupId, userId]);
}

// Has this user paid for, or owe a share of, any expense in the group?
async function memberHasExpenseActivity(groupId, userId) {
  const [rows] = await pool.query(
    `SELECT 1 FROM expenses e
      WHERE e.group_id = ? AND (e.paid_by = ? OR EXISTS
            (SELECT 1 FROM expense_splits s WHERE s.expense_id = e.id AND s.user_id = ?))
      LIMIT 1`,
    [groupId, userId, userId]
  );
  return rows.length > 0;
}

async function countExpenses(groupId) {
  const [[r]] = await pool.query('SELECT COUNT(*) AS n FROM expenses WHERE group_id = ?', [groupId]);
  return r.n;
}

async function createInvitation({ groupId, invitedBy, code, expiresAt }) {
  await pool.query(
    'INSERT INTO invitations (group_id, invited_by, invitation_code, expires_at) VALUES (?, ?, ?, ?)',
    [groupId, invitedBy, code, expiresAt]
  );
}

async function findActiveInvitation(code) {
  const [rows] = await pool.query(
    "SELECT * FROM invitations WHERE invitation_code = ? AND status = 'active' AND expires_at > NOW()",
    [code]
  );
  return rows[0] || null;
}

module.exports = {
  create, addMember, findById, findMembership, listForUser, listMembers, update, setArchived,
  remove, removeMember, memberHasExpenseActivity, countExpenses, createInvitation, findActiveInvitation,
};

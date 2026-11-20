const crypto = require('crypto');
const { withTransaction } = require('../config/db');
const ApiError = require('../utils/ApiError');
const groupModel = require('../models/groupModel');
const userModel = require('../models/userModel');
const notificationModel = require('../models/notificationModel');

async function createGroup(userId, { name, description }) {
  // Group + its first admin member must both succeed or both fail.
  const id = await withTransaction(async (conn) => {
    const groupId = await groupModel.create({ name, description, userId }, conn);
    await groupModel.addMember(groupId, userId, 'admin', conn);
    return groupId;
  });
  return getGroupDetails(id);
}

async function getGroupDetails(groupId) {
  const group = await groupModel.findById(groupId);
  const members = await groupModel.listMembers(groupId);
  return { ...group, members };
}

const listGroups = (userId) => groupModel.listForUser(userId);

async function updateGroup(groupId, data) {
  await groupModel.update(groupId, data);
  return getGroupDetails(groupId);
}

async function addMemberByEmail(group, actor, email) {
  const user = await userModel.findByEmail(email.toLowerCase());
  if (!user) throw new ApiError(404, 'No registered user with that email');
  if (await groupModel.findMembership(group.id, user.id)) throw new ApiError(409, 'User is already a member');
  await groupModel.addMember(group.id, user.id);
  await notificationModel.create({
    userId: user.id,
    title: 'Added to a group',
    message: `${actor.name} added you to "${group.name}".`,
  });
  return getGroupDetails(group.id);
}

async function removeMember(group, actor, actorMembership, targetId) {
  const target = await groupModel.findMembership(group.id, targetId);
  if (!target) throw new ApiError(404, 'Member not found in this group');

  const leavingSelf = actor.id === targetId;
  if (!leavingSelf && actorMembership.role !== 'admin') throw new ApiError(403, 'Only group admins can remove members');
  if (targetId === group.created_by) throw new ApiError(400, 'The group creator cannot be removed');

  // Safeguard: someone with expense history would silently corrupt everyone's balances.
  if (await groupModel.memberHasExpenseActivity(group.id, targetId)) {
    throw new ApiError(409, 'This member has expenses in the group. Settle and clear them first.');
  }
  await groupModel.removeMember(group.id, targetId);
}

async function deleteGroup(group) {
  // Safeguard: groups with financial history can only be archived, never destroyed.
  if ((await groupModel.countExpenses(group.id)) > 0) {
    throw new ApiError(409, 'This group has expenses and cannot be deleted. Archive it instead.');
  }
  await groupModel.remove(group.id);
}

async function createInvite(group, userId) {
  const code = crypto.randomBytes(9).toString('base64url'); // 12 URL-safe chars
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await groupModel.createInvitation({ groupId: group.id, invitedBy: userId, code, expiresAt });
  return { code, expiresAt };
}

async function joinByCode(userId, code) {
  const invite = await groupModel.findActiveInvitation(code);
  if (!invite) throw new ApiError(400, 'Invitation code is invalid or has expired');
  const group = await groupModel.findById(invite.group_id);
  if (group.is_archived) throw new ApiError(409, 'This group is archived');
  if (await groupModel.findMembership(group.id, userId)) throw new ApiError(409, 'You are already in this group');
  await groupModel.addMember(group.id, userId);
  return getGroupDetails(group.id);
}

module.exports = {
  createGroup, getGroupDetails, listGroups, updateGroup, addMemberByEmail,
  removeMember, deleteGroup, createInvite, joinByCode,
};

const { withTransaction } = require('../config/db');
const ApiError = require('../utils/ApiError');
const { computeSplits } = require('../utils/financialCalculations');
const expenseModel = require('../models/expenseModel');
const groupModel = require('../models/groupModel');
const notificationModel = require('../models/notificationModel');
const budgetService = require('./budgetService');

// Validates people + maths, returning the exact per-person splits.
async function buildSplits(groupId, data) {
  const members = await groupModel.listMembers(groupId);
  const memberIds = new Set(members.map((m) => m.id));
  if (!memberIds.has(data.paid_by)) throw new ApiError(400, 'The payer must be a member of the group');
  for (const p of data.participants) {
    if (!memberIds.has(p.user_id)) throw new ApiError(400, 'All participants must be members of the group');
  }
  return computeSplits({ splitType: data.split_type, amount: data.amount, participants: data.participants });
}

async function notifyParticipants(group, actor, title, verb, splits) {
  const others = splits.map((s) => s.user_id).filter((id) => id !== actor.id);
  await Promise.all(
    others.map((userId) =>
      notificationModel.create({
        userId,
        title: `Expense ${verb}`,
        message: `${actor.name} ${verb} "${title}" in ${group.name}.`,
      })
    )
  );
}

async function createExpense(group, actor, data) {
  const splits = await buildSplits(group.id, data);
  // Expense row + all split rows are saved together, or not at all.
  const id = await withTransaction(async (conn) => {
    const expenseId = await expenseModel.insert(conn, { ...data, group_id: group.id, created_by: actor.id });
    await expenseModel.replaceSplits(conn, expenseId, splits);
    return expenseId;
  });
  await notifyParticipants(group, actor, data.title, 'added', splits);
  await budgetService.evaluateForExpense(splits.map((s) => s.user_id), [data.expense_date]);
  return expenseModel.findWithSplits(id);
}

// Only the person who created the expense, or a group admin, may change or delete it.
function assertCanModify(expense, actor, membership) {
  if (expense.created_by !== actor.id && membership.role !== 'admin') {
    throw new ApiError(403, 'Only the expense creator or a group admin can do this');
  }
}

async function updateExpense(group, expense, actor, membership, data) {
  assertCanModify(expense, actor, membership);
  const splits = await buildSplits(group.id, data);
  const before = await expenseModel.findWithSplits(expense.id); // old participants/date also need their budgets re-checked
  await withTransaction(async (conn) => {
    await expenseModel.update(conn, expense.id, data);
    await expenseModel.replaceSplits(conn, expense.id, splits);
  });
  await notifyParticipants(group, actor, data.title, 'updated', splits);
  await budgetService.evaluateForExpense(
    [...splits.map((s) => s.user_id), ...before.splits.map((s) => s.user_id)],
    [data.expense_date, before.expense_date]
  );
  return expenseModel.findWithSplits(expense.id);
}

async function deleteExpense(expense, actor, membership) {
  assertCanModify(expense, actor, membership);
  const before = await expenseModel.findWithSplits(expense.id);
  await expenseModel.remove(expense.id);
  await budgetService.evaluateForExpense(before.splits.map((s) => s.user_id), [before.expense_date]);
}

module.exports = { createExpense, updateExpense, deleteExpense };

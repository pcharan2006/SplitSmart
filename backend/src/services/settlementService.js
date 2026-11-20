const { withTransaction } = require('../config/db');
const ApiError = require('../utils/ApiError');
const { getGroupBalances } = require('./balanceService');
const { simplifyDebts } = require('../utils/debtSimplification');
const settlementModel = require('../models/settlementModel');
const notificationModel = require('../models/notificationModel');

const { formatPaise: rupees } = require('../utils/financialCalculations');
const today = () => new Date().toISOString().slice(0, 10);

/**
 * Suggested payments that would clear every balance. Read-only: nothing here changes data.
 * Balances only change when a settlement is actually recorded.
 */
async function getSuggestions(groupId) {
  const members = await getGroupBalances(groupId);
  const names = Object.fromEntries(members.map((m) => [m.user_id, m.name]));
  const payments = simplifyDebts(members.map((m) => ({ user_id: m.user_id, balance: m.net_balance })));

  return payments.map((p) => ({
    from: p.from,
    from_name: names[p.from],
    to: p.to,
    to_name: names[p.to],
    amount: p.amount,
  }));
}

/**
 * Record a payment between two members.
 *  - If the PAYER records it, it is a request: status 'pending' until the receiver confirms.
 *  - If the RECEIVER records it, they are confirming they got the money: status 'completed' at once.
 *  - Anyone else is refused.
 * The amount can't exceed what the payer still owes or what the receiver is still owed
 * (counting other pending requests), so a debt can never be settled twice.
 */
async function recordSettlement(group, actor, data) {
  const { paid_by, paid_to, amount } = data;
  if (paid_by === paid_to) throw new ApiError(400, 'You cannot pay yourself');
  if (actor.id !== paid_by && actor.id !== paid_to) {
    throw new ApiError(403, 'You can only record payments that you made or received');
  }
  const completedNow = actor.id === paid_to;

  return withTransaction(async (conn) => {
    await settlementModel.lockGroup(conn, group.id);

    const balances = await getGroupBalances(group.id, conn);
    const payer = balances.find((b) => b.user_id === paid_by);
    const payee = balances.find((b) => b.user_id === paid_to);
    if (!payer || !payee) throw new ApiError(400, 'Both people must be members of the group');

    const pending = await settlementModel.pendingTotals(group.id, conn);
    const payerOwes = payer.amount_to_pay - (pending.out[paid_by] || 0);
    const payeeIsOwed = payee.amount_to_receive - (pending.incoming[paid_to] || 0);
    const max = Math.max(0, Math.min(payerOwes, payeeIsOwed));
    if (amount > max) {
      throw new ApiError(400, max === 0
        ? `${payer.name} does not owe ${payee.name} anything right now`
        : `Amount is too high. The most that can be settled between them is ${rupees(max)}`);
    }

    if (await settlementModel.findPendingDuplicate(conn, { group_id: group.id, paid_by, paid_to, amount })) {
      throw new ApiError(409, 'An identical pending payment already exists');
    }

    const id = await settlementModel.insert(conn, {
      group_id: group.id, paid_by, paid_to, amount,
      status: completedNow ? 'completed' : 'pending',
      payment_date: data.payment_date || today(),
    });

    if (completedNow) {
      await notificationModel.create({
        userId: paid_by, title: 'Payment recorded',
        message: `${actor.name} confirmed receiving ${rupees(amount)} from you in ${group.name}.`,
      }, conn);
    } else {
      await notificationModel.create({
        userId: paid_to, title: 'Settlement request',
        message: `${actor.name} says they paid you ${rupees(amount)} in ${group.name}. Please confirm.`,
      }, conn);
    }
    return settlementModel.findById(id, conn);
  });
}

// Receiver confirms (or rejects) a pending payment.
async function resolveSettlement(group, actor, settlementId, decision) {
  return withTransaction(async (conn) => {
    await settlementModel.lockGroup(conn, group.id);

    // Re-read inside the lock so two quick clicks can't both succeed.
    const s = await settlementModel.findById(settlementId, conn);
    if (!s || s.group_id !== group.id) throw new ApiError(404, 'Settlement not found');
    if (s.paid_to !== actor.id) throw new ApiError(403, 'Only the person who received the payment can confirm or reject it');
    if (s.status !== 'pending') throw new ApiError(409, `This payment is already ${s.status}`);

    if (decision === 'confirm') {
      // Balances may have changed since the request was made (e.g. an expense was deleted).
      const balances = await getGroupBalances(group.id, conn);
      const payer = balances.find((b) => b.user_id === s.paid_by);
      const payee = balances.find((b) => b.user_id === s.paid_to);
      if (!payer || !payee || s.amount > payer.amount_to_pay || s.amount > payee.amount_to_receive) {
        throw new ApiError(409, 'Balances have changed and this payment no longer fits. Reject it and record a new one.');
      }
    }

    const status = decision === 'confirm' ? 'completed' : 'rejected';
    await settlementModel.setStatus(conn, s.id, status);
    await notificationModel.create({
      userId: s.paid_by,
      title: decision === 'confirm' ? 'Payment confirmed' : 'Payment rejected',
      message: `${actor.name} ${decision === 'confirm' ? 'confirmed' : 'rejected'} your ${rupees(s.amount)} payment in ${group.name}.`,
    }, conn);
    return settlementModel.findById(s.id, conn);
  });
}

// The payer can withdraw a request that hasn't been confirmed yet.
async function cancelSettlement(group, actor, settlementId) {
  await withTransaction(async (conn) => {
    await settlementModel.lockGroup(conn, group.id);
    const s = await settlementModel.findById(settlementId, conn);
    if (!s || s.group_id !== group.id) throw new ApiError(404, 'Settlement not found');
    if (s.paid_by !== actor.id) throw new ApiError(403, 'Only the person who made the payment can cancel it');
    if (s.status !== 'pending') throw new ApiError(409, 'Only pending payments can be cancelled');
    await settlementModel.remove(conn, s.id);
  });
}

const listSettlements = (groupId, status) => settlementModel.listByGroup(groupId, status);

module.exports = { getSuggestions, recordSettlement, resolveSettlement, cancelSettlement, listSettlements };

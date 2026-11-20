const settlementModel = require('../models/settlementModel');

/**
 * Net balance = total paid - total share owed, adjusted by recorded (completed) settlements:
 *   net = paid - owed + settlements_paid - settlements_received
 * Positive -> the member should RECEIVE money. Negative -> the member OWES money.
 * Someone who paid back ₹500 has settled ₹500 of their debt, so their balance rises by 500;
 * the person who received it is owed ₹500 less.
 */
async function getGroupBalances(groupId, conn) {
  // `conn` lets settlement code read balances inside its own locked transaction.
  const totals = await settlementModel.getMemberTotals(groupId, conn);

  const members = totals.map((t) => {
    const net = t.total_paid - t.total_owed + t.settlements_paid - t.settlements_received;
    return {
      ...t,
      net_balance: net,
      amount_to_receive: Math.max(net, 0),
      amount_to_pay: Math.max(-net, 0),
      status: net > 0 ? 'receives' : net < 0 ? 'owes' : 'settled',
    };
  });

  // Safety net: money only moves between members, so everything must cancel out.
  const sum = members.reduce((a, m) => a + m.net_balance, 0);
  if (sum !== 0) throw new Error(`Balance invariant violated for group ${groupId}: sum is ${sum}`);

  return members;
}

module.exports = { getGroupBalances };

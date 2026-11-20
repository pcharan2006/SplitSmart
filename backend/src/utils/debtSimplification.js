/**
 * Greedy debt simplification.
 *
 * Input:  [{ user_id, balance }]  balance in paise. Positive = should RECEIVE, negative = OWES.
 *         All balances must add up to 0 (money is only moved between members).
 * Output: [{ from, to, amount }]  "from" pays "to" `amount` paise.
 *
 * Steps (as in the spec):
 *  1. Split people into creditors (balance > 0) and debtors (balance < 0).
 *  2. Match the largest debtor with the largest creditor.
 *  3. Transfer the smaller of the two amounts.
 *  4. Update both balances; whoever reaches 0 is finished.
 *  5. Repeat until everyone is at 0.
 * Every step settles at least one person fully, so there are at most (people - 1) payments.
 *
 * This function is PURE: it never touches the database, so suggestions can't change real balances.
 */
function simplifyDebts(balances) {
  const total = balances.reduce((sum, b) => sum + b.balance, 0);
  if (total !== 0) throw new Error(`Balances must sum to zero, got ${total}`);

  const creditors = balances.filter((b) => b.balance > 0).map((b) => ({ id: b.user_id, left: b.balance }));
  const debtors = balances.filter((b) => b.balance < 0).map((b) => ({ id: b.user_id, left: -b.balance }));

  // Largest first; ties broken by user id so results are always the same for the same data.
  const bySize = (a, b) => b.left - a.left || a.id - b.id;
  const payments = [];

  while (creditors.length && debtors.length) {
    creditors.sort(bySize);
    debtors.sort(bySize);
    const creditor = creditors[0];
    const debtor = debtors[0];
    const amount = Math.min(creditor.left, debtor.left);

    payments.push({ from: debtor.id, to: creditor.id, amount });
    creditor.left -= amount;
    debtor.left -= amount;
    if (creditor.left === 0) creditors.shift();
    if (debtor.left === 0) debtors.shift();
  }
  return payments;
}

module.exports = { simplifyDebts };

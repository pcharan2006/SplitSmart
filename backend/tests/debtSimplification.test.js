const { simplifyDebts } = require('../src/utils/debtSimplification');

// Apply payments to balances and return the resulting balances (should all be 0).
function applyPayments(balances, payments) {
  const b = Object.fromEntries(balances.map((x) => [x.user_id, x.balance]));
  for (const p of payments) {
    b[p.from] += p.amount; // debtor paid, their (negative) balance rises
    b[p.to] -= p.amount;   // creditor received, their (positive) balance falls
  }
  return b;
}

describe('simplifyDebts', () => {
  test('simple case: A is owed 300, B owes 100, C owes 200', () => {
    const r = simplifyDebts([{ user_id: 1, balance: 300 }, { user_id: 2, balance: -100 }, { user_id: 3, balance: -200 }]);
    expect(r).toEqual([{ from: 3, to: 1, amount: 200 }, { from: 2, to: 1, amount: 100 }]);
  });

  test('chain collapses: A owes B 10, B owes C 10 -> A pays C directly', () => {
    // balances: A -10, B 0, C +10
    const r = simplifyDebts([{ user_id: 1, balance: -1000 }, { user_id: 2, balance: 0 }, { user_id: 3, balance: 1000 }]);
    expect(r).toEqual([{ from: 1, to: 3, amount: 1000 }]);
  });

  test('already settled and empty groups produce no payments', () => {
    expect(simplifyDebts([{ user_id: 1, balance: 0 }, { user_id: 2, balance: 0 }])).toEqual([]);
    expect(simplifyDebts([])).toEqual([]);
  });

  test('largest debtor is matched with largest creditor first', () => {
    const r = simplifyDebts([
      { user_id: 1, balance: 500 }, { user_id: 2, balance: 100 },
      { user_id: 3, balance: -400 }, { user_id: 4, balance: -200 },
    ]);
    expect(r[0]).toEqual({ from: 3, to: 1, amount: 400 });
  });

  test('is deterministic', () => {
    const input = [{ user_id: 5, balance: 100 }, { user_id: 2, balance: 100 }, { user_id: 9, balance: -200 }];
    expect(simplifyDebts(input)).toEqual(simplifyDebts([...input].reverse()));
  });

  test('rejects balances that do not sum to zero', () => {
    expect(() => simplifyDebts([{ user_id: 1, balance: 100 }, { user_id: 2, balance: -50 }])).toThrow(/sum to zero/);
  });

  test('does not mutate its input', () => {
    const input = [{ user_id: 1, balance: 100 }, { user_id: 2, balance: -100 }];
    const copy = JSON.parse(JSON.stringify(input));
    simplifyDebts(input);
    expect(input).toEqual(copy);
  });

  test('property: for 500 random groups every balance ends at exactly 0 using at most n-1 payments', () => {
    let seed = 12345;
    const rand = (n) => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed % n; };
    for (let t = 0; t < 500; t++) {
      const n = 2 + rand(9);
      const balances = Array.from({ length: n }, (_, i) => ({ user_id: i + 1, balance: rand(200001) - 100000 }));
      const sum = balances.reduce((a, b) => a + b.balance, 0);
      balances[n - 1].balance -= sum; // force the total to zero
      const payments = simplifyDebts(balances);
      expect(Object.values(applyPayments(balances, payments)).every((v) => v === 0)).toBe(true);
      expect(payments.length).toBeLessThanOrEqual(n - 1);
      expect(payments.every((p) => Number.isInteger(p.amount) && p.amount > 0 && p.from !== p.to)).toBe(true);
    }
  });
});

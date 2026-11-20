process.env.NODE_ENV = 'test';
const request = require('supertest');
const app = require('../src/app');
const { pool } = require('../src/config/db');
const { makeUser, auth } = require('./helpers');
const { currentYearMonth, previousMonth } = require('../src/utils/dateUtils');
const dates = require('../src/utils/dateUtils');

let alice, bob, outsider, groupId;
const cur = currentYearMonth();
const prev = previousMonth(cur);
const day = ({ year, month }) => `${year}-${String(month).padStart(2, '0')}-05`;

const add = (user, over) =>
  request(app).post('/api/expenses').set(auth(user)).send({
    group_id: groupId, split_type: 'equal', participants: [alice, bob].map((u) => ({ user_id: u.id })), ...over,
  });

beforeAll(async () => {
  [alice, bob, outsider] = await Promise.all(['a', 'b', 'o'].map((l) => makeUser(app, l)));
  groupId = (await request(app).post('/api/groups').set(auth(alice)).send({ name: 'Analytics' })).body.group.id;
  await request(app).post(`/api/groups/${groupId}/members`).set(auth(alice)).send({ email: bob.email });
  // This month: Alice pays ₹300 food (each share ₹150). Last month: Bob pays ₹100 rent (each share ₹50).
  await add(alice, { title: 'Dinner', amount: 30000, category: 'Food', expense_date: day(cur), paid_by: alice.id });
  await add(bob, { title: 'Rent', amount: 10000, category: 'Rent', expense_date: day(prev), paid_by: bob.id });
});

afterAll(async () => {
  const ids = [alice.id, bob.id, outsider.id];
  await pool.query('DELETE FROM `groups` WHERE created_by IN (?)', [ids]);
  await pool.query('DELETE FROM users WHERE id IN (?)', [ids]);
  await pool.end();
});

describe('date utils', () => {
  test('lastNMonths crosses year boundaries and monthRange handles leap years', () => {
    expect(dates.lastNMonths(3, new Date(2026, 0, 15))).toEqual([{ year: 2025, month: 11 }, { year: 2025, month: 12 }, { year: 2026, month: 1 }]);
    expect(dates.monthRange(2028, 2).to).toBe('2028-02-29');
    expect(dates.percentChange(300, 100)).toBe(200);
    expect(dates.percentChange(5, 0)).toBeNull();
  });
});

describe('Dashboard', () => {
  test('requires login', async () => {
    expect((await request(app).get('/api/analytics/dashboard')).status).toBe(401);
  });

  test("Alice's dashboard totals are correct integers", async () => {
    const res = await request(app).get('/api/analytics/dashboard').set(auth(alice));
    expect(res.status).toBe(200);
    expect(res.body.summary).toEqual({
      total_expenses: 40000, total_paid: 30000, my_total_share: 20000,
      you_owe: 0, owed_to_you: 10000, net_balance: 10000, active_groups: 1,
    });
    expect(res.body.this_month).toMatchObject({ my_spending: 15000, last_month: 5000, change_amount: 10000, change_percent: 200 });
    expect(res.body.category_breakdown).toEqual([{ category: 'Food', total: 15000 }]);
    expect(res.body.monthly_spending).toHaveLength(6);
    expect(res.body.monthly_spending.at(-1)).toEqual({ ...cur, total: 15000 });
    expect(res.body.monthly_spending.at(-2)).toEqual({ ...prev, total: 5000 });
    expect(res.body.recent_transactions).toHaveLength(2);
    expect(res.body.recent_transactions[0]).toMatchObject({ title: 'Dinner', group_name: 'Analytics', my_share: 15000 });
  });

  test("Bob's view mirrors Alice's, and a user with no groups gets zeros", async () => {
    const b = await request(app).get('/api/analytics/dashboard').set(auth(bob));
    expect(b.body.summary).toMatchObject({ you_owe: 10000, owed_to_you: 0, net_balance: -10000 });
    const o = await request(app).get('/api/analytics/dashboard').set(auth(outsider));
    expect(o.body.summary).toEqual({ total_expenses: 0, total_paid: 0, my_total_share: 0, you_owe: 0, owed_to_you: 0, net_balance: 0, active_groups: 0 });
    expect(o.body.recent_transactions).toEqual([]);
  });

  test('pending settlements appear for both sides', async () => {
    await request(app).post('/api/settlements').set(auth(bob)).send({ group_id: groupId, paid_by: bob.id, paid_to: alice.id, amount: 4000 });
    const a = await request(app).get('/api/analytics/dashboard').set(auth(alice));
    const b = await request(app).get('/api/analytics/dashboard').set(auth(bob));
    expect(a.body.pending_settlements.awaiting_my_confirmation).toHaveLength(1);
    expect(a.body.pending_settlements.awaiting_others).toHaveLength(0);
    expect(b.body.pending_settlements.awaiting_others).toHaveLength(1);
    expect(a.body.pending_settlements.awaiting_my_confirmation[0].amount).toBe(4000);
  });
});

describe('Group analytics', () => {
  test('totals, categories, biggest expense and member figures', async () => {
    const res = await request(app).get(`/api/analytics/groups/${groupId}`).set(auth(bob));
    expect(res.status).toBe(200);
    expect(res.body.totals).toEqual({ total_spent: 40000, expense_count: 2, average_expense: 20000 });
    expect(res.body.category_breakdown).toEqual([{ category: 'Food', total: 30000 }, { category: 'Rent', total: 10000 }]);
    expect(res.body.biggest_expense).toMatchObject({ title: 'Dinner', amount: 30000 });
    expect(res.body.comparison).toMatchObject({ this_month: 30000, last_month: 10000 });
    expect(res.body.monthly_totals).toHaveLength(6);
    expect(res.body.members.reduce((s, m) => s + m.net_balance, 0)).toBe(0);
  });

  test('outsiders get 404', async () => {
    expect((await request(app).get(`/api/analytics/groups/${groupId}`).set(auth(outsider))).status).toBe(404);
  });
});

describe('Monthly', () => {
  test('returns the requested number of months with comparison and categories', async () => {
    const res = await request(app).get('/api/analytics/monthly?months=3').set(auth(alice));
    expect(res.status).toBe(200);
    expect(res.body.months).toHaveLength(3);
    expect(res.body.comparison).toMatchObject({ this_month: 15000, last_month: 5000 });
    expect(res.body.category_this_month).toEqual([{ category: 'Food', total: 15000 }]);
    expect(res.body.category_last_month).toEqual([{ category: 'Rent', total: 5000 }]);
  });

  test('group filter works, foreign groups are refused, bad input rejected', async () => {
    const mine = await request(app).get(`/api/analytics/monthly?group_id=${groupId}`).set(auth(alice));
    expect(mine.body.comparison.this_month).toBe(15000);
    expect((await request(app).get(`/api/analytics/monthly?group_id=${groupId}`).set(auth(outsider))).status).toBe(404);
    expect((await request(app).get('/api/analytics/monthly?months=0').set(auth(alice))).status).toBe(400);
    expect((await request(app).get('/api/analytics/monthly?months=99').set(auth(alice))).status).toBe(400);
  });
});

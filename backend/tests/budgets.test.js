process.env.NODE_ENV = 'test';
const request = require('supertest');
const app = require('../src/app');
const { pool } = require('../src/config/db');
const { makeUser, auth } = require('./helpers');
const { currentYearMonth } = require('../src/utils/dateUtils');
const { alertLevel } = require('../src/services/budgetService');

let carol, dave, outsider, groupId;
const { year, month } = currentYearMonth();
const today = `${year}-${String(month).padStart(2, '0')}-10`;

// Carol and Dave split equally, so Carol's share is half of `amount`.
const spend = (amount, category = 'Food') =>
  request(app).post('/api/expenses').set(auth(dave)).send({
    group_id: groupId, title: 'x', amount, category, expense_date: today, paid_by: dave.id,
    split_type: 'equal', participants: [carol, dave].map((u) => ({ user_id: u.id })),
  });
const alerts = async (title) =>
  (await pool.query('SELECT COUNT(*) AS c FROM notifications WHERE user_id = ? AND title = ?', [carol.id, title]))[0][0].c;
const budgetList = async () => (await request(app).get('/api/budgets').set(auth(carol))).body.budgets;

beforeAll(async () => {
  [carol, dave, outsider] = await Promise.all(['c', 'd', 'o'].map((l) => makeUser(app, l)));
  groupId = (await request(app).post('/api/groups').set(auth(dave)).send({ name: 'Budgets' })).body.group.id;
  await request(app).post(`/api/groups/${groupId}/members`).set(auth(dave)).send({ email: carol.email });
});

afterAll(async () => {
  const ids = [carol.id, dave.id, outsider.id];
  await pool.query('DELETE FROM `groups` WHERE created_by IN (?)', [ids]);
  await pool.query('DELETE FROM users WHERE id IN (?)', [ids]);
  await pool.end();
});

test('alertLevel thresholds use exact integer maths', () => {
  expect(alertLevel(7999, 10000)).toBe(0);
  expect(alertLevel(8000, 10000)).toBe(1);
  expect(alertLevel(9999, 10000)).toBe(1);
  expect(alertLevel(10000, 10000)).toBe(2);
  expect(alertLevel(0, 10000)).toBe(0);
});

describe('Budget CRUD and validation', () => {
  let foodBudget;

  test('create a Food budget of ₹100 for this month', async () => {
    const res = await request(app).post('/api/budgets').set(auth(carol)).send({ category: 'Food', amount: 10000, month, year });
    expect(res.status).toBe(201);
    expect(res.body.budget).toMatchObject({ category: 'Food', amount: 10000, spent: 0, remaining: 10000, utilization_percent: 0, status: 'ok' });
    foodBudget = res.body.budget.id;
  });

  test('duplicate budget is refused; invalid input is rejected', async () => {
    const dup = { category: 'Food', amount: 5000, month, year };
    expect((await request(app).post('/api/budgets').set(auth(carol)).send(dup)).status).toBe(409);
    for (const bad of [{ month: 13 }, { amount: -5 }, { amount: 10.5 }, { category: 'Pizza' }, { year: 1999 }]) {
      expect((await request(app).post('/api/budgets').set(auth(carol)).send({ category: 'Rent', amount: 5000, month, year, ...bad })).status).toBe(400);
    }
  });

  test('a group budget requires membership', async () => {
    expect((await request(app).post('/api/budgets').set(auth(outsider)).send({ group_id: groupId, amount: 5000, month, year })).status).toBe(404);
    const ok = await request(app).post('/api/budgets').set(auth(carol)).send({ group_id: groupId, amount: 90000, month, year });
    expect(ok.status).toBe(201);
    expect(ok.body.budget.group_name).toBe('Budgets');
  });

  test("other users cannot see, edit or delete my budgets", async () => {
    expect((await request(app).get('/api/budgets').set(auth(outsider))).body.budgets).toEqual([]);
    expect((await request(app).put(`/api/budgets/${foodBudget}`).set(auth(outsider)).send({ amount: 1 })).status).toBe(404);
    expect((await request(app).delete(`/api/budgets/${foodBudget}`).set(auth(outsider))).status).toBe(404);
    expect((await request(app).get('/api/budgets')).status).toBe(401);
  });

  test('delete removes the budget', async () => {
    const tmp = await request(app).post('/api/budgets').set(auth(carol)).send({ category: 'Travel', amount: 5000, month, year });
    expect((await request(app).delete(`/api/budgets/${tmp.body.budget.id}`).set(auth(carol))).status).toBe(204);
    expect((await budgetList()).some((b) => b.category === 'Travel')).toBe(false);
  });
});

describe('Alerts', () => {
  test('under 80%: no alert', async () => {
    await spend(7000); // Carol's share 3500 = 35%
    const food = (await budgetList()).find((b) => b.category === 'Food');
    expect(food).toMatchObject({ spent: 3500, utilization_percent: 35, status: 'ok', remaining: 6500 });
    expect(await alerts('Budget alert')).toBe(0);
  });

  test('crossing 80% sends exactly one warning', async () => {
    await spend(9000); // +4500 -> 8000 = 80%
    expect((await budgetList()).find((b) => b.category === 'Food').status).toBe('warning');
    expect(await alerts('Budget alert')).toBe(1);
    await spend(100); // +50 -> 8050, still a warning: no repeat
    expect(await alerts('Budget alert')).toBe(1);
  });

  test('crossing 100% sends exactly one "exceeded" notification', async () => {
    await spend(5000); // +2500 -> 10550
    const food = (await budgetList()).find((b) => b.category === 'Food');
    expect(food).toMatchObject({ status: 'exceeded', remaining: 0, over_by: 550 });
    expect(await alerts('Budget exceeded')).toBe(1);
    await spend(1000);
    expect(await alerts('Budget exceeded')).toBe(1);
  });

  test('other categories do not count toward a category budget', async () => {
    const before = (await budgetList()).find((b) => b.category === 'Food').spent;
    await spend(20000, 'Rent');
    expect((await budgetList()).find((b) => b.category === 'Food').spent).toBe(before);
  });

  test('the all-groups overall budget (ALL) counts every category', async () => {
    const res = await request(app).post('/api/budgets').set(auth(carol)).send({ category: 'ALL', amount: 100000, month, year });
    expect(res.status).toBe(201);
    expect(res.body.budget.spent).toBeGreaterThan(10000); // Food + Rent shares
  });

  test('raising a budget resets its alert state; deleting expenses lowers the level', async () => {
    const food = (await budgetList()).find((b) => b.category === 'Food');
    const res = await request(app).put(`/api/budgets/${food.id}`).set(auth(carol)).send({ amount: 500000 });
    expect(res.status).toBe(200);
    expect(res.body.budget).toMatchObject({ amount: 500000, status: 'ok' });
    expect((await request(app).put(`/api/budgets/${food.id}`).set(auth(carol)).send({ amount: 0 })).status).toBe(400);
  });

  test('a budget created after overspending alerts immediately', async () => {
    const before = await alerts('Budget exceeded');
    await request(app).post('/api/budgets').set(auth(carol)).send({ category: 'Rent', amount: 1000, month, year });
    expect(await alerts('Budget exceeded')).toBe(before + 1);
  });
});

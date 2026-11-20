process.env.NODE_ENV = 'test';
const request = require('supertest');
const app = require('../src/app');
const { pool } = require('../src/config/db');
const { makeUser, auth } = require('./helpers');

let alice, bob, carol, outsider, groupId;

const base = (over = {}) => ({
  group_id: groupId, title: 'Dinner', amount: 10000, category: 'Food',
  expense_date: '2026-11-10', paid_by: alice.id, split_type: 'equal',
  participants: [{ user_id: alice.id }, { user_id: bob.id }, { user_id: carol.id }],
  ...over,
});
const post = (user, body) => request(app).post('/api/expenses').set(auth(user)).send(body);
const shares = (res) => res.body.expense.splits.map((s) => s.share_amount);

beforeAll(async () => {
  [alice, bob, carol, outsider] = await Promise.all(['a', 'b', 'c', 'o'].map((l) => makeUser(app, l)));
  const g = await request(app).post('/api/groups').set(auth(alice)).send({ name: 'Trip' });
  groupId = g.body.group.id;
  for (const u of [bob, carol]) await request(app).post(`/api/groups/${groupId}/members`).set(auth(alice)).send({ email: u.email });
});

afterAll(async () => {
  const ids = [alice.id, bob.id, carol.id, outsider.id];
  await pool.query('DELETE FROM `groups` WHERE created_by IN (?)', [ids]);
  await pool.query('DELETE FROM users WHERE id IN (?)', [ids]);
  await pool.end();
});

describe('Create expense + splits', () => {
  test('equal split distributes leftover paise and sums to total', async () => {
    const res = await post(alice, base());
    expect(res.status).toBe(201);
    expect(shares(res)).toEqual([3334, 3333, 3333]);
    expect(res.body.expense.paid_by_name).toBe('User a');
  });

  test('exact split', async () => {
    const res = await post(alice, base({ split_type: 'exact', participants: [
      { user_id: alice.id, value: 2500 }, { user_id: bob.id, value: 7500 }] }));
    expect(res.status).toBe(201);
    expect(shares(res)).toEqual([2500, 7500]);
  });

  test('exact split that does not add up is rejected', async () => {
    const res = await post(alice, base({ split_type: 'exact', participants: [
      { user_id: alice.id, value: 2500 }, { user_id: bob.id, value: 7400 }] }));
    expect(res.status).toBe(400);
  });

  test('percentage split', async () => {
    const res = await post(alice, base({ split_type: 'percentage', participants: [
      { user_id: alice.id, value: 50 }, { user_id: bob.id, value: 30 }, { user_id: carol.id, value: 20 }] }));
    expect(res.status).toBe(201);
    expect(shares(res)).toEqual([5000, 3000, 2000]);
    expect((await post(alice, base({ split_type: 'percentage', participants: [
      { user_id: alice.id, value: 50 }, { user_id: bob.id, value: 40 }] }))).status).toBe(400);
  });

  test('share-based split', async () => {
    const res = await post(alice, base({ amount: 60000, split_type: 'shares', participants: [
      { user_id: alice.id, value: 1 }, { user_id: bob.id, value: 2 }, { user_id: carol.id, value: 3 }] }));
    expect(res.status).toBe(201);
    expect(shares(res)).toEqual([10000, 20000, 30000]);
  });

  test('payer need not be a participant', async () => {
    const res = await post(alice, base({ paid_by: alice.id, participants: [{ user_id: bob.id }, { user_id: carol.id }] }));
    expect(res.status).toBe(201);
    expect(shares(res)).toEqual([5000, 5000]);
  });

  test('rejects decimal rupees, bad category, and missing fields', async () => {
    expect((await post(alice, base({ amount: 100.5 }))).status).toBe(400);
    expect((await post(alice, base({ category: 'Pizza' }))).status).toBe(400);
    expect((await post(alice, base({ title: '' }))).status).toBe(400);
    expect((await post(alice, base({ expense_date: '10-11-2026' }))).status).toBe(400);
  });

  test('payer and participants must belong to the group', async () => {
    expect((await post(alice, base({ paid_by: outsider.id }))).status).toBe(400);
    expect((await post(alice, base({ participants: [{ user_id: alice.id }, { user_id: outsider.id }] }))).status).toBe(400);
  });

  test('a failed split leaves no partial data behind', async () => {
    const [[before]] = await pool.query('SELECT COUNT(*) AS c FROM expenses WHERE group_id = ?', [groupId]);
    await post(alice, base({ split_type: 'exact', participants: [{ user_id: alice.id, value: 1 }] }));
    const [[after]] = await pool.query('SELECT COUNT(*) AS c FROM expenses WHERE group_id = ?', [groupId]);
    expect(after.c).toBe(before.c);
  });

  test('participants get a notification; the actor does not', async () => {
    const [[b]] = await pool.query("SELECT COUNT(*) AS c FROM notifications WHERE user_id = ? AND title = 'Expense added'", [bob.id]);
    const [[a]] = await pool.query("SELECT COUNT(*) AS c FROM notifications WHERE user_id = ? AND title = 'Expense added'", [alice.id]);
    expect(b.c).toBeGreaterThan(0);
    expect(a.c).toBe(0);
  });
});

describe('Access control', () => {
  test('outsiders cannot create, read, edit, delete or list', async () => {
    expect((await post(outsider, base())).status).toBe(404);
    const created = await post(alice, base({ title: 'Secret' }));
    const id = created.body.expense.id;
    expect((await request(app).get(`/api/expenses/${id}`).set(auth(outsider))).status).toBe(404);
    expect((await request(app).put(`/api/expenses/${id}`).set(auth(outsider)).send(base())).status).toBe(404);
    expect((await request(app).delete(`/api/expenses/${id}`).set(auth(outsider))).status).toBe(404);
    expect((await request(app).get(`/api/groups/${groupId}/expenses`).set(auth(outsider))).status).toBe(404);
    expect((await request(app).get(`/api/expenses/${id}`)).status).toBe(401);
  });

  test('only creator or admin can edit/delete; plain members cannot', async () => {
    const byBob = await post(bob, base({ title: 'Bob snack', paid_by: bob.id }));
    const id = byBob.body.expense.id;
    expect((await request(app).put(`/api/expenses/${id}`).set(auth(carol)).send(base())).status).toBe(403);
    expect((await request(app).delete(`/api/expenses/${id}`).set(auth(carol))).status).toBe(403);
    // admin (alice) may edit someone else's expense
    expect((await request(app).put(`/api/expenses/${id}`).set(auth(alice)).send(base({ title: 'Edited by admin' }))).status).toBe(200);
    expect((await request(app).delete(`/api/expenses/${id}`).set(auth(bob))).status).toBe(204);
  });
});

describe('Update, delete, list', () => {
  test('update recalculates splits', async () => {
    const created = await post(alice, base({ title: 'Update me' }));
    const id = created.body.expense.id;
    const res = await request(app).put(`/api/expenses/${id}`).set(auth(alice))
      .send(base({ amount: 20000, split_type: 'exact', participants: [{ user_id: alice.id, value: 5000 }, { user_id: bob.id, value: 15000 }] }));
    expect(res.status).toBe(200);
    expect(res.body.expense.amount).toBe(20000);
    expect(shares(res)).toEqual([5000, 15000]);
    const [[c]] = await pool.query('SELECT COUNT(*) AS c FROM expense_splits WHERE expense_id = ?', [id]);
    expect(c.c).toBe(2);
  });

  test('delete removes expense and its splits', async () => {
    const created = await post(alice, base({ title: 'Delete me' }));
    const id = created.body.expense.id;
    expect((await request(app).delete(`/api/expenses/${id}`).set(auth(alice))).status).toBe(204);
    expect((await request(app).get(`/api/expenses/${id}`).set(auth(alice))).status).toBe(404);
    const [[c]] = await pool.query('SELECT COUNT(*) AS c FROM expense_splits WHERE expense_id = ?', [id]);
    expect(c.c).toBe(0);
  });

  test('list supports search, category, date range and pagination', async () => {
    await post(alice, base({ title: 'Zebra Cab', category: 'Transportation', expense_date: '2026-01-05' }));
    const byText = await request(app).get(`/api/groups/${groupId}/expenses?search=zebra`).set(auth(bob));
    expect(byText.body.expenses).toHaveLength(1);
    expect(byText.body.expenses[0].my_share).toBeGreaterThan(0);
    const byCat = await request(app).get(`/api/groups/${groupId}/expenses?category=Transportation`).set(auth(bob));
    expect(byCat.body.expenses.every((e) => e.category === 'Transportation')).toBe(true);
    const byDate = await request(app).get(`/api/groups/${groupId}/expenses?from=2026-01-01&to=2026-01-31`).set(auth(bob));
    expect(byDate.body.total).toBe(1);
    const page = await request(app).get(`/api/groups/${groupId}/expenses?limit=2&page=1`).set(auth(bob));
    expect(page.body.expenses).toHaveLength(2);
    expect(page.body.total).toBeGreaterThan(2);
    expect((await request(app).get(`/api/groups/${groupId}/expenses?category=Pizza`).set(auth(bob))).status).toBe(400);
  });

  test('archived groups reject new expenses', async () => {
    await request(app).post(`/api/groups/${groupId}/archive`).set(auth(alice));
    expect((await post(alice, base())).status).toBe(409);
    await request(app).post(`/api/groups/${groupId}/unarchive`).set(auth(alice));
  });
});

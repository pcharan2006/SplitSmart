process.env.NODE_ENV = 'test';
const request = require('supertest');
const app = require('../src/app');
const { pool } = require('../src/config/db');
const { makeUser, auth } = require('./helpers');

let alice, bob, carol, outsider, groupId;

const expense = (user, over) =>
  request(app).post('/api/expenses').set(auth(user)).send({
    group_id: groupId, title: 'x', category: 'Food', expense_date: '2026-11-10', split_type: 'equal', ...over,
  });
const balances = async (user = alice) => (await request(app).get(`/api/groups/${groupId}/balances`).set(auth(user))).body;
const byId = (b, u) => b.balances.find((m) => m.user_id === u.id);

beforeAll(async () => {
  [alice, bob, carol, outsider] = await Promise.all(['a', 'b', 'c', 'o'].map((l) => makeUser(app, l)));
  groupId = (await request(app).post('/api/groups').set(auth(alice)).send({ name: 'Balance test' })).body.group.id;
  for (const u of [bob, carol]) await request(app).post(`/api/groups/${groupId}/members`).set(auth(alice)).send({ email: u.email });
});

afterAll(async () => {
  const ids = [alice.id, bob.id, carol.id, outsider.id];
  await pool.query('DELETE FROM `groups` WHERE created_by IN (?)', [ids]);
  await pool.query('DELETE FROM users WHERE id IN (?)', [ids]);
  await pool.end();
});

describe('Balances', () => {
  test('new group: everyone is settled at 0', async () => {
    const b = await balances();
    expect(b.balances).toHaveLength(3);
    expect(b.balances.every((m) => m.net_balance === 0 && m.status === 'settled')).toBe(true);
    expect((await request(app).get(`/api/groups/${groupId}/settlements/suggestions`).set(auth(alice))).body.suggestions).toEqual([]);
  });

  test('Alice pays ₹300 split equally: she is owed 200, others owe 100', async () => {
    const people = [alice, bob, carol].map((u) => ({ user_id: u.id }));
    await expense(alice, { amount: 30000, paid_by: alice.id, participants: people });
    const b = await balances();
    expect(byId(b, alice)).toMatchObject({ total_paid: 30000, total_owed: 10000, net_balance: 20000, amount_to_receive: 20000, status: 'receives' });
    expect(byId(b, bob)).toMatchObject({ total_paid: 0, total_owed: 10000, net_balance: -10000, amount_to_pay: 10000, status: 'owes' });
    expect(b.my_balance.user_id).toBe(alice.id);
    expect(typeof byId(b, bob).total_owed).toBe('number'); // never a string
    expect(b.balances.reduce((a, m) => a + m.net_balance, 0)).toBe(0);
  });

  test('uneven amount (₹100 / 3): balances still sum to exactly zero', async () => {
    await expense(bob, { amount: 10000, paid_by: bob.id, participants: [alice, bob, carol].map((u) => ({ user_id: u.id })) });
    const b = await balances();
    expect(b.balances.reduce((a, m) => a + m.net_balance, 0)).toBe(0);
  });

  test('suggestions clear everyone, in at most n-1 payments, and do not change balances', async () => {
    const before = await balances();
    const res = await request(app).get(`/api/groups/${groupId}/settlements/suggestions`).set(auth(carol));
    expect(res.status).toBe(200);
    const s = res.body.suggestions;
    expect(s.length).toBeGreaterThan(0);
    expect(s.length).toBeLessThanOrEqual(2);
    expect(s[0]).toHaveProperty('from_name');

    const net = Object.fromEntries(before.balances.map((m) => [m.user_id, m.net_balance]));
    for (const p of s) { net[p.from] += p.amount; net[p.to] -= p.amount; }
    expect(Object.values(net).every((v) => v === 0)).toBe(true);

    expect(await balances()).toEqual(before); // reading suggestions changed nothing
  });

  test('completed settlements update balances; pending ones do not', async () => {
    const before = byId(await balances(), bob).net_balance;
    const [r] = await pool.query(
      "INSERT INTO settlements (group_id, paid_by, paid_to, amount, status, payment_date) VALUES (?, ?, ?, 2500, 'pending', CURDATE())",
      [groupId, bob.id, alice.id]
    );
    expect(byId(await balances(), bob).net_balance).toBe(before); // pending: no effect

    await pool.query("UPDATE settlements SET status = 'completed' WHERE id = ?", [r.insertId]);
    const after = await balances();
    expect(byId(after, bob).net_balance).toBe(before + 2500);
    expect(after.balances.reduce((a, m) => a + m.net_balance, 0)).toBe(0);
  });

  test('settling everything via suggestions leaves all balances at 0', async () => {
    const s = (await request(app).get(`/api/groups/${groupId}/settlements/suggestions`).set(auth(alice))).body.suggestions;
    for (const p of s) {
      await pool.query("INSERT INTO settlements (group_id, paid_by, paid_to, amount, status, payment_date) VALUES (?, ?, ?, ?, 'completed', CURDATE())",
        [groupId, p.from, p.to, p.amount]);
    }
    const b = await balances();
    expect(b.balances.every((m) => m.net_balance === 0)).toBe(true);
  });

  test('outsiders and anonymous users are rejected', async () => {
    expect((await request(app).get(`/api/groups/${groupId}/balances`).set(auth(outsider))).status).toBe(404);
    expect((await request(app).get(`/api/groups/${groupId}/settlements/suggestions`).set(auth(outsider))).status).toBe(404);
    expect((await request(app).get(`/api/groups/${groupId}/balances`)).status).toBe(401);
  });
});

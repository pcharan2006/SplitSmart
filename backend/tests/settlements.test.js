process.env.NODE_ENV = 'test';
const request = require('supertest');
const app = require('../src/app');
const { pool } = require('../src/config/db');
const { makeUser, auth } = require('./helpers');

let alice, bob, carol, outsider, groupId;

const pay = (user, body) => request(app).post('/api/settlements').set(auth(user)).send({ group_id: groupId, ...body });
const act = (user, id, action) => request(app).post(`/api/settlements/${id}/${action}`).set(auth(user));
const balances = async () => (await request(app).get(`/api/groups/${groupId}/balances`).set(auth(alice))).body.balances;
const net = async (u) => (await balances()).find((m) => m.user_id === u.id).net_balance;
const notifCount = async (u, title) =>
  (await pool.query('SELECT COUNT(*) AS c FROM notifications WHERE user_id = ? AND title = ?', [u.id, title]))[0][0].c;

beforeAll(async () => {
  [alice, bob, carol, outsider] = await Promise.all(['a', 'b', 'c', 'o'].map((l) => makeUser(app, l)));
  groupId = (await request(app).post('/api/groups').set(auth(alice)).send({ name: 'Settle test' })).body.group.id;
  for (const u of [bob, carol]) await request(app).post(`/api/groups/${groupId}/members`).set(auth(alice)).send({ email: u.email });
  // Alice pays ₹300 split 3 ways: bob and carol each owe alice ₹100.
  await request(app).post('/api/expenses').set(auth(alice)).send({
    group_id: groupId, title: 'Hotel', amount: 30000, category: 'Travel', expense_date: '2026-11-10',
    paid_by: alice.id, split_type: 'equal', participants: [alice, bob, carol].map((u) => ({ user_id: u.id })),
  });
});

afterAll(async () => {
  const ids = [alice.id, bob.id, carol.id, outsider.id];
  await pool.query('DELETE FROM `groups` WHERE created_by IN (?)', [ids]);
  await pool.query('DELETE FROM users WHERE id IN (?)', [ids]);
  await pool.end();
});

describe('Recording and confirming', () => {
  let pendingId;

  test('payer records a payment: pending, receiver is notified, balances unchanged', async () => {
    const res = await pay(bob, { paid_by: bob.id, paid_to: alice.id, amount: 10000 });
    expect(res.status).toBe(201);
    expect(res.body.settlement).toMatchObject({ status: 'pending', amount: 10000, paid_by: bob.id, paid_to: alice.id });
    pendingId = res.body.settlement.id;
    expect(await notifCount(alice, 'Settlement request')).toBe(1);
    expect(await net(bob)).toBe(-10000);
  });

  test('identical pending payment is rejected as a duplicate', async () => {
    expect((await pay(bob, { paid_by: bob.id, paid_to: alice.id, amount: 10000 })).status).toBe(400); // already fully requested
    expect((await pay(bob, { paid_by: bob.id, paid_to: alice.id, amount: 5000 })).status).toBe(400); // pending counts against what bob owes
  });

  test('rejects overpayment, wrong direction, self-payment, non-owing payer', async () => {
    expect((await pay(carol, { paid_by: carol.id, paid_to: alice.id, amount: 10001 })).status).toBe(400);
    expect((await pay(alice, { paid_by: alice.id, paid_to: bob.id, amount: 100 })).status).toBe(400); // alice owes nobody
    expect((await pay(carol, { paid_by: carol.id, paid_to: carol.id, amount: 100 })).status).toBe(400);
    expect((await pay(carol, { paid_by: carol.id, paid_to: bob.id, amount: 100 })).status).toBe(400); // bob is not owed
  });

  test('unauthorized users cannot record, confirm, reject or cancel', async () => {
    expect((await pay(carol, { paid_by: bob.id, paid_to: alice.id, amount: 100 })).status).toBe(403); // third party
    expect((await pay(outsider, { paid_by: bob.id, paid_to: alice.id, amount: 100 })).status).toBe(404); // not in group
    expect((await act(bob, pendingId, 'confirm')).status).toBe(403); // payer can't confirm own payment
    expect((await act(carol, pendingId, 'confirm')).status).toBe(403);
    expect((await act(outsider, pendingId, 'confirm')).status).toBe(404);
    expect((await request(app).delete(`/api/settlements/${pendingId}`).set(auth(alice))).status).toBe(403);
    expect((await request(app).post(`/api/settlements/${pendingId}/confirm`)).status).toBe(401);
  });

  test('receiver confirms: balances update, payer notified, second confirm refused', async () => {
    const res = await act(alice, pendingId, 'confirm');
    expect(res.status).toBe(200);
    expect(res.body.settlement.status).toBe('completed');
    expect(await net(bob)).toBe(0);
    expect(await net(alice)).toBe(10000); // was 20000, bob paid 10000
    expect(await notifCount(bob, 'Payment confirmed')).toBe(1);
    expect((await act(alice, pendingId, 'confirm')).status).toBe(409);
    expect((await act(alice, pendingId, 'reject')).status).toBe(409);
  });

  test('reject keeps balances unchanged and cannot be confirmed afterwards', async () => {
    const id = (await pay(carol, { paid_by: carol.id, paid_to: alice.id, amount: 4000 })).body.settlement.id;
    expect((await act(alice, id, 'reject')).body.settlement.status).toBe('rejected');
    expect(await net(carol)).toBe(-10000);
    expect(await notifCount(carol, 'Payment rejected')).toBe(1);
    expect((await act(alice, id, 'confirm')).status).toBe(409);
  });

  test('payer can cancel a pending request, only while pending', async () => {
    const id = (await pay(carol, { paid_by: carol.id, paid_to: alice.id, amount: 3000 })).body.settlement.id;
    expect((await request(app).delete(`/api/settlements/${id}`).set(auth(carol))).status).toBe(204);
    expect((await act(alice, id, 'confirm')).status).toBe(404);
    expect((await request(app).delete(`/api/settlements/${pendingId}`).set(auth(bob))).status).toBe(409); // completed
  });

  test('receiver can record a payment directly: completed immediately', async () => {
    const res = await pay(alice, { paid_by: carol.id, paid_to: alice.id, amount: 10000, payment_date: '2026-11-12' });
    expect(res.status).toBe(201);
    expect(res.body.settlement).toMatchObject({ status: 'completed', payment_date: '2026-11-12' });
    const b = await balances();
    expect(b.every((m) => m.net_balance === 0)).toBe(true);
    expect(await notifCount(carol, 'Payment recorded')).toBe(1);
  });

  test('once settled up, nothing more can be recorded', async () => {
    const res = await pay(bob, { paid_by: bob.id, paid_to: alice.id, amount: 1 });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/does not owe/);
  });

  test('history lists settlements with names and supports status filter', async () => {
    const all = await request(app).get(`/api/groups/${groupId}/settlements`).set(auth(bob));
    expect(all.status).toBe(200);
    expect(all.body.settlements.length).toBe(3); // completed, rejected, completed (cancelled one was deleted)
    expect(all.body.settlements[0]).toHaveProperty('paid_by_name');
    const done = await request(app).get(`/api/groups/${groupId}/settlements?status=completed`).set(auth(bob));
    expect(done.body.settlements.every((s) => s.status === 'completed')).toBe(true);
    expect((await request(app).get(`/api/groups/${groupId}/settlements?status=bogus`).set(auth(bob))).status).toBe(400);
    expect((await request(app).get(`/api/groups/${groupId}/settlements`).set(auth(outsider))).status).toBe(404);
  });
});

describe('Concurrency', () => {
  test('two simultaneous payments cannot settle the same debt twice', async () => {
    const g = (await request(app).post('/api/groups').set(auth(alice)).send({ name: 'Race' })).body.group.id;
    await request(app).post(`/api/groups/${g}/members`).set(auth(alice)).send({ email: bob.email });
    await request(app).post('/api/expenses').set(auth(alice)).send({
      group_id: g, title: 'Race', amount: 20000, category: 'Food', expense_date: '2026-11-10',
      paid_by: alice.id, split_type: 'equal', participants: [alice, bob].map((u) => ({ user_id: u.id })),
    }); // bob owes 10000
    const attempts = await Promise.all([6000, 6000, 7000, 6500].map((amount) =>
      request(app).post('/api/settlements').set(auth(bob)).send({ group_id: g, paid_by: bob.id, paid_to: alice.id, amount })));
    expect(attempts.filter((r) => r.status === 201)).toHaveLength(1);
    const [[sum]] = await pool.query("SELECT CAST(COALESCE(SUM(amount),0) AS UNSIGNED) AS s FROM settlements WHERE group_id = ?", [g]);
    expect(sum.s).toBeLessThanOrEqual(10000);
  });

  test('archived groups reject settlement changes', async () => {
    const g = (await request(app).post('/api/groups').set(auth(alice)).send({ name: 'Frozen' })).body.group.id;
    await request(app).post(`/api/groups/${g}/archive`).set(auth(alice));
    const res = await request(app).post('/api/settlements').set(auth(alice)).send({ group_id: g, paid_by: bob.id, paid_to: alice.id, amount: 100 });
    expect(res.status).toBe(409);
  });
});

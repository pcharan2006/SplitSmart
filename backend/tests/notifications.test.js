process.env.NODE_ENV = 'test';
const request = require('supertest');
const app = require('../src/app');
const { pool } = require('../src/config/db');
const { makeUser, auth } = require('./helpers');

let alice, bob;

beforeAll(async () => {
  [alice, bob] = await Promise.all(['a', 'b'].map((l) => makeUser(app, l)));
  // Each group that adds bob creates one notification for him.
  for (const name of ['One', 'Two', 'Three']) {
    const g = await request(app).post('/api/groups').set(auth(alice)).send({ name });
    await request(app).post(`/api/groups/${g.body.group.id}/members`).set(auth(alice)).send({ email: bob.email });
  }
});

afterAll(async () => {
  await pool.query('DELETE FROM `groups` WHERE created_by IN (?)', [[alice.id, bob.id]]);
  await pool.query('DELETE FROM users WHERE id IN (?)', [[alice.id, bob.id]]);
  await pool.end();
});

describe('Notifications', () => {
  test('requires login', async () => {
    expect((await request(app).get('/api/notifications')).status).toBe(401);
  });

  test('lists newest first with unread count; others see only their own', async () => {
    const res = await request(app).get('/api/notifications').set(auth(bob));
    expect(res.status).toBe(200);
    expect(res.body.notifications).toHaveLength(3);
    expect(res.body.unread_count).toBe(3);
    expect(res.body.notifications[0]).toMatchObject({ title: 'Added to a group', is_read: false });
    expect(res.body.notifications[0].message).toMatch(/Three/);
    expect((await request(app).get('/api/notifications').set(auth(alice))).body.notifications).toHaveLength(0);
  });

  test('pagination and unread filter', async () => {
    const page = await request(app).get('/api/notifications?limit=2&page=2').set(auth(bob));
    expect(page.body.notifications).toHaveLength(1);
    expect((await request(app).get('/api/notifications?limit=0').set(auth(bob))).status).toBe(400);
  });

  test('mark one as read; cannot touch someone else\'s', async () => {
    const list = (await request(app).get('/api/notifications').set(auth(bob))).body.notifications;
    const id = list[0].id;
    expect((await request(app).post(`/api/notifications/${id}/read`).set(auth(alice))).status).toBe(404);
    const res = await request(app).post(`/api/notifications/${id}/read`).set(auth(bob));
    expect(res.body.unread_count).toBe(2);
    const unread = await request(app).get('/api/notifications?unread=true').set(auth(bob));
    expect(unread.body.notifications).toHaveLength(2);
    expect((await request(app).post('/api/notifications/999999999/read').set(auth(bob))).status).toBe(404);
  });

  test('mark all as read', async () => {
    const res = await request(app).post('/api/notifications/read-all').set(auth(bob));
    expect(res.body.unread_count).toBe(0);
    expect((await request(app).get('/api/notifications?unread=true').set(auth(bob))).body.notifications).toHaveLength(0);
  });
});

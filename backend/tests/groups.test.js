process.env.NODE_ENV = 'test';
const request = require('supertest');
const app = require('../src/app');
const { pool } = require('../src/config/db');
const { makeUser, auth } = require('./helpers');

let alice, bob, carol, groupId;

beforeAll(async () => {
  [alice, bob, carol] = await Promise.all([makeUser(app, 'alice'), makeUser(app, 'bob'), makeUser(app, 'carol')]);
});

afterAll(async () => {
  await pool.query('DELETE FROM `groups` WHERE created_by IN (?)', [[alice.id, bob.id, carol.id]]);
  await pool.query('DELETE FROM users WHERE id IN (?)', [[alice.id, bob.id, carol.id]]);
  await pool.end();
});

describe('Groups', () => {
  test('requires login', async () => {
    expect((await request(app).get('/api/groups')).status).toBe(401);
  });

  test('creator becomes admin member', async () => {
    const res = await request(app).post('/api/groups').set(auth(alice)).send({ name: 'Flat Roommates', description: 'Rent etc' });
    expect(res.status).toBe(201);
    groupId = res.body.group.id;
    expect(res.body.group.members).toHaveLength(1);
    expect(res.body.group.members[0]).toMatchObject({ id: alice.id, role: 'admin' });
  });

  test('validates group name', async () => {
    const res = await request(app).post('/api/groups').set(auth(alice)).send({ name: 'x' });
    expect(res.status).toBe(400);
  });

  test('non-members cannot see the group (details, list, edit, add members)', async () => {
    expect((await request(app).get(`/api/groups/${groupId}`).set(auth(bob))).status).toBe(404);
    expect((await request(app).put(`/api/groups/${groupId}`).set(auth(bob)).send({ name: 'Hacked' })).status).toBe(404);
    expect((await request(app).post(`/api/groups/${groupId}/members`).set(auth(bob)).send({ email: bob.email })).status).toBe(404);
    const list = await request(app).get('/api/groups').set(auth(bob));
    expect(list.body.groups).toHaveLength(0);
  });

  test('admin adds a member by email; duplicate rejected; unknown email 404', async () => {
    const ok = await request(app).post(`/api/groups/${groupId}/members`).set(auth(alice)).send({ email: bob.email });
    expect(ok.status).toBe(201);
    expect(ok.body.group.members).toHaveLength(2);
    expect((await request(app).post(`/api/groups/${groupId}/members`).set(auth(alice)).send({ email: bob.email })).status).toBe(409);
    expect((await request(app).post(`/api/groups/${groupId}/members`).set(auth(alice)).send({ email: 'ghost@example.com' })).status).toBe(404);
    const [[n]] = await pool.query('SELECT COUNT(*) AS c FROM notifications WHERE user_id = ?', [bob.id]);
    expect(n.c).toBe(1);
  });

  test('regular members cannot edit, invite, add members or delete', async () => {
    expect((await request(app).put(`/api/groups/${groupId}`).set(auth(bob)).send({ name: 'Mine now' })).status).toBe(403);
    expect((await request(app).post(`/api/groups/${groupId}/invitations`).set(auth(bob))).status).toBe(403);
    expect((await request(app).post(`/api/groups/${groupId}/members`).set(auth(bob)).send({ email: carol.email })).status).toBe(403);
    expect((await request(app).delete(`/api/groups/${groupId}`).set(auth(bob))).status).toBe(403);
    expect((await request(app).get(`/api/groups/${groupId}`).set(auth(bob))).body.group.my_role).toBe('member');
  });

  test('admin edits group', async () => {
    const res = await request(app).put(`/api/groups/${groupId}`).set(auth(alice)).send({ name: 'Flat 2B' });
    expect(res.status).toBe(200);
    expect(res.body.group.name).toBe('Flat 2B');
  });

  test('invite code lets a user join; cannot join twice; bad code rejected', async () => {
    const inv = await request(app).post(`/api/groups/${groupId}/invitations`).set(auth(alice));
    expect(inv.status).toBe(201);
    const join = await request(app).post('/api/groups/join').set(auth(carol)).send({ code: inv.body.code });
    expect(join.status).toBe(200);
    expect(join.body.group.members).toHaveLength(3);
    expect((await request(app).post('/api/groups/join').set(auth(carol)).send({ code: inv.body.code })).status).toBe(409);
    expect((await request(app).post('/api/groups/join').set(auth(bob)).send({ code: 'doesnotexist1' })).status).toBe(400);
  });

  test('member removal rules', async () => {
    // creator can't be removed; non-admin can't remove others
    expect((await request(app).delete(`/api/groups/${groupId}/members/${alice.id}`).set(auth(alice))).status).toBe(400);
    expect((await request(app).delete(`/api/groups/${groupId}/members/${carol.id}`).set(auth(bob))).status).toBe(403);
    // admin removes carol; bob can leave on his own
    expect((await request(app).delete(`/api/groups/${groupId}/members/${carol.id}`).set(auth(alice))).status).toBe(204);
    expect((await request(app).delete(`/api/groups/${groupId}/members/${bob.id}`).set(auth(bob))).status).toBe(204);
    expect((await request(app).get(`/api/groups/${groupId}`).set(auth(bob))).status).toBe(404);
  });

  test('members with expense history cannot be removed; groups with expenses cannot be deleted', async () => {
    await request(app).post(`/api/groups/${groupId}/members`).set(auth(alice)).send({ email: bob.email });
    await pool.query(
      "INSERT INTO expenses (group_id, paid_by, title, amount, category, split_type, expense_date, created_by) VALUES (?, ?, 'Pizza', 10000, 'Food', 'equal', CURDATE(), ?)",
      [groupId, bob.id, alice.id]
    );
    expect((await request(app).delete(`/api/groups/${groupId}/members/${bob.id}`).set(auth(alice))).status).toBe(409);
    expect((await request(app).delete(`/api/groups/${groupId}`).set(auth(alice))).status).toBe(409);
  });

  test('archive makes group read-only; unarchive restores; empty group can be deleted', async () => {
    expect((await request(app).post(`/api/groups/${groupId}/archive`).set(auth(alice))).status).toBe(200);
    expect((await request(app).put(`/api/groups/${groupId}`).set(auth(alice)).send({ name: 'Nope' })).status).toBe(409);
    expect((await request(app).post(`/api/groups/${groupId}/unarchive`).set(auth(alice))).status).toBe(200);

    const g = await request(app).post('/api/groups').set(auth(alice)).send({ name: 'Temp group' });
    expect((await request(app).delete(`/api/groups/${g.body.group.id}`).set(auth(alice))).status).toBe(204);
  });
});

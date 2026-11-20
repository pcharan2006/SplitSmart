process.env.NODE_ENV = 'test';
// Tests must never call the real OpenAI (slow, and it would spend real credit): behave as if no key is configured.
jest.mock('../src/config/openai', () => ({ getClient: () => null, getModel: () => 'test-model' }));
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const request = require('supertest');
const app = require('../src/app');
const { pool } = require('../src/config/db');
const { uploadDir } = require('../src/config/uploads');
const { validateEnv } = require('../src/config/validateEnv');
const { makeUser, auth } = require('./helpers');

let alice, bob;
const createdFiles = new Set();
const listUploads = () => new Set(fs.readdirSync(uploadDir));
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');

beforeAll(async () => {
  [alice, bob] = await Promise.all([makeUser(app, 'alice'), makeUser(app, 'bob')]);
});

afterAll(async () => {
  await pool.query('DELETE FROM `groups` WHERE created_by IN (?)', [[alice.id, bob.id]]);
  await pool.query('DELETE FROM users WHERE id IN (?)', [[alice.id, bob.id]]);
  const profileFiles = new Set([...createdFiles]);
  for (const f of profileFiles) fs.promises.unlink(path.join(uploadDir, f)).catch(() => {});
  await pool.end();
});

afterEach(() => jest.restoreAllMocks());

describe('Every protected endpoint rejects anonymous requests', () => {
  const protectedRoutes = [
    ['get', '/api/auth/me'], ['post', '/api/auth/change-password'], ['get', '/api/users/me'], ['put', '/api/users/me'],
    ['post', '/api/groups'], ['get', '/api/groups'], ['post', '/api/groups/join'],
    ['get', '/api/groups/1'], ['put', '/api/groups/1'], ['delete', '/api/groups/1'],
    ['post', '/api/groups/1/archive'], ['post', '/api/groups/1/unarchive'], ['post', '/api/groups/1/members'],
    ['delete', '/api/groups/1/members/1'], ['post', '/api/groups/1/invitations'], ['get', '/api/groups/1/expenses'],
    ['get', '/api/groups/1/balances'], ['get', '/api/groups/1/settlements/suggestions'], ['get', '/api/groups/1/settlements'],
    ['post', '/api/expenses'], ['get', '/api/expenses/1'], ['put', '/api/expenses/1'], ['delete', '/api/expenses/1'],
    ['post', '/api/settlements'], ['post', '/api/settlements/1/confirm'], ['post', '/api/settlements/1/reject'], ['delete', '/api/settlements/1'],
    ['get', '/api/analytics/dashboard'], ['get', '/api/analytics/groups/1'], ['get', '/api/analytics/monthly'],
    ['post', '/api/budgets'], ['get', '/api/budgets'], ['put', '/api/budgets/1'], ['delete', '/api/budgets/1'],
    ['get', '/api/notifications'], ['post', '/api/notifications/read-all'], ['post', '/api/notifications/1/read'],
    ['post', '/api/ai/chat'], ['post', '/api/ai/insights'],
  ];
  test.each(protectedRoutes)('%s %s -> 401', async (method, url) => {
    expect((await request(app)[method](url)).status).toBe(401);
  });
});

describe('JWT handling', () => {
  const me = (token, scheme = 'Bearer') => request(app).get('/api/auth/me').set('Authorization', `${scheme} ${token}`);

  test('token signed with a different secret is rejected', async () => {
    expect((await me(jwt.sign({ id: alice.id }, 'not-the-real-secret'))).status).toBe(401);
  });

  test('"alg: none" unsigned token is rejected', async () => {
    const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
    const forged = `${b64({ alg: 'none', typ: 'JWT' })}.${b64({ id: alice.id })}.`;
    expect((await me(forged)).status).toBe(401);
  });

  test('token signed with a different algorithm (HS512) is rejected', async () => {
    expect((await me(jwt.sign({ id: alice.id }, process.env.JWT_SECRET, { algorithm: 'HS512' }))).status).toBe(401);
  });

  test('expired token is rejected', async () => {
    expect((await me(jwt.sign({ id: alice.id }, process.env.JWT_SECRET, { expiresIn: -10 }))).status).toBe(401);
  });

  test('a valid token for a user that has been deleted is rejected', async () => {
    const ghost = await makeUser(app, 'ghost');
    await pool.query('DELETE FROM users WHERE id = ?', [ghost.id]);
    const res = await me(ghost.token);
    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/no longer exists/);
  });

  test('wrong scheme and empty bearer are rejected', async () => {
    expect((await me(alice.token, 'Basic')).status).toBe(401);
    expect((await request(app).get('/api/auth/me').set('Authorization', 'Bearer')).status).toBe(401);
    expect((await request(app).get('/api/auth/me').set('Authorization', alice.token)).status).toBe(401);
  });

  test('a genuine token still works', async () => {
    expect((await me(alice.token)).status).toBe(200);
  });
});

describe('Input attacks', () => {
  test('SQL injection in login is a plain failed login, never a 500', async () => {
    const bad = await request(app).post('/api/auth/login').send({ email: "' OR '1'='1", password: "' OR '1'='1" });
    expect(bad.status).toBe(400); // not a valid email
    const sneaky = await request(app).post('/api/auth/login').send({ email: "admin'--@example.com", password: 'x' });
    expect(sneaky.status).toBe(401);
  });

  test('SQL in a group name is stored as literal text and the tables survive', async () => {
    const evil = "Robert'); DROP TABLE users;--";
    const res = await request(app).post('/api/groups').set(auth(alice)).send({ name: evil });
    expect(res.status).toBe(201);
    expect(res.body.group.name).toBe(evil);
    const [[{ n }]] = await pool.query('SELECT COUNT(*) AS n FROM users');
    expect(n).toBeGreaterThan(0);
  });

  test('SQL in search/filter parameters is harmless or rejected', async () => {
    const gid = (await request(app).post('/api/groups').set(auth(alice)).send({ name: 'Search target' })).body.group.id;
    const search = await request(app).get(`/api/groups/${gid}/expenses`).query({ search: "' OR 1=1 --" }).set(auth(alice));
    expect(search.status).toBe(200);
    expect(search.body.expenses).toEqual([]);
    const cat = await request(app).get(`/api/groups/${gid}/expenses`).query({ category: "Food' OR '1'='1" }).set(auth(alice));
    expect(cat.status).toBe(400);
  });

  test('non-numeric and out-of-range ids are rejected before touching the database', async () => {
    for (const url of ['/api/groups/abc', '/api/groups/0', '/api/groups/-1', '/api/expenses/1;DROP', '/api/groups/1e9999']) {
      expect((await request(app).get(url).set(auth(alice))).status).toBe(400);
    }
  });

  test('mass assignment: extra fields on register/profile are ignored', async () => {
    const email = `mass_${Date.now()}@example.com`;
    const res = await request(app).post('/api/auth/register').send({
      name: 'Mass Test', email, password: 'Passw0rdOK', confirmPassword: 'Passw0rdOK', id: 1, role: 'admin', profile_image: '/uploads/x.png', is_admin: true,
    });
    expect(res.status).toBe(201);
    expect(res.body.user.id).not.toBe(1);
    expect(res.body.user.profile_image).toBeNull();
    expect(res.body.user.role).toBeUndefined();
    const upd = await request(app).put('/api/users/me').set(auth({ token: res.body.token })).field('name', 'Still Mass').field('email', 'hijack@example.com').field('id', '1');
    expect(upd.status).toBe(200);
    expect(upd.body.user.email).toBe(email);
    expect(upd.body.user.id).toBe(res.body.user.id);
    await pool.query('DELETE FROM users WHERE id = ?', [res.body.user.id]);
  });

  test('malformed and oversized JSON bodies get clean 4xx errors', async () => {
    const malformed = await request(app).post('/api/auth/login').set('Content-Type', 'application/json').send('{"email": ');
    expect(malformed.status).toBe(400);
    expect(malformed.body.message).toBe('Invalid JSON body');
    const huge = await request(app).post('/api/auth/login').send({ email: 'a'.repeat(2 * 1024 * 1024) });
    expect(huge.status).toBe(413);
  });

  test('passwords longer than bcrypt can handle are rejected, not silently truncated', async () => {
    const long = 'Aa1' + 'x'.repeat(80);
    const res = await request(app).post('/api/auth/register').send({ name: 'Long Pw', email: `long_${Date.now()}@example.com`, password: long, confirmPassword: long });
    expect(res.status).toBe(400);
  });
});

describe('Cross-user access (IDOR) spot checks', () => {
  test("bob can't read, change or settle in alice's group, and ids can't be swapped in request bodies", async () => {
    const g = (await request(app).post('/api/groups').set(auth(alice)).send({ name: 'Alice only' })).body.group.id;
    const body = { group_id: g, title: 'x', amount: 100, category: 'Food', expense_date: '2026-11-10', paid_by: alice.id, split_type: 'equal', participants: [{ user_id: alice.id }] };
    expect((await request(app).post('/api/expenses').set(auth(bob)).send(body)).status).toBe(404);
    expect((await request(app).get(`/api/analytics/groups/${g}`).set(auth(bob))).status).toBe(404);
    expect((await request(app).post('/api/settlements').set(auth(bob)).send({ group_id: g, paid_by: bob.id, paid_to: alice.id, amount: 100 })).status).toBe(404);
    expect((await request(app).post('/api/budgets').set(auth(bob)).send({ group_id: g, amount: 100, month: 11, year: 2026 })).status).toBe(404);
    expect((await request(app).post('/api/ai/chat').set(auth(bob)).send({ message: 'hi', group_id: g })).status).toBe(404);
  });
});

describe('Response headers and CORS', () => {
  test('security headers are set and the framework is not advertised', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['x-powered-by']).toBeUndefined();
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBeDefined();
    expect(res.headers['strict-transport-security']).toBeDefined();
  });

  test('only the configured frontend origin is allowed by CORS', async () => {
    // With one configured origin the server always answers with THAT origin. A page on evil.example sees a
    // mismatch and the browser blocks it. What matters: never "*" and never the attacker's origin.
    const evil = await request(app).get('/api/health').set('Origin', 'http://evil.example');
    expect(evil.headers['access-control-allow-origin']).toBe(process.env.CLIENT_URL);
    expect(evil.headers['access-control-allow-origin']).not.toBe('http://evil.example');
    expect(evil.headers['access-control-allow-origin']).not.toBe('*');
    const good = await request(app).get('/api/health').set('Origin', process.env.CLIENT_URL);
    expect(good.headers['access-control-allow-origin']).toBe(process.env.CLIENT_URL);
  });
});

describe('Error handling', () => {
  test('unexpected failures return a generic message with no internals', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(pool, 'query').mockRejectedValueOnce(Object.assign(new Error("SELECT secret FROM table 'db_internal'"), { code: 'ER_X' }));
    const res = await request(app).get('/api/auth/me').set(auth(alice));
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ message: 'Internal server error' });
  });

  test('health check reports 503 when the database is unreachable', async () => {
    jest.spyOn(pool, 'query').mockRejectedValueOnce(new Error('connection refused'));
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(503);
    expect(res.body.database).toBe('unreachable');
  });

  test('unknown routes return 404 JSON', async () => {
    const res = await request(app).get('/api/nope');
    expect(res.status).toBe(404);
    expect(res.body.message).toBe('Route not found');
  });
});

describe('File uploads', () => {
  const upload = (user, buf, opts = {}, name = 'Upload Tester') =>
    request(app).put('/api/users/me').set(auth(user)).field('name', name)
      .attach('profile_image', buf, { filename: 'avatar.png', contentType: 'image/png', ...opts });

  test('a real image is accepted, stored under a random name, and served safely', async () => {
    const res = await upload(alice, PNG, { filename: '../../../evil.png' });
    expect(res.status).toBe(200);
    expect(res.body.user.profile_image).toMatch(/^\/uploads\/[0-9a-f-]{36}\.png$/);
    const file = path.basename(res.body.user.profile_image);
    createdFiles.add(file);
    expect(fs.existsSync(path.join(uploadDir, file))).toBe(true);
    const served = await request(app).get(res.body.user.profile_image);
    expect(served.status).toBe(200);
    expect(served.headers['content-type']).toMatch(/image\/png/);
    expect(served.headers['x-content-type-options']).toBe('nosniff');
  });

  test('replacing the avatar deletes the previous file', async () => {
    const first = await upload(bob, PNG);
    const firstFile = path.basename(first.body.user.profile_image);
    const second = await upload(bob, PNG);
    const secondFile = path.basename(second.body.user.profile_image);
    createdFiles.add(secondFile);
    await new Promise((r) => setTimeout(r, 200)); // deletion is fire-and-forget
    expect(fs.existsSync(path.join(uploadDir, firstFile))).toBe(false);
    expect(fs.existsSync(path.join(uploadDir, secondFile))).toBe(true);
  });

  test('a file that only CLAIMS to be an image is rejected and not kept', async () => {
    const before = listUploads();
    const res = await upload(alice, Buffer.from('<?php system($_GET["c"]); ?>'));
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/not a valid image/);
    expect(listUploads()).toEqual(before);
  });

  test('wrong type, oversize file, and failed validation all leave nothing behind', async () => {
    const before = listUploads();
    const wrongType = await upload(alice, Buffer.from('hello'), { filename: 'a.txt', contentType: 'text/plain' });
    expect(wrongType.status).toBe(400);
    expect(wrongType.body.message).toMatch(/JPG, PNG or WebP/);

    const big = Buffer.concat([PNG, Buffer.alloc(2.5 * 1024 * 1024)]);
    const tooBig = await upload(alice, big);
    expect(tooBig.status).toBe(400);

    const badName = await upload(alice, PNG, {}, 'x'); // valid image, but name too short
    expect(badName.status).toBe(400);
    await new Promise((r) => setTimeout(r, 100));
    expect(listUploads()).toEqual(before);
  });

  test('the uploads folder cannot be used to read other files on the server', async () => {
    for (const url of ['/uploads/../.env', '/uploads/..%2f.env', '/uploads/%2e%2e/package.json']) {
      const res = await request(app).get(url);
      expect(res.status).not.toBe(200);
      expect(res.text).not.toMatch(/JWT_SECRET|DB_PASSWORD/);
    }
  });
});

describe('Rate limiting (switched off in tests, enabled here)', () => {
  const withLimitsOn = async (fn) => {
    process.env.NODE_ENV = 'development';
    process.env.AUTH_RATE_LIMIT = '20'; // the production default
    try { await fn(); } finally { process.env.NODE_ENV = 'test'; delete process.env.AUTH_RATE_LIMIT; }
  };

  test('repeated login attempts are throttled with 429', async () => {
    await withLimitsOn(async () => {
      const statuses = [];
      for (let i = 0; i < 22; i++) statuses.push((await request(app).post('/api/auth/login').send({ email: 'x@example.com', password: 'nope' })).status);
      expect(statuses.slice(0, 20).every((s) => s === 401)).toBe(true);
      expect(statuses.slice(20)).toEqual([429, 429]);
    });
  });

  test('AI endpoints are limited per user, not per IP', async () => {
    const u1 = await makeUser(app, 'ai1');
    const u2 = await makeUser(app, 'ai2');
    await withLimitsOn(async () => {
      let last;
      for (let i = 0; i < 16; i++) last = await request(app).post('/api/ai/insights').set(auth(u1)).send({});
      expect(last.status).toBe(429);
      expect((await request(app).post('/api/ai/insights').set(auth(u2)).send({})).status).toBe(200); // another user is unaffected
    });
    await pool.query('DELETE FROM users WHERE id IN (?)', [[u1.id, u2.id]]);
  });
});

describe('Start-up configuration check', () => {
  const good = { DB_HOST: 'h', DB_USER: 'u', DB_NAME: 'd', JWT_SECRET: 'x'.repeat(40) };

  test('missing required settings are reported', () => {
    expect(validateEnv({})).toEqual(expect.arrayContaining(['DB_HOST is not set', 'JWT_SECRET is not set']));
  });

  test('development accepts a simple secret', () => {
    expect(validateEnv({ ...good, JWT_SECRET: 'change_me', NODE_ENV: 'development' })).toEqual([]);
  });

  test('production refuses weak secrets, placeholders, and missing/wildcard CORS origin', () => {
    const prod = { ...good, NODE_ENV: 'production', CLIENT_URL: 'https://app.example.com' };
    expect(validateEnv(prod)).toEqual([]);
    expect(validateEnv({ ...prod, JWT_SECRET: 'short' }).join()).toMatch(/at least 32/);
    expect(validateEnv({ ...prod, JWT_SECRET: 'change_me_to_a_long_random_string_please_ok' }).join()).toMatch(/placeholder/);
    expect(validateEnv({ ...prod, CLIENT_URL: undefined }).join()).toMatch(/CLIENT_URL must be set/);
    expect(validateEnv({ ...prod, CLIENT_URL: '*' }).join()).toMatch(/not \*/);
  });
});

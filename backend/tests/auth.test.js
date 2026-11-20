process.env.NODE_ENV = 'test';
const request = require('supertest');
const app = require('../src/app');
const { pool } = require('../src/config/db');

const email = `test_${Date.now()}@example.com`;
const good = { name: 'Test User', email, password: 'Passw0rdOK', confirmPassword: 'Passw0rdOK' };
let token;

afterAll(async () => {
  await pool.query('DELETE FROM users WHERE email = ?', [email]);
  await pool.end();
});

describe('Auth', () => {
  test('registers a user and never returns the password', async () => {
    const res = await request(app).post('/api/auth/register').send(good);
    expect(res.status).toBe(201);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user.email).toBe(email);
    expect(JSON.stringify(res.body)).not.toMatch(/password/i);
    // stored as a bcrypt hash, not plaintext
    const [[row]] = await pool.query('SELECT password FROM users WHERE email = ?', [email]);
    expect(row.password).toMatch(/^\$2[aby]\$/);
  });

  test('rejects duplicate email', async () => {
    const res = await request(app).post('/api/auth/register').send(good);
    expect(res.status).toBe(409);
  });

  test('rejects weak password and mismatched confirmation', async () => {
    const weak = await request(app).post('/api/auth/register').send({ ...good, email: 'a@b.com', password: 'short', confirmPassword: 'short' });
    expect(weak.status).toBe(400);
    const mismatch = await request(app).post('/api/auth/register').send({ ...good, email: 'a@b.com', confirmPassword: 'Different1' });
    expect(mismatch.status).toBe(400);
  });

  test('logs in with valid credentials', async () => {
    const res = await request(app).post('/api/auth/login').send({ email, password: good.password });
    expect(res.status).toBe(200);
    token = res.body.token;
  });

  test('rejects invalid credentials with the same message for wrong email or password', async () => {
    const wrongPw = await request(app).post('/api/auth/login').send({ email, password: 'WrongPass1' });
    const wrongEmail = await request(app).post('/api/auth/login').send({ email: 'nobody@example.com', password: 'WrongPass1' });
    expect(wrongPw.status).toBe(401);
    expect(wrongEmail.status).toBe(401);
    expect(wrongPw.body.message).toBe(wrongEmail.body.message);
  });

  test('protects /me', async () => {
    expect((await request(app).get('/api/auth/me')).status).toBe(401);
    expect((await request(app).get('/api/auth/me').set('Authorization', 'Bearer garbage')).status).toBe(401);
    const ok = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
    expect(ok.status).toBe(200);
    expect(ok.body.user.email).toBe(email);
  });

  test('updates profile name', async () => {
    const res = await request(app).put('/api/users/me').set('Authorization', `Bearer ${token}`).field('name', 'New Name');
    expect(res.status).toBe(200);
    expect(res.body.user.name).toBe('New Name');
  });

  test('changes password', async () => {
    const bad = await request(app).post('/api/auth/change-password').set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'nope12345', newPassword: 'Another1Pass' });
    expect(bad.status).toBe(400);
    const ok = await request(app).post('/api/auth/change-password').set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: good.password, newPassword: 'Another1Pass' });
    expect(ok.status).toBe(200);
    const login = await request(app).post('/api/auth/login').send({ email, password: 'Another1Pass' });
    expect(login.status).toBe(200);
  });

  test('forgot + reset password flow', async () => {
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const res = await request(app).post('/api/auth/forgot-password').send({ email });
    expect(res.status).toBe(200);
    const resetToken = spy.mock.calls.flat().join(' ').match(/token for .*: (\w{64})/)[1];
    spy.mockRestore();

    // unknown email gives the identical response
    const unknown = await request(app).post('/api/auth/forgot-password').send({ email: 'ghost@example.com' });
    expect(unknown.body.message).toBe(res.body.message);

    const reset = await request(app).post('/api/auth/reset-password').send({ token: resetToken, newPassword: 'Brandnew123' });
    expect(reset.status).toBe(200);
    // token is single-use
    const again = await request(app).post('/api/auth/reset-password').send({ token: resetToken, newPassword: 'Brandnew456' });
    expect(again.status).toBe(400);
    const login = await request(app).post('/api/auth/login').send({ email, password: 'Brandnew123' });
    expect(login.status).toBe(200);
  });
});

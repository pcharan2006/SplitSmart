process.env.NODE_ENV = 'test';
process.env.SMTP_HOST = 'smtp.fake.test';
process.env.CLIENT_URL = 'https://app.example.com';
const request = require('supertest');
const app = require('../src/app');
const { pool } = require('../src/config/db');
const emailService = require('../src/services/emailService');

const email = `em_${Date.now()}@example.com`;
const sendMail = jest.fn();
const waitForMail = () => new Promise((r) => setTimeout(r, 50));

beforeAll(async () => {
  emailService._setTransporter({ sendMail });
  await request(app)
    .post('/api/auth/register')
    .send({ name: 'Mail <b>User</b>', email, password: 'Passw0rdOK', confirmPassword: 'Passw0rdOK' });
});

afterEach(() => sendMail.mockReset());

afterAll(async () => {
  await pool.query('DELETE FROM users WHERE email = ?', [email]);
  await pool.end();
});

describe('Password reset email', () => {
  test('sends a working reset link and never puts the token in the response', async () => {
    sendMail.mockResolvedValue({});
    const res = await request(app).post('/api/auth/forgot-password').send({ email });
    await waitForMail();

    expect(res.status).toBe(200);
    expect(res.body.devResetToken).toBeUndefined();
    expect(sendMail).toHaveBeenCalledTimes(1);
    const mail = sendMail.mock.calls[0][0];
    expect(mail.to).toBe(email);
    const token = mail.text.match(/reset-password\?token=(\w{64})/)[1];
    expect(mail.text).toContain('https://app.example.com/reset-password?token=');
    expect(mail.html).not.toContain('<b>User</b>'); // name is HTML-escaped

    const reset = await request(app).post('/api/auth/reset-password').send({ token, newPassword: 'Brandnew123' });
    expect(reset.status).toBe(200);
  });

  test('sends nothing for an unknown email, with an identical response', async () => {
    const res = await request(app).post('/api/auth/forgot-password').send({ email: 'ghost_nobody@example.com' });
    await waitForMail();
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/if that email is registered/i);
    expect(sendMail).not.toHaveBeenCalled();
  });

  test('a mail-server failure does not break or reveal anything to the visitor', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    sendMail.mockRejectedValue(new Error('SMTP connection refused'));
    const res = await request(app).post('/api/auth/forgot-password').send({ email });
    await waitForMail();
    expect(res.status).toBe(200);
    expect(JSON.stringify(res.body)).not.toMatch(/smtp|refused/i);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});

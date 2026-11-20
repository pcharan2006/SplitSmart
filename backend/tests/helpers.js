const request = require('supertest');

// Registers a throwaway user and returns { id, email, token }.
async function makeUser(app, label) {
  const email = `${label}_${Date.now()}_${Math.floor(Math.random() * 1e6)}@example.com`;
  const res = await request(app)
    .post('/api/auth/register')
    .send({ name: `User ${label}`, email, password: 'Passw0rdOK', confirmPassword: 'Passw0rdOK' });
  return { id: res.body.user.id, email, token: res.body.token };
}

const auth = (user) => ({ Authorization: `Bearer ${user.token}` });

module.exports = { makeUser, auth };

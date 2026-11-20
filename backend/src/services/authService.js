const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const ApiError = require('../utils/ApiError');
const userModel = require('../models/userModel');

const SALT_ROUNDS = 10;
// Compared against when the email doesn't exist, so response time doesn't reveal which emails are registered.
const DUMMY_HASH = bcrypt.hashSync('dummy-password', SALT_ROUNDS);

function signToken(user) {
  return jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

async function register({ name, email, password }) {
  email = email.toLowerCase();
  if (await userModel.findByEmail(email)) throw new ApiError(409, 'Email is already registered');

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  let user;
  try {
    user = await userModel.create({ name, email, passwordHash });
  } catch (err) {
    // Two simultaneous sign-ups: the UNIQUE index on email is the real guard.
    if (err.code === 'ER_DUP_ENTRY') throw new ApiError(409, 'Email is already registered');
    throw err;
  }
  return { user, token: signToken(user) };
}

async function login({ email, password }) {
  const row = await userModel.findByEmail(email.toLowerCase());
  const ok = await bcrypt.compare(password, row ? row.password : DUMMY_HASH);
  if (!row || !ok) throw new ApiError(401, 'Invalid email or password');

  const user = await userModel.findById(row.id);
  return { user, token: signToken(user) };
}

async function changePassword(userId, { currentPassword, newPassword }) {
  const row = await userModel.findByIdWithPassword(userId);
  if (!(await bcrypt.compare(currentPassword, row.password))) {
    throw new ApiError(400, 'Current password is incorrect');
  }
  await userModel.updatePassword(userId, await bcrypt.hash(newPassword, SALT_ROUNDS));
}

const hashToken = (t) => crypto.createHash('sha256').update(t).digest('hex');

// Returns { token, name, email } only when the email exists; the controller never reveals that to the client.
async function createPasswordReset(email) {
  const user = await userModel.findByEmail(email.toLowerCase());
  if (!user) return null;
  const token = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
  await userModel.setResetToken(user.id, hashToken(token), expires);
  return { token, name: user.name, email: user.email };
}

async function resetPassword({ token, newPassword }) {
  const user = await userModel.findByValidResetToken(hashToken(token));
  if (!user) throw new ApiError(400, 'Reset token is invalid or has expired');
  await userModel.updatePassword(user.id, await bcrypt.hash(newPassword, SALT_ROUNDS));
}

module.exports = { register, login, changePassword, createPasswordReset, resetPassword };

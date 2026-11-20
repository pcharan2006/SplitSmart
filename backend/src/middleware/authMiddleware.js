const jwt = require('jsonwebtoken');
const ApiError = require('../utils/ApiError');
const userModel = require('../models/userModel');

// Protects a route: requires header "Authorization: Bearer <token>".
// On success, attaches the user to req.user.
async function protect(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) throw new ApiError(401, 'Authentication required');

  let payload;
  try {
    // Pin the algorithm: a token must be signed with HS256 and our secret, nothing else is accepted.
    payload = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
  } catch {
    throw new ApiError(401, 'Invalid or expired token');
  }

  // Re-check the user exists, so deleted users' old tokens stop working.
  const user = await userModel.findById(payload.id);
  if (!user) throw new ApiError(401, 'User no longer exists');
  req.user = user;
  next();
}

module.exports = { protect };

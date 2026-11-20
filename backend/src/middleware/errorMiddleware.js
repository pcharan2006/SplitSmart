const ApiError = require('../utils/ApiError');

// Last middleware in the chain: every thrown error ends up here.
// Express 5 forwards errors from async handlers automatically.
function errorHandler(err, req, res, next) {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'Invalid JSON body' });
  }
  if (err.name === 'MulterError') {
    return res.status(400).json({ message: err.message });
  }

  const status = err.status || 500;
  // ApiError messages are written by us on purpose (even 503 "AI unavailable"), so they are safe to show.
  // Anything else that fails with a 5xx is unexpected: log it here, show only a generic message.
  const expected = err instanceof ApiError;
  if (!expected && status >= 500) console.error(err);

  res.status(status).json({
    message: expected || status < 500 ? err.message : 'Internal server error',
    ...(err.details && { errors: err.details }),
  });
}

module.exports = { errorHandler };

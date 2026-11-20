const fs = require('fs');
const { validationResult } = require('express-validator');
const ApiError = require('../utils/ApiError');

// Put this AFTER a list of express-validator rules in a route.
function validate(req, res, next) {
  const result = validationResult(req);
  if (result.isEmpty()) return next();
  // If the request carried an upload, don't leave an orphaned file behind when validation fails.
  if (req.file?.path) fs.promises.unlink(req.file.path).catch(() => {});
  const details = result.array().map((e) => ({ field: e.path, message: e.msg }));
  next(new ApiError(400, details[0].message, details));
}

module.exports = { validate };

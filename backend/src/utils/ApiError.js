// An error that carries an HTTP status code, so services can just `throw new ApiError(404, '...')`
// and the central error handler turns it into a proper response.
class ApiError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

module.exports = ApiError;

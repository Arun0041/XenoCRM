/**
 * Global error handler middleware
 * Catches all unhandled errors and returns consistent JSON responses
 */
function errorHandler(err, req, res, next) {
  console.error('Error:', err.stack || err.message);

  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  res.status(status).json({
    error: message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
}

// Wrapper for async route handlers — catches promise rejections
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = { errorHandler, asyncHandler };

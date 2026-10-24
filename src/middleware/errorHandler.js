/**
 * Centralized error-handling middleware.
 * Formats errors uniformly, avoids leaking sensitive stack traces in production,
 * and handles common runtime / database errors gracefully.
 */
function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  // Handle malformed JSON body errors from express.json()
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      success: false,
      message: 'Invalid JSON payload received. Please verify request syntax.'
    });
  }

  // Handle SQLite Unique Constraint Violations
  if (err.code === 'SQLITE_CONSTRAINT' || err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
    return res.status(409).json({
      success: false,
      message: 'A resource with this identifier or unique attribute already exists.'
    });
  }

  // Handle custom status errors if assigned
  const statusCode = err.statusCode || err.status || 500;
  const isProduction = process.env.NODE_ENV === 'production';

  // Log server errors internally (in non-test environments)
  if (process.env.NODE_ENV !== 'test') {
    console.error(`[Error] ${req.method} ${req.originalUrl}:`, err);
  }

  res.status(statusCode).json({
    success: false,
    message: err.message || 'An unexpected internal server error occurred.',
    ...(isProduction ? {} : { stack: err.stack })
  });
}

/**
 * 404 Route Not Found middleware for unhandled endpoints.
 */
function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    message: `Resource not found: ${req.method} ${req.originalUrl}`
  });
}

module.exports = {
  errorHandler,
  notFoundHandler
};

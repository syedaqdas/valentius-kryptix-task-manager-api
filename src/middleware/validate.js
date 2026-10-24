const { validationResult } = require('express-validator');

/**
 * Middleware that inspects validation results from express-validator.
 * If validation fails, returns a standard 400 Bad Request response
 * with descriptive field-level error messages.
 */
function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map((err) => ({
        field: err.path || err.param,
        message: err.msg
      }))
    });
  }
  next();
}

module.exports = validate;

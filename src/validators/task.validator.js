const { body, param, query } = require('express-validator');

const VALID_STATUSES = ['pending', 'in_progress', 'completed'];

const createTaskValidator = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Title is required and cannot be empty')
    .isLength({ max: 200 })
    .withMessage('Title cannot exceed 200 characters'),

  body('description')
    .optional({ nullable: true })
    .isString()
    .withMessage('Description must be a string')
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description cannot exceed 1000 characters'),

  body('status')
    .optional()
    .isIn(VALID_STATUSES)
    .withMessage(`Status must be one of: ${VALID_STATUSES.join(', ')}`),

  body('dueDate')
    .optional({ nullable: true })
    .custom((val) => {
      if (val === null || val === '') return true;
      const parsedDate = Date.parse(val);
      if (isNaN(parsedDate)) {
        throw new Error('dueDate must be a valid ISO 8601 date string (e.g., 2026-12-31 or 2026-12-31T18:00:00Z)');
      }
      return true;
    })
];

const updateTaskValidator = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Task ID must be a positive integer'),

  body('title')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Title cannot be empty')
    .isLength({ max: 200 })
    .withMessage('Title cannot exceed 200 characters'),

  body('description')
    .optional({ nullable: true })
    .isString()
    .withMessage('Description must be a string')
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description cannot exceed 1000 characters'),

  body('status')
    .optional()
    .isIn(VALID_STATUSES)
    .withMessage(`Status must be one of: ${VALID_STATUSES.join(', ')}`),

  body('dueDate')
    .optional({ nullable: true })
    .custom((val) => {
      if (val === null || val === '') return true;
      const parsedDate = Date.parse(val);
      if (isNaN(parsedDate)) {
        throw new Error('dueDate must be a valid ISO 8601 date string or null');
      }
      return true;
    }),

  // Validate that request body has at least one valid field to update and no unknown fields
  body().custom((value, { req }) => {
    const allowedKeys = ['title', 'description', 'status', 'dueDate'];
    const bodyKeys = Object.keys(req.body || {});

    // Check for empty updates
    if (bodyKeys.length === 0) {
      throw new Error('Update payload cannot be empty. Provide at least one field to update: title, description, status, or dueDate');
    }

    // Reject invalid/unknown fields
    const invalidKeys = bodyKeys.filter((k) => !allowedKeys.includes(k));
    if (invalidKeys.length > 0) {
      throw new Error(`Invalid fields present in update: ${invalidKeys.join(', ')}. Only allowed: ${allowedKeys.join(', ')}`);
    }

    return true;
  })
];

const taskIdParamValidator = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Task ID must be a positive integer')
];

const listTasksQueryValidator = [
  query('status')
    .optional()
    .isIn(VALID_STATUSES)
    .withMessage(`Status filter must be one of: ${VALID_STATUSES.join(', ')}`)
];

module.exports = {
  createTaskValidator,
  updateTaskValidator,
  taskIdParamValidator,
  listTasksQueryValidator,
  VALID_STATUSES
};

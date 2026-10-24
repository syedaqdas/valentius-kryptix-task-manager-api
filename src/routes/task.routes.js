const express = require('express');
const router = express.Router();

const TaskController = require('../controllers/task.controller');
const authenticate = require('../middleware/authenticate');
const validate = require('../middleware/validate');
const {
  createTaskValidator,
  updateTaskValidator,
  taskIdParamValidator,
  listTasksQueryValidator
} = require('../validators/task.validator');

// All task routes require JWT authentication
router.use(authenticate);

/**
 * @route   POST /api/tasks
 * @desc    Create a new task
 * @access  Private
 */
router.post('/', createTaskValidator, validate, TaskController.createTask);

/**
 * @route   GET /api/tasks
 * @desc    Get all tasks belonging to authenticated user
 * @access  Private
 */
router.get('/', listTasksQueryValidator, validate, TaskController.getTasks);

/**
 * @route   GET /api/tasks/:id
 * @desc    Get a single task by ID
 * @access  Private
 */
router.get('/:id', taskIdParamValidator, validate, TaskController.getTaskById);

/**
 * @route   PUT /api/tasks/:id
 * @desc    Update a task by ID
 * @access  Private
 */
router.put('/:id', updateTaskValidator, validate, TaskController.updateTask);

/**
 * @route   DELETE /api/tasks/:id
 * @desc    Delete a task by ID
 * @access  Private
 */
router.delete('/:id', taskIdParamValidator, validate, TaskController.deleteTask);

module.exports = router;

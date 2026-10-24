const TaskModel = require('../models/task.model');

const TaskController = {
  /**
   * Create a new task for the authenticated user.
   */
  async createTask(req, res, next) {
    try {
      const { title, description, status, dueDate } = req.body;
      const userId = req.user.id;

      const task = await TaskModel.create({
        userId,
        title,
        description,
        status: status || 'pending',
        dueDate: dueDate || null
      });

      return res.status(201).json({
        success: true,
        message: 'Task created successfully.',
        data: {
          task
        }
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get all tasks belonging to the authenticated user.
   * Supports optional status filtering via query param (?status=pending).
   */
  async getTasks(req, res, next) {
    try {
      const userId = req.user.id;
      const { status } = req.query;

      const filter = {};
      if (status) {
        filter.status = status;
      }

      const tasks = await TaskModel.findAllByUserId(userId, filter);

      return res.status(200).json({
        success: true,
        count: tasks.length,
        data: {
          tasks
        }
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get a single task by ID belonging to the authenticated user.
   * Returns 404 if the task doesn't exist or belongs to another user.
   */
  async getTaskById(req, res, next) {
    try {
      const taskId = parseInt(req.params.id, 10);
      const userId = req.user.id;

      const task = await TaskModel.findByIdAndUserId(taskId, userId);
      if (!task) {
        return res.status(404).json({
          success: false,
          message: 'Task not found.'
        });
      }

      return res.status(200).json({
        success: true,
        data: {
          task
        }
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Update an existing task belonging to the authenticated user.
   * Rejects empty updates and returns 404 if not found or unauthorized.
   */
  async updateTask(req, res, next) {
    try {
      const taskId = parseInt(req.params.id, 10);
      const userId = req.user.id;

      // Check task existence and ownership first
      const existingTask = await TaskModel.findByIdAndUserId(taskId, userId);
      if (!existingTask) {
        return res.status(404).json({
          success: false,
          message: 'Task not found.'
        });
      }

      // Map request body keys to database column names
      const updates = {};
      if (req.body.title !== undefined) updates.title = req.body.title.trim();
      if (req.body.description !== undefined) {
        updates.description = req.body.description !== null ? req.body.description.trim() : null;
      }
      if (req.body.status !== undefined) updates.status = req.body.status;
      if (req.body.dueDate !== undefined) updates.due_date = req.body.dueDate || null;

      const updatedTask = await TaskModel.update(taskId, userId, updates);

      return res.status(200).json({
        success: true,
        message: 'Task updated successfully.',
        data: {
          task: updatedTask
        }
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Delete a task belonging to the authenticated user.
   * Returns 404 if not found or unauthorized.
   */
  async deleteTask(req, res, next) {
    try {
      const taskId = parseInt(req.params.id, 10);
      const userId = req.user.id;

      const deleted = await TaskModel.delete(taskId, userId);
      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: 'Task not found.'
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Task deleted successfully.'
      });
    } catch (error) {
      next(error);
    }
  }
};

module.exports = TaskController;

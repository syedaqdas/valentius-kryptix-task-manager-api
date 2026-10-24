const { runQuery, getOne, getAll } = require('../config/database');

const TaskModel = {
  /**
   * Create a new task belonging to a specific user.
   * @param {Object} data
   * @param {number} data.userId
   * @param {string} data.title
   * @param {string|null} [data.description]
   * @param {string} [data.status]
   * @param {string|null} [data.dueDate]
   * @returns {Promise<Object>} Created task record
   */
  async create({ userId, title, description = null, status = 'pending', dueDate = null }) {
    const sql = `
      INSERT INTO tasks (user_id, title, description, status, due_date)
      VALUES (?, ?, ?, ?, ?)
    `;
    const result = await runQuery(sql, [
      userId,
      title.trim(),
      description !== undefined && description !== null ? description.trim() : null,
      status || 'pending',
      dueDate || null
    ]);

    return this.findByIdAndUserId(result.id, userId);
  },

  /**
   * Find all tasks belonging to a specific user, with optional status filter.
   * Enforces user ownership at query level.
   * @param {number} userId
   * @param {Object} [filter]
   * @param {string} [filter.status]
   * @returns {Promise<Array>} List of tasks
   */
  async findAllByUserId(userId, filter = {}) {
    let sql = `
      SELECT id, user_id, title, description, status, due_date, created_at, updated_at
      FROM tasks
      WHERE user_id = ?
    `;
    const params = [userId];

    if (filter.status) {
      sql += ` AND status = ?`;
      params.push(filter.status);
    }

    sql += ` ORDER BY created_at DESC`;

    return getAll(sql, params);
  },

  /**
   * Find a specific task by id and user_id.
   * Strictly enforces user ownership.
   * @param {number} id
   * @param {number} userId
   * @returns {Promise<Object|null>} Task or null
   */
  async findByIdAndUserId(id, userId) {
    const sql = `
      SELECT id, user_id, title, description, status, due_date, created_at, updated_at
      FROM tasks
      WHERE id = ? AND user_id = ?
    `;
    return getOne(sql, [id, userId]);
  },

  /**
   * Update a task belonging to a user.
   * Dynamic column update ensuring only allowed fields are touched.
   * @param {number} id
   * @param {number} userId
   * @param {Object} updates
   * @returns {Promise<Object|null>} Updated task or null
   */
  async update(id, userId, updates) {
    const allowedKeys = ['title', 'description', 'status', 'due_date'];
    const setClauses = [];
    const params = [];

    for (const key of allowedKeys) {
      if (Object.prototype.hasOwnProperty.call(updates, key)) {
        setClauses.push(`${key} = ?`);
        params.push(updates[key]);
      }
    }

    if (setClauses.length === 0) {
      return null;
    }

    setClauses.push(`updated_at = CURRENT_TIMESTAMP`);

    const sql = `
      UPDATE tasks
      SET ${setClauses.join(', ')}
      WHERE id = ? AND user_id = ?
    `;
    params.push(id, userId);

    const result = await runQuery(sql, params);
    if (result.changes === 0) {
      return null;
    }

    return this.findByIdAndUserId(id, userId);
  },

  /**
   * Delete a task belonging to a user.
   * Strictly enforces user ownership.
   * @param {number} id
   * @param {number} userId
   * @returns {Promise<boolean>} True if task was deleted, false otherwise
   */
  async delete(id, userId) {
    const sql = `
      DELETE FROM tasks
      WHERE id = ? AND user_id = ?
    `;
    const result = await runQuery(sql, [id, userId]);
    return result.changes > 0;
  }
};

module.exports = TaskModel;

const { runQuery, getOne } = require('../config/database');

const UserModel = {
  /**
   * Find a user by email, including the password_hash for authentication verification.
   * @param {string} email
   * @returns {Promise<Object|null>}
   */
  async findByEmailWithPassword(email) {
    const sql = `
      SELECT id, name, email, password_hash, created_at
      FROM users
      WHERE email = ?
    `;
    return getOne(sql, [email.toLowerCase().trim()]);
  },

  /**
   * Find a user by email, excluding password hash (safe profile).
   * @param {string} email
   * @returns {Promise<Object|null>}
   */
  async findByEmail(email) {
    const sql = `
      SELECT id, name, email, created_at
      FROM users
      WHERE email = ?
    `;
    return getOne(sql, [email.toLowerCase().trim()]);
  },

  /**
   * Find a user by their primary key id.
   * @param {number} id
   * @returns {Promise<Object|null>}
   */
  async findById(id) {
    const sql = `
      SELECT id, name, email, created_at
      FROM users
      WHERE id = ?
    `;
    return getOne(sql, [id]);
  },

  /**
   * Create a new user with hashed password.
   * @param {Object} userData
   * @param {string} userData.name
   * @param {string} userData.email
   * @param {string} userData.passwordHash
   * @returns {Promise<Object>} Safe user object without password_hash
   */
  async create({ name, email, passwordHash }) {
    const normalizedEmail = email.toLowerCase().trim();
    const normalizedName = name.trim();

    const sql = `
      INSERT INTO users (name, email, password_hash)
      VALUES (?, ?, ?)
    `;
    const result = await runQuery(sql, [normalizedName, normalizedEmail, passwordHash]);
    return {
      id: result.id,
      name: normalizedName,
      email: normalizedEmail
    };
  }
};

module.exports = UserModel;

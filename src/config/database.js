const path = require('path');
const fs = require('fs');

let dbInstance = null;
let engine = null; // 'node:sqlite' or 'sqlite3'

/**
 * Returns the database file path based on the environment.
 * For testing, defaults to an in-memory database to isolate test data.
 */
function getDbPath() {
  if (process.env.NODE_ENV === 'test') {
    return process.env.TEST_DB_PATH || ':memory:';
  }
  return process.env.DB_PATH || path.resolve(__dirname, '../../data/tasks.db');
}

/**
 * Opens or returns an existing SQLite database connection.
 * Seamlessly leverages Node.js built-in 'node:sqlite' (Node 22+)
 * with automatic fallback to 'sqlite3' if run on older environments.
 * @param {string} [customPath] - Optional custom path for connection (e.g., testing).
 * @returns {Promise<Object>}
 */
function getDatabase(customPath) {
  if (dbInstance) {
    return Promise.resolve(dbInstance);
  }

  const targetPath = customPath || getDbPath();

  // Ensure directory exists if using a physical file path
  if (targetPath !== ':memory:') {
    const dir = path.dirname(targetPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  // Attempt to use built-in node:sqlite (Node.js 22+)
  try {
    const { DatabaseSync } = require('node:sqlite');
    const db = new DatabaseSync(targetPath);
    db.exec('PRAGMA foreign_keys = ON;');
    dbInstance = db;
    engine = 'node:sqlite';
    return Promise.resolve(dbInstance);
  } catch (err) {
    // Fallback to sqlite3 driver if node:sqlite is unavailable
    const sqlite3 = require('sqlite3').verbose();
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(targetPath, (openErr) => {
        if (openErr) return reject(openErr);
        db.run('PRAGMA foreign_keys = ON;', (pragmaErr) => {
          if (pragmaErr) return reject(pragmaErr);
          dbInstance = db;
          engine = 'sqlite3';
          resolve(dbInstance);
        });
      });
    });
  }
}

/**
 * Promisified query execution for INSERT, UPDATE, DELETE queries.
 * Returns { id: lastInsertRowid, changes: changesCount }
 */
async function runQuery(sql, params = []) {
  const db = await getDatabase();
  if (engine === 'node:sqlite') {
    const stmt = db.prepare(sql);
    const result = stmt.run(...params);
    return {
      id: result.lastInsertRowid !== undefined ? Number(result.lastInsertRowid) : 0,
      changes: result.changes || 0
    };
  }

  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve({ id: this.lastID, changes: this.changes });
    });
  });
}

/**
 * Promisified query execution for fetching a single record.
 */
async function getOne(sql, params = []) {
  const db = await getDatabase();
  if (engine === 'node:sqlite') {
    const stmt = db.prepare(sql);
    const row = stmt.get(...params);
    return row ? { ...row } : null;
  }

  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row || null);
    });
  });
}

/**
 * Promisified query execution for fetching multiple records.
 */
async function getAll(sql, params = []) {
  const db = await getDatabase();
  if (engine === 'node:sqlite') {
    const stmt = db.prepare(sql);
    const rows = stmt.all(...params);
    return rows.map((r) => ({ ...r }));
  }

  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows || []);
    });
  });
}

/**
 * Promisified execution for multi-statement DDL/SQL schemas.
 */
async function execSql(sql) {
  const db = await getDatabase();
  if (engine === 'node:sqlite') {
    db.exec(sql);
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    db.exec(sql, (err) => {
      if (err) return reject(err);
      resolve();
    });
  });
}

/**
 * Initializes database tables and indexes if they do not exist.
 */
async function initDatabase() {
  const schema = `
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE COLLATE NOCASE,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'in_progress', 'completed')),
      due_date DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email);
  `;

  await execSql(schema);
}

/**
 * Closes the active database connection. Useful for tests and clean shutdown.
 */
function closeDatabase() {
  return new Promise((resolve, reject) => {
    if (!dbInstance) {
      return resolve();
    }

    if (engine === 'node:sqlite') {
      try {
        dbInstance.close();
        dbInstance = null;
        engine = null;
        return resolve();
      } catch (err) {
        return reject(err);
      }
    }

    dbInstance.close((err) => {
      if (err) {
        return reject(err);
      }
      dbInstance = null;
      engine = null;
      resolve();
    });
  });
}

module.exports = {
  getDatabase,
  runQuery,
  getOne,
  getAll,
  execSql,
  initDatabase,
  closeDatabase,
  getDbPath
};

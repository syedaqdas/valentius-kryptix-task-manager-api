require('dotenv').config();
const app = require('./app');
const { initDatabase, closeDatabase, getDbPath } = require('./config/database');

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    // Initialize SQLite database and ensure required tables and indexes exist
    await initDatabase();
    console.log(`[Database] SQLite database initialized successfully at: ${getDbPath()}`);

    const server = app.listen(PORT, () => {
      console.log(`====================================================`);
      console.log(`🚀 Task Manager REST API Server is running!`);
      console.log(`📍 Local URL:     http://localhost:${PORT}`);
      console.log(`🏥 Health Check:  http://localhost:${PORT}/api/health`);
      console.log(`🔒 Authentication: /api/auth/register | /api/auth/login`);
      console.log(`📋 Tasks:          /api/tasks`);
      console.log(`🌐 Environment:    ${process.env.NODE_ENV || 'development'}`);
      console.log(`====================================================`);
    });

    // Graceful shutdown handling
    const handleShutdown = async (signal) => {
      console.log(`\n[Server] Received ${signal}. Commencing graceful shutdown...`);
      server.close(async () => {
        console.log('[Server] HTTP server closed.');
        try {
          await closeDatabase();
          console.log('[Database] Database connection closed.');
          process.exit(0);
        } catch (dbErr) {
          console.error('[Database] Error closing database:', dbErr);
          process.exit(1);
        }
      });
    };

    process.on('SIGINT', () => handleShutdown('SIGINT'));
    process.on('SIGTERM', () => handleShutdown('SIGTERM'));

  } catch (error) {
    console.error('[Server] Failed to initialize and start server:', error);
    process.exit(1);
  }
}

if (process.env.NODE_ENV !== 'test') {
  startServer();
}

module.exports = startServer;

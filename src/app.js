const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/auth.routes');
const taskRoutes = require('./routes/task.routes');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

const app = express();

// Enable Cross-Origin Resource Sharing
app.use(cors());

// Parse incoming JSON request bodies
app.use(express.json());

// Parse URL-encoded query/body data
app.use(express.urlencoded({ extended: true }));

/**
 * Health Check Endpoint
 * Confirms API service availability without requiring authentication.
 */
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    status: 'ok',
    message: 'Task Manager REST API is running smoothly',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

app.get('/health', (req, res) => {
  res.redirect('/api/health');
});

// Root welcome route
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Welcome to Valentius Kryptix WA-2 Task Manager REST API',
    version: '1.0.0',
    documentation: '/api/health'
  });
});

// Mount modular API route handlers
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);

// Handle 404 for unknown endpoints
app.use(notFoundHandler);

// Centralized error-handling middleware
app.use(errorHandler);

module.exports = app;

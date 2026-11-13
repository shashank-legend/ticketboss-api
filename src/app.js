require('dotenv').config();
const path = require('path');
const express = require('express');
const routes = require('./routes');
const pool = require('./config/database');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

const app = express();

// Behind a proxy on most hosts (Render, Railway, Fly...)
app.set('trust proxy', 1);

// Middleware for parsing JSON and URL-encoded data
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging (skip in tests to keep output readable)
if (process.env.NODE_ENV !== 'test') {
  app.use((req, res, next) => {
    if (req.path.startsWith('/api') || req.path === '/health') {
      console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
    }
    next();
  });
}

// Health check endpoint (also verifies the database is reachable)
app.get('/health', async (req, res) => {
  let database = 'OK';
  try {
    await pool.query('SELECT 1');
  } catch (error) {
    database = 'UNAVAILABLE';
  }
  res.status(database === 'OK' ? 200 : 503).json({
    status: database === 'OK' ? 'OK' : 'DEGRADED',
    database,
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API routes
app.use('/api', routes);

// Web UI
app.use(express.static(path.join(__dirname, '..', 'public'), { extensions: ['html'] }));

// 404 handler (must be after all routes)
app.use(notFoundHandler);

// Error handler (must be last)
app.use(errorHandler);

module.exports = app;

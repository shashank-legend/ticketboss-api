const { Pool } = require('pg');
require('dotenv').config();

// Create PostgreSQL connection pool
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'ticketboss',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  max: 20, // Maximum number of connections in the pool
  idleTimeoutMillis: 30000, // Close idle connections after 30 seconds
  connectionTimeoutMillis: 5000, // Fail after 5 seconds if no connection available
});

// Event handlers for connection pool
pool.on('connect', () => {
  console.log('✓ Database connection established');
});

pool.on('error', (err) => {
  console.error('Unexpected database error:', err);
  // Don't exit in test environment
  if (process.env.NODE_ENV !== 'test') {
    process.exit(-1);
  }
});

// Test database connection on startup (only in non-test environment)
if (process.env.NODE_ENV !== 'test') {
  pool.query('SELECT NOW()', (err, res) => {
    if (err) {
      console.error('✗ Database connection failed:', err.message);
    } else {
      console.log('✓ Database connection test successful');
    }
  });
}

module.exports = pool;

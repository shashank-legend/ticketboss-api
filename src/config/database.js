const { Pool } = require('pg');
require('dotenv').config();

// Hosted providers (Render, Railway, Neon, Supabase...) give a single DATABASE_URL.
// Locally, the individual DB_* variables are used instead.
const useSsl =
  process.env.DB_SSL === 'true' ||
  (process.env.DB_SSL !== 'false' && process.env.NODE_ENV === 'production' && !!process.env.DATABASE_URL);

const connection = process.env.DATABASE_URL
  ? { connectionString: process.env.DATABASE_URL }
  : {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'ticketboss',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD,
    };

const pool = new Pool({
  ...connection,
  ssl: useSsl ? { rejectUnauthorized: false } : undefined,
  max: Number(process.env.DB_POOL_MAX) || 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('Unexpected database error:', err);
  if (process.env.NODE_ENV !== 'test') {
    process.exit(-1);
  }
});

module.exports = pool;

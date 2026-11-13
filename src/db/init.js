const fs = require('fs');
const path = require('path');
const pool = require('../config/database');

/**
 * Create tables/indexes and seed the default event if missing.
 * Idempotent, so it runs on every server start.
 */
async function initDb() {
  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  await pool.query(sql);
}

module.exports = initDb;

// Allow `npm run db:init`
if (require.main === module) {
  initDb()
    .then(() => {
      console.log('✓ Database schema ready');
      return pool.end();
    })
    .catch((err) => {
      console.error('✗ Database init failed:', err.message);
      process.exit(1);
    });
}

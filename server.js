const app = require('./src/app');
const pool = require('./src/config/database');
const initDb = require('./src/db/init');

const PORT = process.env.PORT || 3000;
let server;

async function start() {
  try {
    await initDb();
    console.log('✓ Database connected and schema ready');
  } catch (error) {
    console.error('✗ Database initialisation failed:', error.message);
    process.exit(1);
  }

  server = app.listen(PORT, () => {
    console.log('=================================');
    console.log('🚀 TicketBoss Server Running');
    console.log(`📍 http://localhost:${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log('=================================');
  });
}

const gracefulShutdown = (signal) => {
  console.log(`\n${signal} received. Starting graceful shutdown...`);
  setTimeout(() => {
    console.error('✗ Forced shutdown after timeout');
    process.exit(1);
  }, 10000).unref();

  const closeDb = async () => {
    try {
      await pool.end();
      console.log('✓ Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      console.error('✗ Error during shutdown:', error);
      process.exit(1);
    }
  };

  if (server) server.close(closeDb);
  else closeDb();
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
  gracefulShutdown('UNHANDLED_REJECTION');
});

start();

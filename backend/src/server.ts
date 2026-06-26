/**
 * server.ts - Application Entry Point
 *
 * Sequence:
 *  1. Load .env
 *  2. Validate config
 *  3. Connect to MongoDB
 *  4. Create Express app
 *  5. Start HTTP server
 *  6. Register graceful-shutdown handlers
 */
import 'dotenv/config';
import { validateConfig } from './config/app.config';
import { connectDatabase } from './config/database';
import { createApp }       from './app';
import { logger }          from './utils/logger';

const PORT = parseInt(process.env.PORT ?? '3000', 10);

(async () => {
  try {
    validateConfig();

    await connectDatabase();

    const app    = createApp();
    const server = app.listen(PORT, () => {
      logger.info(`🚀  LifeVault API running on http://localhost:${PORT}/api/v1`);
      logger.info(`📝  Environment: ${process.env.NODE_ENV ?? 'development'}`);
    });

    const shutdown = (signal: string) => {
      logger.info(`${signal} — shutting down gracefully…`);
      server.close(() => {
        logger.info('HTTP server closed');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT',  () => shutdown('SIGINT'));

    process.on('unhandledRejection', (reason) => {
      const err = reason instanceof Error ? reason : new Error(String(reason));
      logger.error('Unhandled rejection', {
        name:    err.name,
        message: err.message,
        stack:   err.stack,
      });
      process.exit(1);
    });

    process.on('uncaughtException', (err) => {
      logger.error('Uncaught exception', {
        name:    err.name,
        message: err.message,
        stack:   err.stack,
      });
      process.exit(1);
    });

  } catch (err) {
    logger.error('Failed to start server:', err);
    process.exit(1);
  }
})();

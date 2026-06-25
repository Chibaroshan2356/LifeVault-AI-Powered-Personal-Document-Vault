/**
 * server.ts - Application Entry Point
 *
 * Purpose: Bootstraps the Express application, connects to MongoDB,
 * and starts listening for incoming HTTP requests.
 *
 * Responsibilities:
 *  1. Load environment variables
 *  2. Create the Express app via app.ts
 *  3. Connect to MongoDB
 *  4. Start the HTTP server
 *  5. Handle graceful shutdown
 *
 * Design Decision:
 *  - Separation of app creation (app.ts) and server startup (server.ts)
 *  - This allows importing the app in tests without starting the server
 */

import 'dotenv/config';          // Load .env file variables into process.env
import { createApp } from './app';
import { connectDatabase } from './config/database';
import { logger } from './utils/logger';

/**
 * Port to listen on.
 * Reads from environment variable with fallback to 3000.
 */
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

/**
 * Main bootstrap function.
 * Using async IIFE pattern to use await at top level.
 */
(async (): Promise<void> => {
  try {
    // Step 1: Connect to MongoDB before starting the server.
    // If DB connection fails, we don't want to serve requests.
    await connectDatabase();
    logger.info('✅ Database connected successfully');

    // Step 2: Create the Express application with all middleware and routes.
    const app = createApp();

    // Step 3: Start listening for HTTP requests.
    const server = app.listen(PORT, () => {
      logger.info(`🚀 LifeVault Backend running on http://localhost:${PORT}`);
      logger.info(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`🔗 API Base URL: http://localhost:${PORT}/api`);
    });

    // Step 4: Graceful shutdown handlers.
    // When the process receives a shutdown signal, close open connections cleanly.
    const gracefulShutdown = async (signal: string): Promise<void> => {
      logger.info(`\n⚠️  ${signal} received. Starting graceful shutdown...`);
      server.close(() => {
        logger.info('✅ HTTP server closed');
        process.exit(0);
      });
    };

    // Handle process termination signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle unhandled promise rejections - log and exit
    process.on('unhandledRejection', (reason: unknown) => {
      logger.error('❌ Unhandled Promise Rejection:', reason);
      process.exit(1);
    });

    // Handle uncaught exceptions - log and exit
    process.on('uncaughtException', (error: Error) => {
      logger.error('❌ Uncaught Exception:', error.message);
      process.exit(1);
    });
  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
})();

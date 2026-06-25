/**
 * database.ts - MongoDB Connection Configuration
 *
 * Purpose: Establishes and manages the MongoDB connection using Mongoose.
 *
 * Design Decisions:
 *  - Centralized connection logic in a dedicated file
 *  - Connection string from environment variables (never hardcoded)
 *  - Mongoose event listeners for connection state monitoring
 *  - Returns a promise for use with async/await in server.ts
 *
 * Mongoose Options:
 *  - bufferCommands: false - Fail fast if not connected (better than buffering)
 *  - autoIndex: false in production - Build indexes manually for performance
 */

import mongoose from 'mongoose';
import { logger } from '../utils/logger';

/**
 * Establishes a connection to MongoDB.
 *
 * @returns Promise that resolves when connection is established
 * @throws Error if connection string is missing or connection fails
 */
export const connectDatabase = async (): Promise<void> => {
  const mongoUri = process.env.MONGODB_URI;

  // Validate that the connection string is configured
  if (!mongoUri) {
    throw new Error(
      'MONGODB_URI environment variable is not set. ' +
      'Please configure your .env file.'
    );
  }

  try {
    await mongoose.connect(mongoUri, {
      /**
       * bufferCommands: false
       * Disable Mongoose's command buffering.
       * If the app tries to use the DB before connecting, it will fail immediately
       * rather than buffering the command - makes issues easier to detect.
       */
      bufferCommands: false,

      /**
       * autoIndex: true in development (helps during development)
       * Set to false in production to prevent performance issues on large collections.
       * Build indexes manually in production using migration scripts.
       */
      autoIndex: process.env.NODE_ENV !== 'production',
    });

    logger.info(`📦 MongoDB connected: ${mongoose.connection.host}`);
    logger.info(`🗄️  Database name: ${mongoose.connection.name}`);
  } catch (error) {
    logger.error('❌ MongoDB connection failed:', error);
    throw error; // Re-throw to prevent server from starting without DB
  }
};

/**
 * Gracefully closes the MongoDB connection.
 * Called during application shutdown.
 */
export const disconnectDatabase = async (): Promise<void> => {
  try {
    await mongoose.disconnect();
    logger.info('📦 MongoDB disconnected');
  } catch (error) {
    logger.error('❌ Error disconnecting from MongoDB:', error);
  }
};

// ============================================================
// Mongoose Connection Event Listeners
// ============================================================

/**
 * Connection error handler.
 * Logs errors that occur after the initial connection is established.
 */
mongoose.connection.on('error', (error: Error) => {
  logger.error('❌ MongoDB connection error:', error.message);
});

/**
 * Disconnection handler.
 * Logs when MongoDB connection is lost.
 */
mongoose.connection.on('disconnected', () => {
  logger.warn('⚠️  MongoDB disconnected');
});

/**
 * Reconnection handler.
 * Logs when MongoDB reconnects after a disconnection.
 */
mongoose.connection.on('reconnected', () => {
  logger.info('✅ MongoDB reconnected');
});

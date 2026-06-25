/**
 * database.ts - MongoDB Connection
 *
 * Establishes and monitors the Mongoose connection.
 * Called once in server.ts before the HTTP server starts.
 */
import mongoose from 'mongoose';
import { logger } from '../utils/logger';

export const connectDatabase = async (): Promise<void> => {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error('MONGODB_URI is not set in environment variables.');
  }

  await mongoose.connect(uri, {
    bufferCommands: false,
    autoIndex: process.env.NODE_ENV !== 'production',
  });

  logger.info(`MongoDB connected → ${mongoose.connection.host}/${mongoose.connection.name}`);
};

// Log post-connect events
mongoose.connection.on('error',       (err) => logger.error('MongoDB error:', err));
mongoose.connection.on('disconnected', ()  => logger.warn('MongoDB disconnected'));
mongoose.connection.on('reconnected',  ()  => logger.info('MongoDB reconnected'));

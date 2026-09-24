import mongoose from 'mongoose';
import { config } from './env.js';

let isConnected = false;

function sanitizeMongoUri(uri: string): string {
  try {
    return uri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@');
  } catch {
    return 'mongodb://[protected]';
  }
}

export async function connectDatabase(): Promise<boolean> {
  if (isConnected) return true;

  try {
    mongoose.set('strictQuery', true);
    await mongoose.connect(config.mongoUri, {
      serverSelectionTimeoutMS: 5000,
    });
    isConnected = true;
    console.log(`[Database] Connected to MongoDB at ${sanitizeMongoUri(config.mongoUri)}`);
    return true;
  } catch (err: unknown) {
    console.warn(
      `[Database] MongoDB not available (${err instanceof Error ? err.message : String(err)}). Falling back to resilient in-memory datastore.`
    );
    isConnected = false;
    return false;
  }
}

export async function disconnectDatabase(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    try {
      await mongoose.disconnect();
      isConnected = false;
      console.log('[Database] MongoDB connection closed');
    } catch (err) {
      console.error('[Database] Error closing MongoDB connection:', err);
    }
  }
}

export function isDbConnected(): boolean {
  return isConnected;
}


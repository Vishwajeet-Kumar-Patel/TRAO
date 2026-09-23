import mongoose from 'mongoose';
import { config } from './env.js';

let isConnected = false;

export async function connectDatabase(): Promise<boolean> {
  if (isConnected) return true;

  try {
    mongoose.set('strictQuery', true);
    await mongoose.connect(config.mongoUri, {
      serverSelectionTimeoutMS: 2000,
    });
    isConnected = true;
    console.log(`[Database] Connected to MongoDB at ${config.mongoUri}`);
    return true;
  } catch (err: unknown) {
    console.warn(
      `[Database] MongoDB not available (${err instanceof Error ? err.message : String(err)}). Falling back to resilient in-memory datastore.`
    );
    isConnected = false;
    return false;
  }
}

export function isDbConnected(): boolean {
  return isConnected;
}

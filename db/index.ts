import 'dotenv/config';
import mongoose from 'mongoose';

const uri = process.env.DB_URI || '';
const dbName = process.env.DB_NAME || 'data';

export async function connectDB(): Promise<void> {
  if (mongoose.connection.readyState === 1) return;
  if (!uri) throw new Error('DB_URI environment variable is required');

  await mongoose.connect(uri, {
    dbName,
    serverSelectionTimeoutMS: 10_000,
    connectTimeoutMS: 10_000,
    socketTimeoutMS: 45_000,
    maxPoolSize: 20,
    minPoolSize: 2,
    maxIdleTimeMS: 30_000,
    retryWrites: true,
  });
  console.info('[database] MongoDB connected', { database: mongoose.connection.name });
}

export function isDBConnected(): boolean {
  return mongoose.connection.readyState === 1;
}

mongoose.connection.on('error', (error) => {
  console.error('[database] MongoDB connection error', error);
});

mongoose.connection.on('disconnected', () => {
  console.warn('[database] MongoDB disconnected');
});

export { mongoose };

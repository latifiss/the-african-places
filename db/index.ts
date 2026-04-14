import 'dotenv/config';
import mongoose from 'mongoose';

const uri = process.env.DB_URI || "";
let isConnected = false;

async function connectDB() {
  if (mongoose.connection.readyState === 1) {
    console.log('⚙️  MongoDB already connected');
    return;
  }

  try {
    await mongoose.connect(uri, {
      dbName: 'mrm',
    });

    isConnected = true;
    console.log('✅ MongoDB connection successful');
  } catch (err: unknown) {
    const error = err as Error;
    console.error('❌ MongoDB connection failed:', error.message);
    isConnected = false;
    throw err;
  }
}

function isDBConnected() {
  return mongoose.connection.readyState === 1;
}

mongoose.connection.on('connected', () => {
  isConnected = true;
  console.log('🟢 Mongoose connected to DB');
});

mongoose.connection.on('error', (err) => {
  console.error('🔴 Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  isConnected = false;
  console.log('🟡 Mongoose disconnected');
});

export { connectDB, isDBConnected, mongoose };

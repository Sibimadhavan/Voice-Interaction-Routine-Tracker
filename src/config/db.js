import mongoose from 'mongoose';
import { createClient } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

const mongoUrl = process.env.MONGO_URL || 'mongodb://admin:password123@localhost:27017/routine_tracker_db?authSource=admin';
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

export const connectMongo = async () => {
  try {
    await mongoose.connect(mongoUrl);
    console.log('Connected to MongoDB successfully');
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    process.exit(1);
  }
};

export const redisClient = createClient({ url: redisUrl });

redisClient.on('error', (err) => console.error('Redis Client Error', err));

export const connectRedis = async () => {
  try {
    await redisClient.connect();
    console.log('Connected to Redis successfully');
  } catch (error) {
    console.error('Failed to connect to Redis:', error);
    process.exit(1);
  }
};

import mongoose, { ConnectOptions } from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables from the .env file
dotenv.config();

async function connectToDB() {
  const mongoUri = process.env.MONGO_URI as string;

  await mongoose
    .connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      heartbeatFrequencyMS: 3000,
      serverSelectionTimeoutMS: 30000,
      ssl: true,
    } as ConnectOptions)
    .then((res) => {
      console.log('Connected to MongoDB');
    })
    .catch((err) => {
      console.log(`Initial Distribution API Database connection error occurred -`, err);
    });
}

export default connectToDB;

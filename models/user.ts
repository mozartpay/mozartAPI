import mongoose from 'mongoose';

interface UserDoc extends mongoose.Document {
  email: string;
  password: string;
  name: string;
  image: string;
  bio: string;
  balance: string;
  resetToken:string;
  resetTokenExpiration: Date;
  token:string;
  number:string;
  verificationCode:string;
  createdAt: Date;
}

const userSchema = new mongoose.Schema<UserDoc>({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, required: false },
  image: { type: String },
  bio: { type: String },
  balance: { type: String },
  resetToken: { type: String},
  resetTokenExpiration: {type: Date},
  token: String,
  number: String,
  verificationCode: String,
  createdAt: { type: Date, default: Date.now }
});

export const User = mongoose.model<UserDoc>('User', userSchema);

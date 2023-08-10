import mongoose from 'mongoose';

interface UserDoc extends mongoose.Document {
  email: string;
  password: string;
  name: string;
  image: string;
  bio: string;
  resetToken:string;
  resetTokenExpiration: Date;
  token:string;
}

const userSchema = new mongoose.Schema<UserDoc>({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, required: false },
  image: { type: String },
  bio: { type: String },
  resetToken: { type: String},
  resetTokenExpiration: {type: Date},
  token: String,
});

export const User = mongoose.model<UserDoc>('User', userSchema);

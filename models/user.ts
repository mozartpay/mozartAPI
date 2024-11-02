import mongoose from 'mongoose';

interface UserDoc extends mongoose.Document {
  email: string;
  password: string;
  name: string;
  image: string;
  bio: string;
  publicKeyXlm: string;
  privateKeyXlm: string;
  balance: string;
  balanceUsd: string;
  balanceEur: string;
  balanceCop: string;
  balanceBtc: string;
  balanceEth: string;
  balanceXlm: string;
  resetToken:string;
  resetTokenExpiration: Date;
  token:string;
  number:string;
  verificationCode:string;
  preferredCurrency:string;
  createdAt: Date;
}

const userSchema = new mongoose.Schema<UserDoc>({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, required: false },
  image: { type: String },
  bio: { type: String },
  publicKeyXlm: { type: String },
  privateKeyXlm: { type: String },
  balance: { type: String },
  balanceUsd: { type: String },
  balanceEur: { type: String },
  balanceCop: { type: String },
  balanceBtc: { type: String },
  balanceEth: { type: String },
  balanceXlm: { type: String },
  resetToken: { type: String},
  resetTokenExpiration: {type: Date},
  token: String,
  number: String,
  verificationCode: String,
  preferredCurrency: { type: String, default: 'USD' }, // Add this line
  createdAt: { type: Date, default: Date.now }
});

export const User = mongoose.model<UserDoc>('User', userSchema);

import mongoose from 'mongoose';

interface UserDoc extends mongoose.Document {
  email: string;
  password: string;
  name: string;
  image: string;
  bio: string;
  publicKeyXlmTestnet: string;
  privateKeyXlmTestnet: string;
  publicKeyXlmMainnet: string;
  privateKeyXlmMainnet: string;
  balance: string;
  balanceUsd: string;
  balanceEur: string;
  balanceCop: string;
  balanceBtc: string;
  balanceEth: string;
  balanceXlm: string;
  resetToken: string;
  resetTokenExpiration: Date;
  token: string;
  number: string;
  verificationCode: string;
  preferences: {
    currency: string;
    network: string;
    hideBalances: boolean;
  };
  createdAt: Date;
  isPhoneVerified: boolean;
  lastLogin: Date;
}

const userSchema = new mongoose.Schema<UserDoc>({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true, select: false },
  name: { type: String, required: false },
  image: { type: String },
  bio: { type: String },
  publicKeyXlmTestnet: { type: String },
  privateKeyXlmTestnet: { type: String },
  publicKeyXlmMainnet: { type: String },
  privateKeyXlmMainnet: { type: String },
  balance: { type: String },
  balanceUsd: { type: String },
  balanceEur: { type: String },
  balanceCop: { type: String },
  balanceBtc: { type: String },
  balanceEth: { type: String },
  balanceXlm: { type: String },
  resetToken: { type: String },
  resetTokenExpiration: { type: Date },
  token: String,
  number: String,
  verificationCode: String,
  preferences: {
    type: {
      currency: { type: String, default: 'USD' },
      network: { 
        type: String, 
        enum: ['testnet', 'mainnet'],
        default: 'testnet' 
      },
      hideBalances: { type: Boolean, default: false }
    },
    default: {
      currency: 'USD',
      network: 'testnet',
      hideBalances: false
    }
  },
  createdAt: { type: Date, default: Date.now },
  isPhoneVerified: {
    type: Boolean,
    default: false
  },
  lastLogin: { type: Date }
});

export const User = mongoose.model<UserDoc>('User', userSchema);

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.User = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const userSchema = new mongoose_1.default.Schema({
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
exports.User = mongoose_1.default.model('User', userSchema);

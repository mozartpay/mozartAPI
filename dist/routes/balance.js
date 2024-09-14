"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const stellar_sdk_1 = __importDefault(require("@stellar/stellar-sdk"));
const dotenv_1 = __importDefault(require("dotenv"));
const user_1 = require("../models/user");
dotenv_1.default.config({ path: './config.env' });
const router = express_1.default.Router();
const server = new stellar_sdk_1.default.Horizon.Server('https://horizon-testnet.stellar.org'); // Connect to the Stellar testnet
// Helper function to get the balance of a Stellar account
const getBalance = (publicKey) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const account = yield server.loadAccount(publicKey);
        const xlmBalance = ((_a = account.balances.find((b) => b.asset_type === 'native')) === null || _a === void 0 ? void 0 : _a.balance) || '0';
        return xlmBalance;
    }
    catch (error) {
        console.error('Error loading account:', error);
        throw new Error('Failed to load account');
    }
});
router.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email } = req.query;
        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }
        // Find the user by email
        const user = yield user_1.User.findOne({ email: email });
        if (!user || !user.publicKeyXlm) {
            return res.status(404).json({ error: 'User or Stellar account not found' });
        }
        // Get the balance of the Stellar account
        const balance = yield getBalance(user.publicKeyXlm);
        const account = user.publicKeyXlm;
        // Send the balance to the frontend
        return res.json({
            balance: balance,
            account: account
        });
    }
    catch (error) {
        console.error('Error retrieving balance:', error);
        if (error instanceof Error) {
            return res.status(500).json({ error: 'Failed to retrieve balance', details: error.message });
        }
        else {
            return res.status(500).json({ error: 'Failed to retrieve balance', details: 'An unknown error occurred' });
        }
    }
}));
exports.default = router;

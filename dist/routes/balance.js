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
const cors_1 = __importDefault(require("cors"));
const stellar_sdk_1 = __importDefault(require("@stellar/stellar-sdk"));
const user_1 = require("../models/user"); // Import User model
const crypto_1 = __importDefault(require("crypto"));
const dotenv_1 = __importDefault(require("dotenv"));
// Load environment variables
dotenv_1.default.config();
const router = express_1.default.Router();
// Add CORS middleware
router.use((0, cors_1.default)({
    origin: ['https://mozartpay.com', 'https://mozart-api-21ea5fd801a8.herokuapp.com'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
const server = new stellar_sdk_1.default.Horizon.Server('https://horizon-testnet.stellar.org'); // Stellar testnet URL
// Define the decryptPrivateKey function
const decryptPrivateKey = (encryptedPrivateKey) => {
    const encryptionKey = process.env.ENCRYPTION_SECRET_KEY;
    try {
        const textParts = encryptedPrivateKey.split(':');
        const iv = textParts[0];
        const encryptedText = textParts[1];
        const ivBuffer = Buffer.from(iv, 'hex');
        const encryptedTextBuffer = Buffer.from(encryptedText, 'hex');
        const encryptionKeyBuffer = Buffer.from(encryptionKey, 'hex');
        const decipher = crypto_1.default.createDecipheriv('aes-256-cbc', encryptionKeyBuffer, ivBuffer);
        let decrypted = Buffer.concat([decipher.update(encryptedTextBuffer), decipher.final()]);
        return decrypted.toString('utf8');
    }
    catch (error) {
        console.error('Failed to decrypt private key:', error);
        throw new Error('Failed to decrypt private key');
    }
};
// Route to fetch and return balances
router.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email } = req.query; // Retrieve email from query string
        // Fetch the user from the database
        const user = yield user_1.User.findOne({ email });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        if (!user.privateKeyXlm) {
            return res.status(400).json({ error: 'Private key not available' });
        }
        // Decrypt the user's private key
        const decryptedPrivateKey = decryptPrivateKey(user.privateKeyXlm);
        // Create the Stellar keypair from the decrypted private key
        const sourceKeypair = stellar_sdk_1.default.Keypair.fromSecret(decryptedPrivateKey);
        // Load the user's account from the Stellar network
        const account = yield server.loadAccount(sourceKeypair.publicKey());
        // Fetch all balances (XLM, USDC, EURC, etc.)
        const balances = account.balances.map((balance) => ({
            asset_code: balance.asset_code || 'XLM',
            asset_issuer: balance.asset_issuer || null,
            balance: balance.balance
        }));
        // Return the balances to the frontend
        return res.status(200).json({
            balances,
            publicKey: account.id, // Return public key
        });
    }
    catch (error) {
        const err = error;
        console.error('Error fetching balances:', err.message);
        return res.status(500).json({ error: err.message });
    }
}));
exports.default = router;

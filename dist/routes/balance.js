"use strict";
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
dotenv_1.default.config({ path: '.env.production' });
const router = express_1.default.Router();
// Add CORS middleware
router.use((0, cors_1.default)({
    origin: ['https://mozartpay.com', 'https://mozart-api-21ea5fd801a8.herokuapp.com'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
// Define the getEncryptionKey function
const getEncryptionKey = (network = 'testnet') => {
    const key = network === 'mainnet'
        ? process.env.ENCRYPTION_SECRET_KEY_MAINNET
        : process.env.ENCRYPTION_SECRET_KEY_TESTNET;
    if (!key) {
        throw new Error(`Encryption key for ${network} not found in environment variables`);
    }
    return key;
};
// Define the decryptPrivateKey function
const decryptPrivateKey = (encryptedPrivateKey, network = 'testnet') => {
    const encryptionKey = getEncryptionKey(network);
    try {
        const textParts = encryptedPrivateKey.split(':');
        const iv = Buffer.from(textParts.shift(), 'hex');
        const encryptedText = Buffer.from(textParts.join(':'), 'hex');
        const encryptionKeyBuffer = Buffer.from(encryptionKey, 'hex');
        const decipher = crypto_1.default.createDecipheriv('aes-256-cbc', encryptionKeyBuffer, iv);
        return Buffer.concat([decipher.update(encryptedText), decipher.final()]).toString('utf8');
    }
    catch (error) {
        console.error('Error decrypting private key:', error);
        throw new Error('Failed to decrypt private key');
    }
};
// Replace the existing getServer function with these static instances and function
const testnetServer = new stellar_sdk_1.default.Horizon.Server(process.env.STELLAR_TESTNET_URL);
const mainnetServer = new stellar_sdk_1.default.Horizon.Server(process.env.STELLAR_MAINNET_URL);
const getServer = (network = 'testnet') => {
    return network === 'mainnet' ? mainnetServer : testnetServer;
};
// Route to fetch and return balances
router.get('/:email', async (req, res) => {
    console.log('Balance route hit with params:', req.params);
    try {
        const email = decodeURIComponent(req.params.email);
        console.log('Decoded email:', email);
        // Input validation
        if (!email) {
            console.log('Missing email parameter');
            return res.status(400).json({
                status: 'error',
                code: 'MISSING_EMAIL',
                message: 'Email parameter is required'
            });
        }
        // Fetch the user from the database
        const user = await user_1.User.findOne({ email: email.toLowerCase() });
        console.log('User found:', user ? 'Yes' : 'No');
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        // Use the network from the user model, defaulting to testnet if not specified
        const network = user.preferences.network || 'testnet';
        // Get the appropriate server instance
        const server = getServer(network);
        // Get and decrypt the network-specific private key
        const privateKey = network === 'mainnet' ? user.privateKeyXlmMainnet : user.privateKeyXlmTestnet;
        if (!privateKey) {
            return res.status(400).json({ error: `Private key for ${network} not available` });
        }
        // Decrypt the user's private key
        const decryptedPrivateKey = decryptPrivateKey(privateKey, network);
        // Create the Stellar keypair from the decrypted private key
        const sourceKeypair = stellar_sdk_1.default.Keypair.fromSecret(decryptedPrivateKey);
        // Load the user's account from the Stellar network
        const account = await server.loadAccount(sourceKeypair.publicKey());
        // Fetch all balances (XLM, USDC, EURC, etc.)
        const balances = account.balances.map((balance) => ({
            asset_code: balance.asset_code || 'XLM',
            asset_issuer: balance.asset_issuer || null,
            balance: balance.balance
        }));
        return res.json({ balances });
    }
    catch (error) {
        console.error('Error fetching balances:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
exports.default = router;

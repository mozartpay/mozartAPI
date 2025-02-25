"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const stellar_sdk_1 = __importDefault(require("@stellar/stellar-sdk"));
const user_1 = require("../models/user");
const dotenv_1 = __importDefault(require("dotenv"));
// Load environment variables
dotenv_1.default.config({ path: '.env.production' });
const router = express_1.default.Router();
// Initialize Stellar servers
const testnetServer = new stellar_sdk_1.default.Horizon.Server(process.env.STELLAR_TESTNET_URL);
const mainnetServer = new stellar_sdk_1.default.Horizon.Server(process.env.STELLAR_MAINNET_URL);
const getServer = (network = 'testnet') => {
    return network === 'mainnet' ? mainnetServer : testnetServer;
};
// Helper function to get balances from account
const getBalancesFromAccount = (account) => {
    return account.balances.map((balance) => ({
        asset_code: balance.asset_code || 'XLM',
        asset_issuer: balance.asset_issuer,
        balance: balance.balance
    }));
};
// Route to fetch and return balances
router.get('/:email', async (req, res) => {
    console.log('Balance route hit with params:', req.params);
    console.log('Query params:', req.query);
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
        // Network selection logic:
        // 1. Use query parameter if provided
        // 2. Fall back to user preferences
        // 3. Default to testnet if neither exists
        const network = req.query.network ||
            (user.preferences?.network) ||
            'testnet';
        console.log('Using network:', network);
        // Validate network value
        if (network !== 'testnet' && network !== 'mainnet') {
            return res.status(400).json({
                status: 'error',
                code: 'INVALID_NETWORK',
                message: 'Network must be either "testnet" or "mainnet"'
            });
        }
        const server = getServer(network);
        const publicKey = network === 'testnet' ? user.publicKeyXlmTestnet : user.publicKeyXlmMainnet;
        if (!publicKey) {
            return res.status(400).json({
                status: 'error',
                code: 'NO_PUBLIC_KEY',
                message: `No ${network} public key found for this user`
            });
        }
        const account = await server.loadAccount(publicKey);
        const balances = getBalancesFromAccount(account);
        return res.json({
            balances,
            publicKey: account.id,
            network // Include network in response for clarity
        });
    }
    catch (error) {
        console.error('Error fetching balances:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
exports.default = router;

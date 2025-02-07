"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const stellar_sdk_1 = __importDefault(require("@stellar/stellar-sdk"));
const dotenv_1 = __importDefault(require("dotenv"));
const user_1 = require("../models/user");
const crypto_1 = __importDefault(require("crypto"));
dotenv_1.default.config({ path: '.env.production' });
const { Keypair, TransactionBuilder, Networks, BASE_FEE, Operation } = stellar_sdk_1.default;
const router = express_1.default.Router();
// Correct environment variable names
const fundingSecretKey = process.env.STELLAR_SECRET_KEY;
const fundingPublicKey = process.env.STELLAR_PUBLIC_KEY;
const encryptionKey = process.env.ENCRYPTION_SECRET_KEY; // Add an encryption secret in your .env file
if (!fundingSecretKey || !fundingPublicKey || !encryptionKey) {
    throw new Error('STELLAR_SECRET_KEY, STELLAR_PUBLIC_KEY, and ENCRYPTION_SECRET_KEY must be set in .env');
}
// Check if encryption key is of the correct length
if (encryptionKey.length !== 64) { // Expecting a hex-encoded 32-byte key
    throw new Error('ENCRYPTION_SECRET_KEY must be a 64-character hex string representing a 32-byte key');
}
const fundingKeypair = Keypair.fromSecret(fundingSecretKey);
// Replace the existing getServer initialization with these static instances and function
const testnetServer = new stellar_sdk_1.default.Horizon.Server(process.env.STELLAR_TESTNET_URL);
const mainnetServer = new stellar_sdk_1.default.Horizon.Server(process.env.STELLAR_MAINNET_URL);
const getServer = (network = 'testnet') => {
    return network === 'mainnet' ? mainnetServer : testnetServer;
};
// Encryption function using AES-256 with a hex-encoded key
const encryptPrivateKey = (privateKey) => {
    const iv = crypto_1.default.randomBytes(16); // Initialization vector (IV) should be 16 bytes
    const cipher = crypto_1.default.createCipheriv('aes-256-cbc', Buffer.from(encryptionKey, 'hex'), iv);
    let encrypted = cipher.update(privateKey, 'utf8');
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    // Return IV and encrypted data in hex format
    return iv.toString('hex') + ':' + encrypted.toString('hex');
};
// Decryption function
const decryptPrivateKey = (encryptedPrivateKey) => {
    const textParts = encryptedPrivateKey.split(':');
    const iv = Buffer.from(textParts.shift(), 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const decipher = crypto_1.default.createDecipheriv('aes-256-cbc', Buffer.from(encryptionKey, 'hex'), iv);
    let decrypted = Buffer.concat([decipher.update(encryptedText), decipher.final()]);
    return decrypted.toString('utf8');
};
// Update waitForAccount helper to accept network parameter
const waitForAccount = async (publicKey, network = 'testnet', retries = 10, delay = 5000) => {
    const server = getServer(network);
    for (let i = 0; i < retries; i++) {
        try {
            const account = await server.loadAccount(publicKey);
            return account;
        }
        catch (error) {
            console.log(`Attempt ${i + 1} failed. Retrying in ${delay / 1000} seconds...`);
            await new Promise(res => setTimeout(res, delay));
        }
    }
    throw new Error('Failed to load account after multiple attempts');
};
router.post('/decrypt', async (req, res) => {
    try {
        const { email } = req.body;
        // Fetch the user data from the database
        const user = await user_1.User.findOne({ email });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        const network = user.preferences.network || 'testnet';
        const privateKey = network === 'mainnet' ? user.privateKeyXlmMainnet : user.privateKeyXlmTestnet;
        if (!privateKey) {
            return res.status(400).json({ error: `Private key for ${network} not available` });
        }
        const decryptedPrivateKey = decryptPrivateKey(privateKey);
        // Return the decrypted private key
        return res.json({
            privateKey: decryptedPrivateKey,
        });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Failed to decrypt private key' });
    }
});
router.post('/', async (req, res) => {
    console.log('Received request');
    try {
        const { email, currency, network = 'testnet' } = req.body;
        // Add network validation
        if (network && !['mainnet', 'testnet'].includes(network)) {
            return res.status(400).json({ error: 'Invalid network parameter. Use "mainnet" or "testnet"' });
        }
        // Get the appropriate server instance
        const server = getServer(network);
        // Ensure that this feature is only available for XLM
        if (currency !== 'XLM') {
            return res.status(400).json({ error: 'This feature is only available for XLM' });
        }
        // Check if the user already has a publicKeyXlm
        const existingUser = await user_1.User.findOne({ email });
        if (!existingUser) {
            return res.status(404).json({ error: 'User not found' });
        }
        if (existingUser.publicKeyXlmTestnet && network === 'testnet') {
            const account = await waitForAccount(existingUser.publicKeyXlmTestnet, network);
            const balance = account.balances.find((b) => b.asset_type === 'native')?.balance || '0';
            return res.json({
                publicKey: existingUser.publicKeyXlmTestnet,
                balance: balance,
            });
        }
        else if (existingUser.publicKeyXlmMainnet && network === 'mainnet') {
            const account = await waitForAccount(existingUser.publicKeyXlmMainnet, network);
            const balance = account.balances.find((b) => b.asset_type === 'native')?.balance || '0';
            return res.json({
                publicKey: existingUser.publicKeyXlmMainnet,
                balance: balance,
            });
        }
        // Create new account with appropriate network
        console.log('Creating a new Stellar account for the user');
        const pair = Keypair.random();
        const sourceAccount = await server.loadAccount(fundingPublicKey);
        const transaction = new TransactionBuilder(sourceAccount, {
            fee: BASE_FEE,
            networkPassphrase: network === 'mainnet' ? Networks.PUBLIC : Networks.TESTNET,
        })
            .addOperation(Operation.createAccount({
            destination: pair.publicKey(),
            startingBalance: '10',
        }))
            .setTimeout(30)
            .build();
        transaction.sign(fundingKeypair);
        const transactionResult = await server.submitTransaction(transaction);
        console.log('Transaction successful:', transactionResult);
        await new Promise(res => setTimeout(res, 5000));
        const account = await waitForAccount(pair.publicKey(), network);
        // Encrypt the private key
        const encryptedPrivateKey = encryptPrivateKey(pair.secret());
        // Update the user's record with the new Stellar keypair and balance in MongoDB
        const updatedUser = await user_1.User.findOneAndUpdate({ email }, {
            [network === 'mainnet' ? 'publicKeyXlmMainnet' : 'publicKeyXlmTestnet']: pair.publicKey(),
            [network === 'mainnet' ? 'privateKeyXlmMainnet' : 'privateKeyXlmTestnet']: encryptedPrivateKey,
        }, { new: true } // Return the updated document
        );
        if (!updatedUser) {
            return res.status(404).json({ error: 'User not found' });
        }
        // Send the public key and balance to the frontend, not the private key
        return res.json({
            publicKey: pair.publicKey(),
            balance: account.balances.find((b) => b.asset_type === 'native')?.balance || '0',
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
exports.default = router;

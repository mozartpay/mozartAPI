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
// Network-specific funding keys
const fundingSecretKeyTestnet = process.env.STELLAR_SECRET_KEY_TESTNET;
const fundingPublicKeyTestnet = process.env.STELLAR_PUBLIC_KEY_TESTNET;
const fundingSecretKeyMainnet = process.env.STELLAR_SECRET_KEY_MAINNET;
const fundingPublicKeyMainnet = process.env.STELLAR_PUBLIC_KEY_MAINNET;
// Network-specific encryption keys
const encryptionKeyTestnet = process.env.ENCRYPTION_SECRET_KEY_TESTNET;
const encryptionKeyMainnet = process.env.ENCRYPTION_SECRET_KEY_MAINNET;
// Validate required environment variables
if (!fundingSecretKeyTestnet || !fundingPublicKeyTestnet || !encryptionKeyTestnet) {
    throw new Error('Testnet environment variables (STELLAR_SECRET_KEY_TESTNET, STELLAR_PUBLIC_KEY_TESTNET, ENCRYPTION_SECRET_KEY_TESTNET) must be set in .env');
}
if (!fundingSecretKeyMainnet || !fundingPublicKeyMainnet || !encryptionKeyMainnet) {
    throw new Error('Mainnet environment variables (STELLAR_SECRET_KEY_MAINNET, STELLAR_PUBLIC_KEY_MAINNET, ENCRYPTION_SECRET_KEY_MAINNET) must be set in .env');
}
// Helper function to get the appropriate keys based on network
const getFundingKeys = (network = 'testnet') => {
    return {
        secretKey: network === 'mainnet' ? fundingSecretKeyMainnet : fundingSecretKeyTestnet,
        publicKey: network === 'mainnet' ? fundingPublicKeyMainnet : fundingPublicKeyTestnet,
        encryptionKey: network === 'mainnet' ? encryptionKeyMainnet : encryptionKeyTestnet
    };
};
// Check if encryption key is of the correct length
const validateEncryptionKey = (encryptionKey) => {
    if (encryptionKey.length !== 64) { // Expecting a hex-encoded 32-byte key
        throw new Error('ENCRYPTION_SECRET_KEY must be a 64-character hex string representing a 32-byte key');
    }
};
const testnetServer = new stellar_sdk_1.default.Horizon.Server(process.env.STELLAR_TESTNET_URL);
const mainnetServer = new stellar_sdk_1.default.Horizon.Server(process.env.STELLAR_MAINNET_URL);
const getServer = (network = 'testnet') => {
    return network === 'mainnet' ? mainnetServer : testnetServer;
};
// Encryption function using AES-256 with a hex-encoded key
const encryptPrivateKey = (privateKey, encryptionKey) => {
    const iv = crypto_1.default.randomBytes(16); // Initialization vector (IV) should be 16 bytes
    const cipher = crypto_1.default.createCipheriv('aes-256-cbc', Buffer.from(encryptionKey, 'hex'), iv);
    let encrypted = cipher.update(privateKey, 'utf8');
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    // Return IV and encrypted data in hex format
    return iv.toString('hex') + ':' + encrypted.toString('hex');
};
// Decryption function
const decryptPrivateKey = (encryptedPrivateKey, encryptionKey) => {
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
        const { encryptionKey } = getFundingKeys(network);
        validateEncryptionKey(encryptionKey);
        const privateKey = network === 'mainnet' ? user.privateKeyXlmMainnet : user.privateKeyXlmTestnet;
        if (!privateKey) {
            return res.status(400).json({ error: `Private key for ${network} not available` });
        }
        const decryptedPrivateKey = decryptPrivateKey(privateKey, encryptionKey);
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
    const requestId = crypto_1.default.randomBytes(4).toString('hex');
    console.log(`[XLM-${requestId}] New request received:`, { email: req.body.email, network: req.body.network, currency: req.body.currency });
    try {
        const { email, currency, network = 'testnet' } = req.body;
        // Add network validation
        if (network && !['mainnet', 'testnet'].includes(network)) {
            console.log(`[XLM-${requestId}] Invalid network parameter:`, network);
            return res.status(400).json({ error: 'Invalid network parameter. Use "mainnet" or "testnet"' });
        }
        // Get the appropriate server instance
        const server = getServer(network);
        console.log(`[XLM-${requestId}] Using ${network} network`);
        // Ensure that this feature is only available for XLM
        if (currency !== 'XLM') {
            console.log(`[XLM-${requestId}] Invalid currency requested:`, currency);
            return res.status(400).json({ error: 'This feature is only available for XLM' });
        }
        // Check if the user already has a publicKeyXlm
        const existingUser = await user_1.User.findOne({ email });
        if (!existingUser) {
            console.log(`[XLM-${requestId}] User not found:`, email);
            return res.status(404).json({ error: 'User not found' });
        }
        // Check for existing wallet based on network
        const networkPublicKey = network === 'mainnet' ? existingUser.publicKeyXlmMainnet : existingUser.publicKeyXlmTestnet;
        if (networkPublicKey) {
            console.log(`[XLM-${requestId}] Wallet already exists for user:`, {
                email,
                network,
                publicKey: networkPublicKey
            });
            // Check if the account exists on the network
            try {
                const account = await waitForAccount(networkPublicKey, network);
                const balance = account.balances.find((b) => b.asset_type === 'native')?.balance || '0';
                console.log(`[XLM-${requestId}] Retrieved existing wallet balance:`, {
                    publicKey: networkPublicKey,
                    balance,
                    network
                });
                return res.status(400).json({
                    error: 'Wallet already exists for this network',
                    publicKey: networkPublicKey,
                    balance: balance,
                });
            }
            catch (error) {
                console.error(`[XLM-${requestId}] Error checking existing wallet:`, error);
                return res.status(400).json({
                    error: 'Wallet already exists in database but could not verify on network. Please contact support.'
                });
            }
        }
        // Create new account with appropriate network
        console.log(`[XLM-${requestId}] Creating new Stellar account:`, {
            email,
            network,
            startingBalance: network === 'mainnet' ? '3' : '10'
        });
        const pair = Keypair.random();
        const { secretKey, publicKey: fundingPublicKey } = getFundingKeys(network);
        console.log(`[XLM-${requestId}] Loading source account:`, {
            fundingPublicKey,
            network
        });
        const sourceAccount = await server.loadAccount(fundingPublicKey);
        const transaction = new TransactionBuilder(sourceAccount, {
            fee: BASE_FEE,
            networkPassphrase: network === 'mainnet' ? Networks.PUBLIC : Networks.TESTNET,
        })
            .addOperation(Operation.createAccount({
            destination: pair.publicKey(),
            startingBalance: network === 'mainnet' ? '3' : '10',
        }))
            .setTimeout(30)
            .build();
        transaction.sign(Keypair.fromSecret(secretKey));
        console.log(`[XLM-${requestId}] Submitting create account transaction for:`, {
            newPublicKey: pair.publicKey(),
            network
        });
        const transactionResult = await server.submitTransaction(transaction);
        console.log(`[XLM-${requestId}] Transaction successful:`, {
            hash: transactionResult.hash,
            network
        });
        await new Promise(res => setTimeout(res, 5000));
        console.log(`[XLM-${requestId}] Waiting for account to be created on network...`);
        const account = await waitForAccount(pair.publicKey(), network);
        console.log(`[XLM-${requestId}] Account successfully created and loaded`);
        // Encrypt the private key
        const { encryptionKey } = getFundingKeys(network);
        validateEncryptionKey(encryptionKey);
        const encryptedPrivateKey = encryptPrivateKey(pair.secret(), encryptionKey);
        console.log(`[XLM-${requestId}] Private key encrypted successfully`);
        // Additional check to prevent duplicate public keys across all users
        const duplicateCheck = await user_1.User.findOne({
            $or: [
                { publicKeyXlmMainnet: pair?.publicKey() },
                { publicKeyXlmTestnet: pair?.publicKey() }
            ]
        });
        if (duplicateCheck) {
            console.log(`[XLM-${requestId}] Duplicate public key found in database:`, {
                network,
                publicKey: pair?.publicKey()
            });
            return res.status(400).json({
                error: 'Generated key already exists in database. Please try again.'
            });
        }
        // Update the user's record with the new Stellar keypair and balance in MongoDB
        console.log(`[XLM-${requestId}] Updating user record with new wallet:`, {
            email,
            network,
            publicKey: pair.publicKey()
        });
        const updatedUser = await user_1.User.findOneAndUpdate({ email }, {
            [network === 'mainnet' ? 'publicKeyXlmMainnet' : 'publicKeyXlmTestnet']: pair.publicKey(),
            [network === 'mainnet' ? 'privateKeyXlmMainnet' : 'privateKeyXlmTestnet']: encryptedPrivateKey,
        }, { new: true });
        if (!updatedUser) {
            console.log(`[XLM-${requestId}] Failed to update user record:`, { email });
            return res.status(404).json({ error: 'User not found' });
        }
        const finalBalance = account.balances.find((b) => b.asset_type === 'native')?.balance || '0';
        console.log(`[XLM-${requestId}] Wallet creation completed successfully:`, {
            email,
            network,
            publicKey: pair.publicKey(),
            balance: finalBalance
        });
        // Send the public key and balance to the frontend, not the private key
        return res.json({
            publicKey: pair.publicKey(),
            balance: finalBalance,
        });
    }
    catch (error) {
        console.error(`[XLM-${requestId}] Error:`, error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
exports.default = router;

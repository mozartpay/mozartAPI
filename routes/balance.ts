import express, { Request, Response } from 'express';
import cors from 'cors';
import StellarSdk from '@stellar/stellar-sdk';
import { User } from '../models/user'; // Import User model
import crypto from 'crypto';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.production' });

const router = express.Router();

// Add CORS middleware
router.use(cors({
  origin: ['https://mozartpay.com', 'https://mozart-api-21ea5fd801a8.herokuapp.com'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Define the getEncryptionKey function
const getEncryptionKey = (network: string = 'testnet'): string => {
  const key = network === 'mainnet' 
    ? process.env.ENCRYPTION_SECRET_KEY_MAINNET 
    : process.env.ENCRYPTION_SECRET_KEY_TESTNET;
  
  if (!key) {
    throw new Error(`Encryption key for ${network} not found in environment variables`);
  }
  return key;
};

// Define the decryptPrivateKey function
const decryptPrivateKey = (encryptedPrivateKey: string, network: string = 'testnet'): string => {
  const encryptionKey = getEncryptionKey(network);
  try {
    const textParts = encryptedPrivateKey.split(':');
    const iv = Buffer.from(textParts.shift()!, 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const encryptionKeyBuffer = Buffer.from(encryptionKey, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', encryptionKeyBuffer, iv);
    return Buffer.concat([decipher.update(encryptedText), decipher.final()]).toString('utf8');
  } catch (error) {
    console.error('Error decrypting private key:', error);
    throw new Error('Failed to decrypt private key');
  }
};

// Define the Balance type with asset_code and asset_issuer
interface Balance {
  asset_code?: string;    // Asset code (e.g., USDC, EURC), optional for XLM
  asset_issuer?: string;  // Asset issuer, optional for XLM
  balance: string;        // Balance amount as string
}

// Replace the existing getServer function with these static instances and function
const testnetServer = new StellarSdk.Horizon.Server(process.env.STELLAR_TESTNET_URL as string);
const mainnetServer = new StellarSdk.Horizon.Server(process.env.STELLAR_MAINNET_URL as string);

const getServer = (network: string = 'testnet'): typeof testnetServer => {
    return network === 'mainnet' ? mainnetServer : testnetServer;
};

// Route to fetch and return balances
router.get('/:email', async (req: Request, res: Response) => {
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
    const user = await User.findOne({ email: email.toLowerCase() });
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
    const sourceKeypair = StellarSdk.Keypair.fromSecret(decryptedPrivateKey);

    // Load the user's account from the Stellar network
    const account = await server.loadAccount(sourceKeypair.publicKey());

    // Fetch all balances (XLM, USDC, EURC, etc.)
    const balances = account.balances.map((balance: Balance) => ({
      asset_code: balance.asset_code || 'XLM', // Default to XLM if no asset_code
      asset_issuer: balance.asset_issuer || null,
      balance: balance.balance
    }));

    return res.json({ balances });
  } catch (error) {
    console.error('Error fetching balances:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

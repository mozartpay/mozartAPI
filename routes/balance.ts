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

// Define the decryptPrivateKey function
const decryptPrivateKey = (encryptedPrivateKey: string): string => {
  const encryptionKey = process.env.ENCRYPTION_SECRET_KEY as string;
  try {
    const textParts = encryptedPrivateKey.split(':');
    const iv = textParts[0]; 
    const encryptedText = textParts[1];

    const ivBuffer = Buffer.from(iv, 'hex');
    const encryptedTextBuffer = Buffer.from(encryptedText, 'hex');

    const encryptionKeyBuffer = Buffer.from(encryptionKey, 'hex');

    const decipher = crypto.createDecipheriv('aes-256-cbc', encryptionKeyBuffer, ivBuffer);
    let decrypted = Buffer.concat([decipher.update(encryptedTextBuffer), decipher.final()]);

    return decrypted.toString('utf8');
  } catch (error) {
    console.error('Failed to decrypt private key:', error);
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
router.get('/', async (req: Request, res: Response) => {
  try {
    const { email, network } = req.query; // Add network to query parameters
    
    // Validate network parameter
    if (network && !['mainnet', 'testnet'].includes(network as string)) {
      return res.status(400).json({ error: 'Invalid network parameter. Use "mainnet" or "testnet"' });
    }

    // Get the appropriate server instance
    const server = getServer(network as string);

    // Fetch the user from the database
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!user.privateKeyXlm) {
      return res.status(400).json({ error: 'Private key not available' });
    }

    // Decrypt the user's private key
    const decryptedPrivateKey = decryptPrivateKey(user.privateKeyXlm);

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

    // Return the balances to the frontend
    return res.status(200).json({
      balances,
      publicKey: account.id, // Return public key
    });
  } catch (error) {
    const err = error as Error;
    console.error('Error fetching balances:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

export default router;

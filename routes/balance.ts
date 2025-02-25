import express, { Request, Response } from 'express';
import cors from 'cors';
import StellarSdk from '@stellar/stellar-sdk';
import { User } from '../models/user'; 
import crypto from 'crypto';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.production' });

const router = express.Router();

// Initialize Stellar servers
const testnetServer = new StellarSdk.Horizon.Server(process.env.STELLAR_TESTNET_URL as string);
const mainnetServer = new StellarSdk.Horizon.Server(process.env.STELLAR_MAINNET_URL as string);

const getServer = (network: string = 'testnet'): typeof testnetServer => {
    return network === 'mainnet' ? mainnetServer : testnetServer;
};

// Define the Balance type
interface Balance {
  asset_code?: string;
  asset_issuer?: string;
  balance: string;
}

// Helper function to get balances from account
const getBalancesFromAccount = (account: any): Balance[] => {
  return account.balances.map((balance: any) => ({
    asset_code: balance.asset_code || 'XLM',
    asset_issuer: balance.asset_issuer,
    balance: balance.balance
  }));
};

// Route to fetch and return balances
router.get('/:email', async (req: Request, res: Response) => {
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
    const user = await User.findOne({ email: email.toLowerCase() });
    console.log('User found:', user ? 'Yes' : 'No');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Network selection logic:
    // 1. Use query parameter if provided
    // 2. Fall back to user preferences
    // 3. Default to testnet if neither exists
    const network = (req.query.network as string) || 
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
  } catch (error) {
    console.error('Error fetching balances:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

import express, { Request, Response, Router } from 'express';
import StellarSdk from '@stellar/stellar-sdk';
import dotenv from 'dotenv';
import { User } from '../models/user';

dotenv.config({ path: './config.env' });

const router: Router = express.Router();
const server = new StellarSdk.Horizon.Server('https://horizon-testnet.stellar.org'); // Connect to the Stellar testnet

// Define a type for the balance object
type Balance = {
  balance: string;
  asset_type: string;
};

// Helper function to get the balance of a Stellar account
const getBalance = async (publicKey: string): Promise<string> => {
  try {
    const account = await server.loadAccount(publicKey);
    const xlmBalance = account.balances.find((b: Balance) => b.asset_type === 'native')?.balance || '0';
    return xlmBalance;
  } catch (error) {
    console.error('Error loading account:', error);
    throw new Error('Failed to load account');
  }
};

router.get('/', async (req: Request, res: Response) => {
  try {
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Find the user by email
    const user = await User.findOne({ email: email as string });

    if (!user || !user.publicKeyXlm) {
      return res.status(404).json({ error: 'User or Stellar account not found' });
    }

    // Get the balance of the Stellar account
    const balance = await getBalance(user.publicKeyXlm);
    const account = user.publicKeyXlm;

    // Send the balance to the frontend
    return res.json({
      balance: balance,
      account: account
    });
  } catch (error) {
    console.error('Error retrieving balance:', error);

    if (error instanceof Error) {
      return res.status(500).json({ error: 'Failed to retrieve balance', details: error.message });
    } else {
      return res.status(500).json({ error: 'Failed to retrieve balance', details: 'An unknown error occurred' });
    }
  }
});

export default router;

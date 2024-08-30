import express, { Request, Response, Router } from 'express';
import StellarSdk from '@stellar/stellar-sdk';
import dotenv from 'dotenv';
import { User } from '../models/user';

dotenv.config({ path: './config.env' });

const { Keypair, TransactionBuilder, Networks, BASE_FEE, Operation } = StellarSdk;

const router: Router = express.Router();

// Correct environment variable names
const fundingSecretKey = process.env.STELLAR_SECRET_KEY as string;
const fundingPublicKey = process.env.STELLAR_PUBLIC_KEY as string;

if (!fundingSecretKey || !fundingPublicKey) {
    throw new Error('STELLAR_SECRET_KEY and STELLAR_PUBLIC_KEY must be set in config.env');
}

const fundingKeypair = Keypair.fromSecret(fundingSecretKey);
const server = new StellarSdk.Horizon.Server('https://horizon-testnet.stellar.org'); // Connect to the Stellar testnet

// Helper function to wait for the account to be available on the network
const waitForAccount = async (
  publicKey: string,
  retries = 5,
  delay = 2000
): Promise<import('@stellar/stellar-sdk').Horizon.AccountResponse> => {
  for (let i = 0; i < retries; i++) {
    try {
      const account = await server.loadAccount(publicKey);
      return account; // Return the account if successfully loaded
    } catch (error) {
      console.log(`Attempt ${i + 1} failed. Retrying in ${delay / 1000} seconds...`);
      await new Promise(res => setTimeout(res, delay));
    }
  }
  throw new Error('Failed to load account after multiple attempts');
};

router.post('/create', async (req: Request, res: Response) => {
  try {
    const { email, currency } = req.body;

    // Ensure that this feature is only available for XLM
    if (currency !== 'XLM') {
      return res.status(400).json({ error: 'This feature is only available for XLM' });
    }

    // Generate a new Stellar keypair
    const pair = Keypair.random();

    // Log the generated public and secret keys for debugging
    console.log('New Stellar Public Key:', pair.publicKey());
    console.log('New Stellar Secret Key:', pair.secret());

    // Load the funding account
    const sourceAccount = await server.loadAccount(fundingPublicKey);

    // Create a transaction to create a new account with 10 XLM
    const transaction = new TransactionBuilder(sourceAccount, {
      fee: BASE_FEE,
      networkPassphrase: Networks.TESTNET,
    })
      .addOperation(
        Operation.createAccount({
          destination: pair.publicKey(),
          startingBalance: '10', // Send 10 XLM to the new account to create it
        })
      )
      .setTimeout(30)
      .build();

    console.log('Built Transaction XDR:', transaction.toXDR()); // Log the transaction XDR

    // Sign the transaction with the funding account's secret key
    transaction.sign(fundingKeypair);

    // Submit the transaction to the Stellar network
    const transactionResult = await server.submitTransaction(transaction);
    console.log('Transaction successful:', transactionResult);

    // Wait for the new account to be available on the network
    const account = await waitForAccount(pair.publicKey());

    // Explicitly type the balances array
    const xlmBalance = account.balances.find((b) => b.asset_type === 'native')?.balance || '0';

    // Update the user's record with the new Stellar keypair and balance in MongoDB
    const user = await User.findOneAndUpdate(
      { email },
      {
        publicKeyXlm: pair.publicKey(),
        privateKeyXlm: pair.secret(), // Store the plain text private key
      },
      { new: true } // Return the updated document
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Send the public key, private key, and balance to the frontend
    return res.json({
      publicKey: pair.publicKey(),
      privateKey: pair.secret(),
      balance: xlmBalance, // Send the balance to the frontend
    });
  } catch (error) {
    console.error('Error creating Stellar account:', error);

    // Type assertion: assume error is an AxiosError
    if (error instanceof Error && (error as any).response) {
      const axiosError = error as any;
      if (axiosError.response.data) {
        console.error('Horizon server response:', axiosError.response.data);
        if (axiosError.response.data.extras && axiosError.response.data.extras.result_codes) {
          console.error('Transaction Result Codes:', axiosError.response.data.extras.result_codes);
        }
      }
    }

    if (error instanceof Error) {
      return res.status(500).json({ error: 'Failed to create account', details: error.message });
    } else {
      return res.status(500).json({ error: 'Failed to create account', details: 'An unknown error occurred' });
    }
  }
});

export default router;


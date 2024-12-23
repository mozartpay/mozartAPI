import express, { Request, Response } from 'express';
import StellarSdk from '@stellar/stellar-sdk';
import { User } from '../models/user'; // Import User model
import crypto from 'crypto';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.production' });

const router = express.Router();

// Static server instances
const testnetServer = new StellarSdk.Horizon.Server(process.env.STELLAR_TESTNET_URL as string);
const mainnetServer = new StellarSdk.Horizon.Server(process.env.STELLAR_MAINNET_URL as string);

const getServer = (network: string = 'testnet'): typeof testnetServer => {
    return network === 'mainnet' ? mainnetServer : testnetServer;
};

const decryptPrivateKey = (encryptedPrivateKey: string): string => {
  const encryptionKey = process.env.ENCRYPTION_SECRET_KEY as string;
  try {
    const textParts = encryptedPrivateKey.split(':');
    
    // Ensure we have exactly two parts: iv and encrypted text
    if (textParts.length !== 2) {
      throw new Error('Invalid encrypted private key format');
    }

    const iv = textParts[0]; // The initialization vector (IV)
    const encryptedText = textParts[1]; // The actual encrypted data

    // Log the iv and encryptedText to ensure they are correctly assigned
    console.log('IV:', iv);
    console.log('Encrypted text:', encryptedText);

    // Ensure iv and encryptedText are properly formatted
    const ivBuffer = Buffer.from(iv, 'hex');
    const encryptedTextBuffer = Buffer.from(encryptedText, 'hex');

    // Ensure the encryptionKey is a valid Buffer
    if (!encryptionKey) {
      throw new Error('Encryption key is missing');
    }
    const encryptionKeyBuffer = Buffer.from(encryptionKey, 'hex');

    // Decrypt the data
    const decipher = crypto.createDecipheriv('aes-256-cbc', encryptionKeyBuffer, ivBuffer);
    let decrypted = Buffer.concat([decipher.update(encryptedTextBuffer), decipher.final()]);

    return decrypted.toString('utf8');
  } catch (error) {
    console.error('Failed to decrypt private key:', error);
    throw new Error('Failed to decrypt private key');
  }
};

// Withdraw route
router.post('/', async (req: Request, res: Response) => {
  try {
    const { email, amount, xlmAddress, network = 'testnet' } = req.body;

    // Add network validation
    if (network && !['mainnet', 'testnet'].includes(network)) {
      return res.status(400).json({ error: 'Invalid network parameter. Use "mainnet" or "testnet"' });
    }

    // Get the appropriate server instance
    const server = getServer(network);

    // Log the incoming request data
    console.log('Received withdrawal request:', { email, amount, xlmAddress });

    // Validate amount
    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    // Ensure amount is a string for Stellar (e.g., "1.5" not 1.5)
    const formattedAmount = parseFloat(amount).toFixed(7); // Stellar expects up to 7 decimal places

    // Validate the Stellar address
    if (!StellarSdk.StrKey.isValidEd25519PublicKey(xlmAddress)) {
      return res.status(400).json({ error: 'Invalid Stellar address' });
    }

    // Fetch the user from the database
    const user = await User.findOne({ email });
    if (!user) {
      console.log('User not found:', email);
      return res.status(404).json({ error: 'User not found' });
    }
    console.log('Retrieved privateKeyXlm:', user.privateKeyXlm);

    if (!user.privateKeyXlm) {
      console.log('Private key not found for user:', email);
      return res.status(400).json({ error: 'Private key not available' });
    }

    // Decrypt the user's private key
    console.log('Decrypting private key for user:', email);

    const decryptedPrivateKey = decryptPrivateKey(user.privateKeyXlm);
    console.log('Decrypted private key for user:', email);

    // Create the Stellar keypair from the decrypted private key
    const sourceKeypair = StellarSdk.Keypair.fromSecret(decryptedPrivateKey);

    // Load the user's account from the Stellar network
    console.log('Loading Stellar account for public key:', sourceKeypair.publicKey());
    const account = await server.loadAccount(sourceKeypair.publicKey());
    console.log('Loaded Stellar account:', account.id);

    // Create a transaction to send XLM to the specified address
    console.log('Building transaction to send XLM:', { destination: xlmAddress, amount: formattedAmount });
    const transaction = new StellarSdk.TransactionBuilder(account, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: network === 'mainnet' ? StellarSdk.Networks.PUBLIC : StellarSdk.Networks.TESTNET,
    })
      .addOperation(
        StellarSdk.Operation.payment({
          destination: xlmAddress,
          asset: StellarSdk.Asset.native(),
          amount: formattedAmount,
        })
      )
      .setTimeout(30)
      .build();

    console.log('Transaction built successfully. XDR:', transaction.toXDR());

    // Sign the transaction with the decrypted private key
    console.log('Signing transaction...');
    transaction.sign(sourceKeypair);
    console.log('Transaction signed successfully');

    // Submit the transaction to the Stellar network
    console.log('Submitting transaction to Stellar network...');
    const result = await server.submitTransaction(transaction);
    console.log('Transaction submitted successfully:', result);

    // Respond with the result of the transaction
    return res.status(200).json({ message: 'Withdrawal successful', result });
  } catch (error) {
    if (error instanceof Error) {
      console.error('Error processing withdrawal:', error.message);
      return res.status(500).json({ error: error.message });
    } else {
      console.error('Unexpected error:', error);
      return res.status(500).json({ error: 'Failed to process withdrawal' });
    }
  }
});

export default router;

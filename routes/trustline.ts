import express, { Request, Response } from 'express';
import StellarSdk from '@stellar/stellar-sdk';
import { User } from '../models/user'; // Import User model
import crypto from 'crypto';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const router = express.Router();
const server = new StellarSdk.Horizon.Server('https://horizon-testnet.stellar.org'); // Stellar testnet URL

// Decrypt function (same as the one in your previous code)
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

// Define the Balance type
interface Balance {
  asset_code?: string;    // Asset code (e.g., USDC), optional for XLM
  asset_issuer?: string;  // Asset issuer, optional for XLM
  balance: string;        // Balance amount as string
}

// Route to establish a trustline with USDC

router.post('/', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

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

    // USDC asset details on Stellar testnet
    const circleUsdcIssuer = process.env.CIRCLE_USDC_ISSUER as string;
    if (!circleUsdcIssuer) {
      return res.status(500).json({ error: 'Circle USDC issuer is not configured in environment' });
    }

    const usdcAsset = new StellarSdk.Asset('USDC', circleUsdcIssuer);

    // Check if the trustline already exists
    const hasTrustline = account.balances.some((balance: Balance) => 
      balance.asset_code === 'USDC' && balance.asset_issuer === circleUsdcIssuer
    );

    if (hasTrustline) {
      // Trustline already exists, return the public key and trustline status
      return res.status(200).json({
        message: 'USDC trustline already exists',
        publicKey: account.id, // Use "publicKey" instead of "account_id"
        hasUSDCTrustline: true
      });
    }

    // If no trustline exists, create one
    const transaction = new StellarSdk.TransactionBuilder(account, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: StellarSdk.Networks.TESTNET,
    })
      .addOperation(
        StellarSdk.Operation.changeTrust({
          asset: usdcAsset, // USDC asset
        })
      )
      .setTimeout(30)
      .build();

    transaction.sign(sourceKeypair);

    const result = await server.submitTransaction(transaction);

    return res.status(200).json({
      message: 'Trustline created successfully',
      result,
      publicKey: account.id, // Return "publicKey" instead of "account_id"
      hasUSDCTrustline: true
    });
  } catch (error) {
    // Cast 'error' as 'Error' to access its message property
    const err = error as Error;
    console.error('Error creating trustline:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

export default router;



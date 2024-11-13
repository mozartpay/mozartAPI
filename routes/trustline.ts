import express, { Request, Response } from 'express';
import StellarSdk from '@stellar/stellar-sdk';
import { User } from '../models/user'; // Import User model
import crypto from 'crypto';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.production' });

const router = express.Router();

// Replace the static server initialization with a function
const getServer = (network: string = 'testnet'): StellarSdk.Horizon.Server => {
    const url = network === 'mainnet' 
        ? process.env.STELLAR_MAINNET_URL 
        : process.env.STELLAR_TESTNET_URL;
    return new StellarSdk.Horizon.Server(url as string);
};

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
  asset_code?: string;    // Asset code (e.g., USDC, EURC), optional for XLM
  asset_issuer?: string;  // Asset issuer, optional for XLM
  balance: string;        // Balance amount as string
}

// Route to establish trustlines with USDC and EURC
router.post('/', async (req: Request, res: Response) => {
  try {
    const { email, network = 'testnet' } = req.body;

    // Add network validation
    if (network && !['mainnet', 'testnet'].includes(network)) {
      return res.status(400).json({ error: 'Invalid network parameter. Use "mainnet" or "testnet"' });
    }

    // Get the appropriate server instance
    const server = getServer(network);

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
    const circleEurcIssuer = process.env.CIRCLE_EURC_ISSUER as string;
    
    if (!circleUsdcIssuer || !circleEurcIssuer) {
      return res.status(500).json({ error: 'Circle USDC or EURC issuer is not configured in environment' });
    }

    const usdcAsset = new StellarSdk.Asset('USDC', circleUsdcIssuer);
    const eurcAsset = new StellarSdk.Asset('EURC', circleEurcIssuer);

    // Check if the trustlines already exist
    const hasUsdcTrustline = account.balances.some((balance: Balance) => 
      balance.asset_code === 'USDC' && balance.asset_issuer === circleUsdcIssuer
    );
    
    const hasEurcTrustline = account.balances.some((balance: Balance) => 
      balance.asset_code === 'EURC' && balance.asset_issuer === circleEurcIssuer
    );

    // Prepare operations to add missing trustlines
    const operations = [];

    if (!hasUsdcTrustline) {
      operations.push(StellarSdk.Operation.changeTrust({
        asset: usdcAsset, // USDC asset
      }));
    }

    if (!hasEurcTrustline) {
      operations.push(StellarSdk.Operation.changeTrust({
        asset: eurcAsset, // EURC asset
      }));
    }

    // If all trustlines exist, return without making a transaction
    if (operations.length === 0) {
      return res.status(200).json({
        message: 'USDC and EURC trustlines already exist',
        publicKey: account.id, // Use "publicKey" instead of "account_id"
        hasUSDCTrustline: true,
        hasEURCTrustline: true,
      });
    }

    // If any trustlines are missing, create a transaction to add them
    let transactionBuilder = new StellarSdk.TransactionBuilder(account, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: network === 'mainnet' ? StellarSdk.Networks.PUBLIC : StellarSdk.Networks.TESTNET,
    });

    // Add each operation individually
    operations.forEach(op => transactionBuilder = transactionBuilder.addOperation(op));

    const transaction = transactionBuilder
      .setTimeout(30)
      .build();

    transaction.sign(sourceKeypair);

    const result = await server.submitTransaction(transaction);

    return res.status(200).json({
      message: 'Trustline(s) created successfully',
      result,
      publicKey: account.id, // Return "publicKey" instead of "account_id"
      hasUSDCTrustline: !hasUsdcTrustline,
      hasEURCTrustline: !hasEurcTrustline,
    });
  } catch (error) {
    // Cast 'error' as 'Error' to access its message property
    const err = error as Error;
    console.error('Error creating trustline:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

export default router;

import express, { Request, Response } from 'express';
import StellarSdk from '@stellar/stellar-sdk';
import { User } from '../models/user'; // Import User model
import crypto from 'crypto';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.production' });

const router = express.Router();

// Replace the existing getServer initialization with these static instances and function
const testnetServer = new StellarSdk.Horizon.Server(process.env.STELLAR_TESTNET_URL as string);
const mainnetServer = new StellarSdk.Horizon.Server(process.env.STELLAR_MAINNET_URL as string);

const getServer = (network: string = 'testnet'): typeof testnetServer => {
    return network === 'mainnet' ? mainnetServer : testnetServer;
};

// Get network-specific encryption key
const getEncryptionKey = (network: string = 'testnet'): string => {
  const key = network === 'mainnet' 
    ? process.env.ENCRYPTION_SECRET_KEY_MAINNET 
    : process.env.ENCRYPTION_SECRET_KEY_TESTNET;
  
  if (!key) {
    throw new Error(`Encryption key for ${network} not found in environment variables`);
  }
  return key;
};

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

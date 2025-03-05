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
    const { email, network = 'testnet', currency } = req.body;

    // Validate currency
    if (!currency || !['USDC', 'EURC'].includes(currency)) {
      return res.status(400).json({ error: 'Invalid or missing currency. Must be either USDC or EURC' });
    }

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

    // USDC asset details - hardcoded since they are public information
    const circleUsdcIssuer = network === 'mainnet' 
      ? 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN'  // Mainnet
      : 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5'; // Testnet

    const circleEurcIssuer = network === 'mainnet'
      ? 'GC3ZXWQT2T55O3KVLZCGK7QEJQGWYPUK5XVVLPI3VFHPV5WXGEBQBPLS'  // Mainnet
      : 'GAKNDFRRWA3RPWNLTI3G4EBSD3RGNZZOY5WKWYMQ6CQTG3KIEKPYWAYC'; // Testnet

    // Create the requested asset
    const issuer = currency === 'USDC' ? circleUsdcIssuer : circleEurcIssuer;
    const asset = new StellarSdk.Asset(currency, issuer);

    // Check if the trustline already exists
    const hasTrustline = account.balances.some((balance: Balance) => 
      balance.asset_code === currency && balance.asset_issuer === issuer
    );

    // If trustline exists, return without making a transaction
    if (hasTrustline) {
      return res.status(200).json({
        message: `${currency} trustline already exists`,
        publicKey: account.id,
        hasTrustline: true
      });
    }

    // Create transaction for the trustline
    const transaction = new StellarSdk.TransactionBuilder(account, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: network === 'mainnet' ? StellarSdk.Networks.PUBLIC : StellarSdk.Networks.TESTNET,
    })
      .addOperation(StellarSdk.Operation.changeTrust({
        asset: asset,
      }))
      .setTimeout(30)
      .build();

    transaction.sign(sourceKeypair);

    const result = await server.submitTransaction(transaction);

    return res.status(200).json({
      message: `${currency} trustline created successfully`,
      result,
      publicKey: account.id,
      hasTrustline: true
    });
  } catch (error) {
    const err = error as Error;
    console.error('Error creating trustline:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

export default router;

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

export const decryptPrivateKey = (encryptedPrivateKey: string, network: string = 'testnet'): string => {
  const encryptionKey = getEncryptionKey(network);
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

// Asset configuration
const USDC_ISSUER = 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';
const USDC_CODE = 'USDC';

// Withdraw route
router.post('/', async (req: Request, res: Response) => {
  try {
    const { email, amount, xlmAddress: destinationAddress, network = 'testnet', assetType = 'XLM' } = req.body;

    // Add network validation
    if (network && !['mainnet', 'testnet'].includes(network)) {
      return res.status(400).json({ error: 'Invalid network parameter. Use "mainnet" or "testnet"' });
    }

    // Validate asset type
    if (!['XLM', 'USDC'].includes(assetType)) {
      return res.status(400).json({ error: 'Invalid asset type. Use "XLM" or "USDC"' });
    }

    // Get the appropriate server instance
    const server = getServer(network);

    // Log the incoming request data
    console.log('Received withdrawal request:', { email, amount, destinationAddress, assetType });

    // Validate amount
    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    // Ensure amount is a string for Stellar (e.g., "1.5" not 1.5)
    const formattedAmount = parseFloat(amount).toFixed(7); // Stellar expects up to 7 decimal places

    // Validate the Stellar address
    if (!StellarSdk.StrKey.isValidEd25519PublicKey(destinationAddress)) {
      return res.status(400).json({ error: 'Invalid Stellar address' });
    }

    // Fetch the user from the database
    const user = await User.findOne({ email });
    if (!user) {
      console.log('User not found:', email);
      return res.status(404).json({ error: 'User not found' });
    }

    // Replace the privateKeyXlm check with network-specific check
    const privateKey = network === 'mainnet' ? user.privateKeyXlmMainnet : user.privateKeyXlmTestnet;
    if (!privateKey) {
      console.log(`Private key for ${network} not found for user:`, email);
      return res.status(400).json({ error: `Private key for ${network} not available` });
    }

    // Decrypt the user's private key
    console.log(`Decrypting ${network} private key for user:`, email);
    const decryptedPrivateKey = decryptPrivateKey(privateKey, network);
    console.log(`Decrypted ${network} private key for user:`, email);

    // Create the Stellar keypair from the decrypted private key
    const sourceKeypair = StellarSdk.Keypair.fromSecret(decryptedPrivateKey);

    // Load the user's account from the Stellar network
    console.log('Loading Stellar account for public key:', sourceKeypair.publicKey());
    const account = await server.loadAccount(sourceKeypair.publicKey());
    console.log('Loaded Stellar account:', account.id);

    // Check if destination account exists
    try {
        console.log('Verifying destination account exists:', destinationAddress);
        const destinationAccount = await server.loadAccount(destinationAddress);
        console.log('Destination account verified:', destinationAccount.id);
        
        // If USDC, check if destination has trustline
        if (assetType === 'USDC') {
            const hasTrustline = destinationAccount.balances.some(
                (balance: any) => 
                    balance.asset_type !== 'native' && 
                    balance.asset_code === USDC_CODE && 
                    balance.asset_issuer === USDC_ISSUER
            );
            
            if (!hasTrustline) {
                return res.status(400).json({ 
                    error: 'Destination account does not have a trustline for USDC' 
                });
            }
        }
    } catch (error) {
        console.error('Error verifying destination account:', error);
        return res.status(400).json({ 
            error: 'Destination account does not exist. The recipient must create a Stellar account before they can receive funds.' 
        });
    }

    // Determine the asset to use
    const asset = assetType === 'XLM' 
      ? StellarSdk.Asset.native()
      : new StellarSdk.Asset(USDC_CODE, USDC_ISSUER);

    // Create a transaction
    console.log('Building transaction to send', assetType);
    const transaction = new StellarSdk.TransactionBuilder(account, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: network === 'mainnet' ? StellarSdk.Networks.PUBLIC : StellarSdk.Networks.TESTNET,
    })
      .addOperation(
        StellarSdk.Operation.payment({
          destination: destinationAddress,
          asset: asset,
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
      
      // Check for Horizon API error response
      const horizonError = error as any;
      if (horizonError.response?.data?.extras?.result_codes) {
        const resultCodes = horizonError.response.data.extras.result_codes;
        
        // Handle specific operation errors
        if (resultCodes.operations?.includes('op_no_destination')) {
          return res.status(400).json({ 
            error: 'Destination account does not exist. The recipient must create a Stellar account before they can receive funds.',
            details: resultCodes
          });
        }
        
        // Return the specific error codes for other cases
        return res.status(400).json({ 
          error: 'Transaction failed',
          details: resultCodes
        });
      }
      
      return res.status(500).json({ error: error.message });
    } else {
      console.error('Unexpected error:', error);
      return res.status(500).json({ error: 'Failed to process withdrawal' });
    }
  }
});

export default router;

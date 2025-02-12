import express, { Request, Response } from 'express';
import StellarSdk from '@stellar/stellar-sdk';
import { User } from '../models/user';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { z } from 'zod';
import BigNumber from 'bignumber.js';
import { validateRequest } from '../middleware/validateRequest';

// Load environment variables
dotenv.config({ path: '.env.production' });

// Debug helper
const debug = (message: string, data?: any) => {
  console.log(`[Swap Route Debug] ${message}`, data ? JSON.stringify(data, null, 2) : '');
};

const router = express.Router();

// Static server instances
const testnetServer = new StellarSdk.Horizon.Server(process.env.STELLAR_TESTNET_URL as string);
const mainnetServer = new StellarSdk.Horizon.Server(process.env.STELLAR_MAINNET_URL as string);

const getServer = (network: string = 'mainnet'): typeof testnetServer => {
    return network === 'mainnet' ? mainnetServer : testnetServer;
};

// Get network-specific encryption key
const getEncryptionKey = (network: string = 'mainnet'): string => {
  const key = network === 'mainnet' 
    ? process.env.ENCRYPTION_SECRET_KEY_MAINNET 
    : process.env.ENCRYPTION_SECRET_KEY_TESTNET;
  
  if (!key) {
    throw new Error(`Encryption key for ${network} not found in environment variables`);
  }
  return key;
};

const decryptPrivateKey = (encryptedPrivateKey: string, network: string = 'mainnet'): string => {
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

// Asset configuration
const getUsdcIssuer = (network: string = 'mainnet'): string => {
  const issuer = network === 'mainnet' 
    ? process.env.CIRCLE_USDC_ISSUER_MAINNET 
    : process.env.CIRCLE_USDC_ISSUER_TESTNET;
  
  if (!issuer) {
    throw new Error(`USDC issuer for ${network} not found in environment variables`);
  }
  return issuer;
};

const USDC_CODE = 'USDC';

// Validation schemas
const AssetSchema = z.object({
  code: z.string(),
  issuer: z.string().nullable().optional()
}).refine(data => {
  const normalizedCode = data.code.toLowerCase();
  // Allow missing or null issuer for XLM/native assets
  if (normalizedCode === 'xlm' || normalizedCode === 'native') {
    return true;
  }
  // Require non-null issuer for all other assets
  return !!data.issuer;
}, {
  message: "Issuer is required for non-native assets"
});

const SwapRequestSchema = z.object({
  email: z.string().email(),
  sourceAsset: AssetSchema,
  destinationAsset: AssetSchema,
  amount: z.string().regex(/^\d*\.?\d{0,7}$/),
  memo: z.string().max(28).optional(),
  network: z.enum(['mainnet', 'testnet']).optional().default('mainnet'),
  slippageTolerance: z.number().min(0.01).max(100).optional().default(2)
});

const EstimateRequestSchema = z.object({
  email: z.string().email(),
  sourceAsset: AssetSchema,
  destinationAsset: AssetSchema,
  amount: z.string(),
  network: z.enum(['testnet', 'mainnet']),
  sendExact: z.boolean()
});

// Helper function to create Stellar Asset object
function createStellarAsset(asset: { code: string; issuer?: string }, network: string): typeof StellarSdk.Asset {
  if (asset.code.toLowerCase() === 'xlm' || asset.code.toLowerCase() === 'native') {
      return StellarSdk.Asset.native();
  }
  if (asset.code === 'USDC') {
    return new StellarSdk.Asset(USDC_CODE, getUsdcIssuer(network));
  }
  if (!asset.issuer) {
      throw new Error('Issuer is required for non-native assets');
  }
  return new StellarSdk.Asset(asset.code, asset.issuer);
}

// Helper function to establish trustline
async function establishTrustline(
  server: typeof testnetServer,
  account: any,
  asset: typeof StellarSdk.Asset,
  sourceKeypair: typeof StellarSdk.Keypair,
  network: string
): Promise<void> {
  if (asset.isNative()) return; // No trustline needed for XLM

  const transaction = new StellarSdk.TransactionBuilder(account, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: network === 'mainnet' ? StellarSdk.Networks.PUBLIC : StellarSdk.Networks.TESTNET,
  })
    .addOperation(
      StellarSdk.Operation.changeTrust({
        asset,
        limit: '922337203685.4775807' // Maximum limit
      })
    )
    .setTimeout(30)
    .build();

  transaction.sign(sourceKeypair);
  await server.submitTransaction(transaction);
}

// Helper function to check if trustline exists
const hasTrustline = (account: any, asset: typeof StellarSdk.Asset): boolean => {
  if (asset.isNative()) return true; // XLM doesn't need trustline
  return account.balances.some((balance: any) => 
    balance.asset_type !== 'native' &&
    balance.asset_code === asset.getCode() &&
    balance.asset_issuer === asset.getIssuer()
  );
};

// Add estimation route before swap execution
router.post('/estimate', validateRequest(EstimateRequestSchema), async (req: Request, res: Response) => {
  console.log('Estimate request body:', JSON.stringify(req.body, null, 2));
  debug('Received estimation request', { 
    body: req.body,
    sourceAssetType: typeof req.body?.sourceAsset?.code,
    destAssetType: typeof req.body?.destinationAsset?.code,
    amountType: typeof req.body?.amount,
    networkType: typeof req.body?.network,
    sendExactType: typeof req.body?.sendExact
  });
  try {
    const { 
      email, 
      sourceAsset,
      destinationAsset, 
      amount, 
      network = 'mainnet',
      sendExact = false
    } = req.body;

    // Get the appropriate server instance
    const server = getServer(network);
    
    // Create source and destination assets
    const srcAsset = createStellarAsset(sourceAsset, network);
    const destAsset = createStellarAsset(destinationAsset, network);

    // Format amount to 7 decimal places
    const formattedAmount = parseFloat(amount).toFixed(7);

    let paths;
    if (sendExact) {
      // User wants to receive exact amount
      paths = await server.strictReceivePaths(
        [srcAsset],
        destAsset,
        formattedAmount
      ).call();
    } else {
      // User wants to send exact amount
      paths = await server.strictSendPaths(
        srcAsset,
        formattedAmount,
        [destAsset]
      ).call();
    }

    if (!paths.records.length) {
      debug('No paths found');
      return res.status(400).json({
        error: 'No valid path found for the swap'
      });
    }

    // Get the best path (first path is usually the best)
    const bestPath = paths.records[0];
    
    return res.status(200).json({
      estimated_amount: sendExact ? bestPath.source_amount : bestPath.destination_amount,
      path: bestPath.path
    });

  } catch (error: unknown) {
    debug('Error processing estimation', { 
      name: error instanceof Error ? error.name : 'Unknown error',
      message: error instanceof Error ? error.message : String(error)
    });
    
    if (error instanceof Error) {
      return res.status(500).json({ error: error.message });
    } else {
      return res.status(500).json({ error: 'Failed to process estimation' });
    }
  }
});

// Swap route
router.post('/', validateRequest(SwapRequestSchema), async (req: Request, res: Response) => {
  console.log('Received swap request');
  debug('Starting swap process', { body: req.body });
  try {
    const { 
      email, 
      sourceAsset,
      destinationAsset, 
      amount, 
      memo, 
      network = 'mainnet',
      slippageTolerance = 2 
    } = req.body;

    debug('Parsed request parameters', { email, sourceAsset, destinationAsset, amount, network });

    // Get the appropriate server instance
    const server = getServer(network);
    debug('Using server', { network, url: server.serverURL });

    // Validate amount
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      debug('Invalid amount');
      return res.status(400).json({ error: 'Invalid amount' });
    }

    // Ensure amount is a string for Stellar
    const formattedAmount = parseFloat(amount).toFixed(7);

    // Fetch the user from the database
    const user = await User.findOne({ email });
    if (!user) {
      debug('User not found', { email });
      return res.status(404).json({ error: 'User not found' });
    }
    debug('Found user', { userId: user._id });

    // Get and decrypt the network-specific private key
    const privateKey = network === 'mainnet' ? user.privateKeyXlmMainnet : user.privateKeyXlmTestnet;
    if (!privateKey) {
      debug('Private key not found for user', { email, network });
      return res.status(400).json({ error: `Private key for ${network} not available` });
    }

    // Decrypt the user's private key
    debug('Decrypting private key');
    const decryptedPrivateKey = decryptPrivateKey(privateKey, network);
    debug('Decrypted private key');

    // Create the Stellar keypair from the decrypted private key
    const sourceKeypair = StellarSdk.Keypair.fromSecret(decryptedPrivateKey);

    // Load the user's account
    debug('Loading account', { publicKey: sourceKeypair.publicKey() });
    let account = await server.loadAccount(sourceKeypair.publicKey());
    debug('Account loaded successfully', { 
      sequence: account.sequence,
      balances: account.balances
    });

    // Create source and destination assets
    const srcAsset = sourceAsset.code === 'USDC' 
      ? new StellarSdk.Asset(USDC_CODE, getUsdcIssuer(network))
      : StellarSdk.Asset.native();
      
    const destAsset = destinationAsset.code === 'USDC'
      ? new StellarSdk.Asset(USDC_CODE, getUsdcIssuer(network))
      : StellarSdk.Asset.native();

    debug('Created assets', { 
      sourceAsset: { 
        code: srcAsset.getCode(), 
        issuer: srcAsset.isNative() ? 'native' : srcAsset.getIssuer() 
      },
      destinationAsset: { 
        code: destAsset.getCode(), 
        issuer: destAsset.isNative() ? 'native' : destAsset.getIssuer() 
      },
      network
    });

    // Check if account has required trustlines
    const accountBalances = account.balances;
    
    // Check source asset trustline
    if (!hasTrustline(account, srcAsset)) {
      debug('No trustline for source asset', {
        asset: srcAsset.getCode(),
        issuer: srcAsset.getIssuer()
      });
      await establishTrustline(server, account, srcAsset, sourceKeypair, network);
      debug('Established trustline for source asset');
      
      // Reload account after establishing trustline
      account = await server.loadAccount(sourceKeypair.publicKey());
      debug('Reloaded account after source trustline');
    }

    // Check destination asset trustline
    if (!hasTrustline(account, destAsset)) {
      debug('No trustline for destination asset', {
        asset: destAsset.getCode(),
        issuer: destAsset.getIssuer()
      });
      await establishTrustline(server, account, destAsset, sourceKeypair, network);
      debug('Established trustline for destination asset');
      
      // Reload account after establishing trustline
      account = await server.loadAccount(sourceKeypair.publicKey());
      debug('Reloaded account after destination trustline');
    }

    // Check if account has sufficient balance for source asset
    const sourceBalance = account.balances.find((b: any) => {
      if (srcAsset.isNative()) return b.asset_type === 'native';
      return b.asset_code === srcAsset.getCode() && b.asset_issuer === srcAsset.getIssuer();
    });

    if (!sourceBalance) {
      debug('No balance found for source asset');
      return res.status(400).json({ error: `No ${srcAsset.getCode()} balance found in account` });
    }

    // Calculate available balance considering minimum reserve if source is XLM
    let availableBalance = parseFloat(sourceBalance.balance);
    if (srcAsset.isNative()) {
      const minimumBalance = 2.0001; // 2 XLM reserve + 0.0001 transaction fee
      availableBalance -= minimumBalance;
    }
    
    if (parseFloat(formattedAmount) > availableBalance) {
      debug('Insufficient balance', {
        asset: srcAsset.getCode(),
        required: formattedAmount,
        available: availableBalance.toFixed(7),
        total: sourceBalance.balance
      });
      return res.status(400).json({ 
        error: `Insufficient ${srcAsset.getCode()} balance`,
        details: {
          required: formattedAmount,
          available: availableBalance.toFixed(7),
          total: sourceBalance.balance
        }
      });
    }

    // Find the best path for the swap
    debug('Finding paths', { sourceAsset: srcAsset, destinationAsset: destAsset, amount });
    const paths = await server.strictReceivePaths(
      [srcAsset],
      destAsset,
      formattedAmount
    ).call();

    if (!paths.records.length) {
      debug('No paths found');
      return res.status(400).json({
        error: 'No valid path found for the swap'
      });
    }

    // Get the best path (first path is usually the best)
    const bestPath = paths.records[0];
    debug('Found paths', { 
      pathCount: paths.records.length,
      firstPath: paths.records[0]
    });

    // Calculate the source amount needed with some slippage tolerance
    const sourceAmount = bestPath.source_amount;
    const maxSourceAmount = new BigNumber(sourceAmount)
      .times(1 + slippageTolerance / 100)
      .toFixed(7);

    // Set the network for the SDK
    StellarSdk.Network.use(
      network === 'mainnet' 
        ? new StellarSdk.Network(StellarSdk.Networks.PUBLIC)
        : new StellarSdk.Network(StellarSdk.Networks.TESTNET)
    );

    // Build the transaction
    const transaction = new StellarSdk.TransactionBuilder(account, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: network === 'mainnet' ? StellarSdk.Networks.PUBLIC : StellarSdk.Networks.TESTNET,
    })
      .addOperation(
        StellarSdk.Operation.pathPaymentStrictReceive({
          sendAsset: srcAsset,
          sendMax: maxSourceAmount,  // Always use maxSourceAmount for sendMax
          destination: sourceKeypair.publicKey(),
          destAsset: destAsset,
          destAmount: formattedAmount,
          path: bestPath.path.map((asset: any) => 
            new StellarSdk.Asset(asset.asset_code || 'XLM', asset.asset_issuer)
          )
        })
      )
      .setTimeout(30)
      .build();

    debug('Built transaction');

    if (memo) {
      transaction.addMemo(StellarSdk.Memo.text(memo));
    }

    // Sign and submit the transaction
    debug('Signing transaction');
    transaction.sign(sourceKeypair);
    debug('Submitting transaction');
    const result = await server.submitTransaction(transaction);

    debug('Transaction submitted successfully', { 
      hash: result.hash,
      ledger: result.ledger
    });

    return res.status(200).json({ 
      message: 'Swap successful', 
      result,
      estimated_destination_amount: bestPath.destination_amount,
      minimum_destination_amount: formattedAmount,
      path: bestPath.path
    });

  } catch (error: unknown) {
    debug('Error processing swap', { 
      name: error instanceof Error ? error.name : 'Unknown error',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : 'No stack trace'
    });
    
    if (error instanceof Error) {
      return res.status(500).json({ error: error.message });
    } else {
      return res.status(500).json({ error: 'Failed to process swap' });
    }
  }
});

export default router;
import * as express from 'express';
import StellarSdk from '@stellar/stellar-sdk';
import { Agreement } from '../models/agreements';
import { z } from 'zod';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.production' });

const { Networks, TransactionBuilder, Operation, TimeoutInfinite, xdr, Keypair, SorobanRpc } = StellarSdk;

const router = express.Router();

// Validation schema for contract deployment
const DeployContractSchema = z.object({
  contractId: z.string(),
  network: z.enum(['testnet', 'mainnet']).default('mainnet'),
  wasm: z.string().optional(),
});

// Validation schema for contract invocation
const InvokeContractSchema = z.object({
  contractId: z.string(),
  network: z.enum(['testnet', 'mainnet']).default('mainnet'),
  method: z.string(),
  args: z.array(z.any()).optional(),
});

// Helper to get the appropriate server
export const getServer = (network: string = 'mainnet'): typeof StellarSdk.Horizon.Server => {
  const serverUrl = network === 'mainnet' 
    ? process.env.STELLAR_MAINNET_URL 
    : process.env.STELLAR_TESTNET_URL;
  return new StellarSdk.Horizon.Server(serverUrl as string);
};

// Helper to get the appropriate network passphrase
const getNetworkPassphrase = (network: string = 'mainnet'): string => {
  return network === 'mainnet' ? Networks.PUBLIC : Networks.TESTNET;
};

// Deploy agreement as smart contract
router.post('/deploy', async (req: express.Request, res: express.Response) => {
  try {
    const { contractId, network, wasm } = DeployContractSchema.parse(req.body);

    // Get the agreement from database
    const agreement = await Agreement.findOne({ contractID: contractId });
    if (!agreement) {
      return res.status(404).json({ error: 'Agreement not found' });
    }

    const server = getServer(network);
    const networkPassphrase = getNetworkPassphrase(network);

    // Get the source account
    const sourceKeypair = Keypair.fromSecret(
      network === 'mainnet' 
        ? process.env.STELLAR_SECRET_KEY_MAINNET as string
        : process.env.STELLAR_SECRET_KEY_TESTNET as string
    );
    const source = await server.loadAccount(sourceKeypair.publicKey());

    // Create contract deployment transaction
    const transaction = new TransactionBuilder(source, {
      fee: '100',
      networkPassphrase
    })
    .addOperation(Operation.deployContract({
      sourceAccount: sourceKeypair.publicKey(),
      wasm: wasm || agreement.terms // Use provided WASM or convert agreement terms to WASM
    }))
    .setTimeout(TimeoutInfinite)
    .build();

    transaction.sign(sourceKeypair);
    const response = await server.submitTransaction(transaction);

    return res.status(200).json({
      message: 'Contract deployed successfully',
      hash: response.hash,
      contractId
    });

  } catch (error: any) {
    console.error('Error deploying contract:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Invoke contract method
router.post('/invoke', async (req: express.Request, res: express.Response) => {
  try {
    const { contractId, network, method, args } = InvokeContractSchema.parse(req.body);

    // Get the agreement
    const agreement = await Agreement.findOne({ contractID: contractId });
    if (!agreement) {
      return res.status(404).json({ error: 'Agreement not found' });
    }

    const server = getServer(network);
    const networkPassphrase = getNetworkPassphrase(network);

    // Get the source account
    const sourceKeypair = Keypair.fromSecret(
      network === 'mainnet'
        ? process.env.STELLAR_SECRET_KEY_MAINNET as string
        : process.env.STELLAR_SECRET_KEY_TESTNET as string
    );
    const source = await server.loadAccount(sourceKeypair.publicKey());

    // Create contract instance
    const contract = new SorobanRpc(server).getContract(contractId);

    // Prepare contract parameters
    const params = args?.map(arg => {
      if (typeof arg === 'string') {
        return xdr.ScVal.scvString(arg);
      } else if (typeof arg === 'number') {
        return xdr.ScVal.scvI32(arg);
      }
      return xdr.ScVal.scvString(JSON.stringify(arg));
    }) || [];

    // Create contract invocation transaction
    const transaction = new TransactionBuilder(source, {
      fee: '100',
      networkPassphrase
    })
    .addOperation(Operation.invokeContractFunction({
      contract: contractId,
      function: method,
      args: params
    }))
    .setTimeout(TimeoutInfinite)
    .build();

    transaction.sign(sourceKeypair);
    const response = await server.submitTransaction(transaction);

    // Wait for transaction completion
    let result;
    if (response.status === "PENDING") {
      let attempts = 0;
      while (attempts < 10) {
        const tx = await server.getTransaction(response.hash);
        if (tx.status === "SUCCESS") {
          result = tx;
          break;
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;
      }
    }

    return res.status(200).json({
      message: 'Contract method invoked successfully',
      hash: response.hash,
      result: result || response,
      contractId
    });

  } catch (error: any) {
    console.error('Error invoking contract:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Get contract state
router.get('/state/:contractId', async (req: express.Request, res: express.Response) => {
  try {
    const { contractId } = req.params;
    const { network = 'mainnet' } = req.query;

    const server = getServer(network as string);
    const rpc = new SorobanRpc(server);
    const contract = rpc.getContract(contractId);

    const ledgerKey = xdr.LedgerKey.contractData(new xdr.LedgerKeyContractData({
      contract: contractId,
      key: xdr.ScVal.scvString("state"),
      durability: xdr.ContractDataDurability.persistent()
    }));

    const response = await server.getLedgerEntry(ledgerKey);
    
    return res.status(200).json({
      contractId,
      state: response
    });

  } catch (error: any) {
    console.error('Error getting contract state:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Get contract metadata
router.get('/metadata/:contractId', async (req: express.Request, res: express.Response) => {
  try {
    const { contractId } = req.params;
    const { network = 'mainnet' } = req.query;

    const server = getServer(network as string);
    const rpc = new SorobanRpc(server);
    const metadata = await rpc.getContractMetadata(contractId);

    return res.status(200).json({
      contractId,
      metadata
    });

  } catch (error: any) {
    console.error('Error getting contract metadata:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Get contract source
router.get('/source/:contractId', async (req: express.Request, res: express.Response) => {
  try {
    const { contractId } = req.params;
    const { network = 'mainnet' } = req.query;

    const server = getServer(network as string);
    const rpc = new SorobanRpc(server);
    const source = await rpc.getContractSource(contractId);

    return res.status(200).json({
      contractId,
      source
    });

  } catch (error: any) {
    console.error('Error getting contract source:', error);
    return res.status(500).json({ error: error.message });
  }
});

export default router;
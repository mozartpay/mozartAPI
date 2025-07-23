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

// Validation schema for transaction simulation
const SimulateContractSchema = z.object({
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

// Helper to get the Soroban RPC URL
export const getSorobanRpcUrl = (network: string = 'mainnet'): string => {
  // Use Gateway RPC endpoints which support both mainnet and testnet
  return network === 'mainnet'
    ? 'https://soroban-rpc.mainnet.stellar.gateway.fm'
    : 'https://soroban-rpc.testnet.stellar.gateway.fm';
};

// Get available RPC networks
router.get('/networks', async (req: express.Request, res: express.Response) => {
  try {
    // Define available networks with their RPC endpoints
    const networks = {
      mainnet: {
        name: 'Mainnet',
        rpcUrl: 'https://soroban-rpc.mainnet.stellar.gateway.fm',
        description: 'Stellar mainnet production network'
      },
      testnet: {
        name: 'Testnet',
        rpcUrl: 'https://soroban-rpc.testnet.stellar.gateway.fm',
        description: 'Stellar testnet for development and testing'
      }
    };
    
    return res.status(200).json({
      networks
    });
  } catch (error: any) {
    console.error('Error getting RPC networks:', error);
    return res.status(500).json({ error: error.message });
  }
});

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

    // Create contract instance using the updated SorobanRpc.Server
    const rpcServer = new StellarSdk.SorobanRpc.Server(
      network === 'mainnet' 
        ? process.env.STELLAR_MAINNET_URL as string
        : process.env.STELLAR_TESTNET_URL as string
    );
    
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

    // Get the correct Soroban RPC URL
    const rpcUrl = getSorobanRpcUrl(network as string);
    
    // Make a direct HTTP request to Soroban RPC
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getLedgerEntries',
        params: [[{
          contractData: {
            contractId: contractId,
            key: { type: 'ledgerKeyContractInstance' }
          }
        }]]
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error.message || 'Error getting contract state');
    }
    
    return res.status(200).json({
      contractId,
      state: data.result
    });
  } catch (error: any) {
    console.error('Error getting contract state:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Get contract source
router.get('/source/:contractId', async (req: express.Request, res: express.Response) => {
  try {
    const { contractId } = req.params;
    const { network = 'mainnet' } = req.query;

    // Get the correct Soroban RPC URL
    const rpcUrl = getSorobanRpcUrl(network as string);
    
    // Make a direct HTTP request to Soroban RPC
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getContractCode',
        params: [contractId]
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error.message || 'Error getting contract source');
    }
    
    return res.status(200).json({
      contractId,
      source: data.result
    });
  } catch (error: any) {
    console.error('Error getting contract source:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Get contract metadata
router.get('/metadata/:contractId', async (req: express.Request, res: express.Response) => {
  try {
    const { contractId } = req.params;
    const { network = 'mainnet' } = req.query;

    // Get the correct Soroban RPC URL
    const rpcUrl = getSorobanRpcUrl(network as string);
    console.log(`Using Soroban RPC URL: ${rpcUrl}`);
    
    // Get the latest ledger information
    const ledgerResponse = await fetch(rpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getLatestLedger'
      })
    });
    
    const ledgerData = await ledgerResponse.json();
    
    if (ledgerData.error) {
      throw new Error(`RPC error: ${ledgerData.error.message}`);
    }
    
    // Get network information
    const networkResponse = await fetch(rpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getNetwork'
      })
    });
    
    const networkData = await networkResponse.json();
    
    // Get health information
    const healthResponse = await fetch(rpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getHealth'
      })
    });
    
    const healthData = await healthResponse.json();
    
    // Try to get events with proper parameters
    const eventsResponse = await fetch(rpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getEvents',
        params: {
          startLedger: healthData.result?.oldestLedger || 1,
          filters: [
            {
              type: 'contract',
              contractIds: [contractId]
            }
          ],
          pagination: {
            limit: 10
          }
        }
      })
    });
    
    let eventsData;
    try {
      eventsData = await eventsResponse.json();
    } catch (error) {
      eventsData = { error: { message: 'Failed to parse events response' } };
    }
    
    // Try to get the contract data using Horizon API instead
    let horizonData = null;
    let horizonError = null;
    
    try {
      const server = getServer(network as string);
      const accountResponse = await server.accounts().accountId(contractId).call();
      horizonData = accountResponse;
    } catch (error: any) {
      horizonError = error.message;
    }
    
    return res.status(200).json({
      contractId,
      rpcStatus: 'connected',
      network: networkData.result,
      latestLedger: ledgerData.result,
      health: healthData.result,
      eventsData: eventsData.error ? null : eventsData.result,
      eventsError: eventsData.error ? eventsData.error.message : null,
      horizonData,
      horizonError
    });
  } catch (error: any) {
    console.error('Error getting contract metadata:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Add a new endpoint to test RPC connectivity
router.get('/health', async (req: express.Request, res: express.Response) => {
  try {
    const { network = 'mainnet' } = req.query;
    const rpcUrl = getSorobanRpcUrl(network as string);
    
    // Try several common RPC methods to see which ones work
    const methodsToTry = [
      'getLatestLedger',
      'getNetwork',
      'getHealth',
      'getTransactionStatus',
      'getEvents',
      'getTransaction'
    ];
    
    const results: Record<string, any> = {};
    
    for (const method of methodsToTry) {
      try {
        const response = await fetch(rpcUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method
          })
        });
        
        const data = await response.json();
        results[method] = {
          success: !data.error,
          result: data.error ? data.error.message : data.result
        };
      } catch (error: any) {
        results[method] = {
          success: false,
          error: error.message
        };
      }
    }
    
    // Try to get the contract data for a specific contract ID
    try {
      const response = await fetch(rpcUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getAccount',
          params: ['CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC']
        })
      });
      
      const data = await response.json();
      results['getAccount'] = {
        success: !data.error,
        result: data.error ? data.error.message : data.result
      };
    } catch (error: any) {
      results['getAccount'] = {
        success: false,
        error: error.message
      };
    }
    
    return res.status(200).json({
      status: 'ok',
      rpcUrl,
      methodResults: results
    });
  } catch (error: any) {
    console.error('Error checking RPC health:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Get contract source
router.get('/source/:contractId', async (req: express.Request, res: express.Response) => {
  try {
    const { contractId } = req.params;
    const { network = 'mainnet' } = req.query;

    // Create a SorobanRpc.Server instance directly
    const rpcServer = new StellarSdk.SorobanRpc.Server(
      network === 'mainnet' 
        ? process.env.STELLAR_MAINNET_URL as string
        : process.env.STELLAR_TESTNET_URL as string
    );
    
    // Use the appropriate method for getting contract source
    const source = await rpcServer.getContractCode(contractId);

    return res.status(200).json({
      contractId,
      source
    });

  } catch (error: any) {
    console.error('Error getting contract source:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Get available RPC methods
router.get('/rpc-methods', async (req: express.Request, res: express.Response) => {
  try {
    const { network = 'mainnet' } = req.query;

    // Get the correct Soroban RPC URL
    const rpcUrl = getSorobanRpcUrl(network as string);
    
    // Make a direct HTTP request to Soroban RPC
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'rpc.discover'
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error.message || 'Error getting RPC methods');
    }
    
    return res.status(200).json({
      methods: data.result
    });
  } catch (error: any) {
    console.error('Error getting RPC methods:', error);
    return res.status(500).json({ error: error.message });
  }
});

export default router;

// Simulate contract method invocation
router.post('/simulate', async (req: express.Request, res: express.Response) => {
  try {
    const { contractId, network, method, args } = SimulateContractSchema.parse(req.body);

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

    // Get the correct Soroban RPC URL
    const rpcUrl = getSorobanRpcUrl(network);
    
    // Simulate the transaction using Soroban RPC
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'simulateTransaction',
        params: {
          transaction: transaction.toXDR(),
          resourceConfig: {
            instructionLeeway: 100000000
          }
        }
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error.message || 'Error simulating transaction');
    }

    return res.status(200).json({
      message: 'Contract method simulation successful',
      contractId,
      method,
      simulationResult: data.result
    });

  } catch (error: any) {
    console.error('Error simulating contract method:', error);
    return res.status(500).json({ error: error.message });
  }
});
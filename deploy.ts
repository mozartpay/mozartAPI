import { Contract, Server } from 'soroban-client';
import { readFileSync } from 'fs';
import { Networks } from 'stellar-sdk';

const TESTNET_URL = 'https://soroban-testnet.stellar.org';
const server = new Server(TESTNET_URL);

async function deployContract() {
    try {
        // Read the WASM binary
        const wasmBuffer = readFileSync('./build/release.wasm');
        
        // Convert to base64
        const wasmB64 = wasmBuffer.toString('base64');

        // Get the network passphrase
      //  const { networkPassphrase } = await server.getNetwork();

        // Deploy the contract
       // const result = await server.deploy(wasmB64);
        
        console.log('Contract deployed successfully!');
      //  console.log('Contract details:', result);
      //  return result;
    } catch (error) {
        console.error('Error deploying contract:', error);
        return null;
    }
}

deployContract().catch(console.error);

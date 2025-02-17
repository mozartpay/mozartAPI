import axios from 'axios';
import { config } from './config';

interface VaultResponse {
    vaultAccountId: string;
    name: string;
    // Add other expected vault properties here
}

async function testCreateVault(): Promise<void> {
    console.log('API Keys:', {
        apiKey: config.apiKey,
        fireblocksApiKey: config.fireblocks.apiKey
    });
    console.log('Running testCreateVault with API Key:', config.apiKey);
    try {
        const response = await axios.post<VaultResponse>('http://localhost:8000/api/vault', {
            name: `Test Vault ${new Date().toISOString()}`
        }, {
            headers: {
                'x-api-key': config.apiKey
            }
        });
        
        console.log('Vault created successfully:', response.data);
    } catch (error: any) {
        if (error.response) {
            console.error('Error creating vault:', error.response.data);
        } else {
            console.error('Unexpected error:', error.message);
        }
    }
}

// Run the test
testCreateVault();
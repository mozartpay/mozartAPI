import dotenv from 'dotenv';

// Load environment variables from .env.production
dotenv.config({ path: '.env.production' });

// Configuration settings
export const config = {
    // Add your configuration settings here
    // For example:
    apiKey: process.env.FIREBLOCKS_API_KEY || '',
    fireblocks: {
        apiSecret: process.env.FIREBLOCKS_API_SECRET || '',
        apiKey: process.env.FIREBLOCKS_API_KEY || '',
        apiBaseUrl: process.env.FIREBLOCKS_API_BASE_URL || 'https://api.fireblocks.io'
    },
    // Add other configuration values as needed
};
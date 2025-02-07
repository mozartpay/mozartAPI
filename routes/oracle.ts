import express from 'express';
import axios from 'axios';

const router = express.Router();

interface CurrencyData {
    id: string;
    rank: string;
    symbol: string;
    name: string;
    priceUsd: string;
    changePercent24Hr: string;
    volumeUsd24Hr: string;
    marketCapUsd: string;
}

interface ApiResponse<T> {
    data: T;
    timestamp: number;
}

// Cache configuration
const CACHE_DURATION = 30 * 1000; // 30 seconds
let cachedData: { [key: string]: { data: any; timestamp: number } } = {};

// Helper function to check if cache is valid
const isCacheValid = (key: string): boolean => {
    const cache = cachedData[key];
    return cache && (Date.now() - cache.timestamp) < CACHE_DURATION;
};

// Helper function to fetch data with caching
async function fetchWithCache<T>(url: string, cacheKey: string): Promise<T> {
    console.log(`[API Debug] Attempting to fetch data for cache key: ${cacheKey}`);

    if (isCacheValid(cacheKey)) {
        console.log(`[API Debug] Cache hit for key: ${cacheKey}`);
        const cachedValue = cachedData[cacheKey].data;
        console.log(`[API Debug] Cache age: ${Date.now() - cachedData[cacheKey].timestamp}ms`);
        return cachedValue;
    }

    console.log(`[API Debug] Cache miss or expired for key: ${cacheKey}. Fetching from API...`);
    
    try {
        const startTime = Date.now();
        const response = await axios.get<ApiResponse<T>>(url);
        const endTime = Date.now();
        
        console.log(`[API Debug] API call completed in ${endTime - startTime}ms for URL: ${url}`);
        console.log(`[API Debug] Response status: ${response.status}`);
        
        if (!response.data || !response.data.data) {
            console.warn(`[API Warning] Unexpected response structure from API: ${JSON.stringify(response.data)}`);
        }
        
        cachedData[cacheKey] = {
            data: response.data.data,
            timestamp: Date.now()
        };
        
        console.log(`[API Debug] Data successfully cached for key: ${cacheKey}`);
        console.log(`[API Debug] Response data structure: ${JSON.stringify(response.data.data).substring(0, 200)}...`);
        return response.data.data;
    } catch (error) {
        console.error(`[API Error] Failed to fetch data from ${url}:`, error);
        if (axios.isAxiosError(error)) {
            const errorMessage = `CoinCap API Error: ${error.response?.data?.message || error.message}`;
            console.error(`[API Error] ${errorMessage}`);
            console.error(`[API Error] Response status: ${error.response?.status}`);
            console.error(`[API Error] Response headers: ${JSON.stringify(error.response?.headers)}`);
            throw new Error(errorMessage);
        }
        throw error;
    }
}

// Get all available currencies
router.get('/currencies', async (req, res) => {
    console.log('Fetching all currencies...');
    try {
        const response = await fetchWithCache<CurrencyData[]>(
            'https://api.coincap.io/v2/assets',
            'all_currencies'
        );
        res.json(response);
    } catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error occurred' });
    }
});

// Get specific currency by ID
router.get('/currencies/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const response = await fetchWithCache<CurrencyData>(
            `https://api.coincap.io/v2/assets/${id}`,
            `currency_${id}`
        );
        res.json(response);
    } catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error occurred' });
    }
});

// Get top N currencies by market cap
router.get('/top/:limit', async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.params.limit), 100); // Cap at 100
        const response = await fetchWithCache<CurrencyData[]>(
            `https://api.coincap.io/v2/assets?limit=${limit}`,
            `top_${limit}`
        );
        res.json(response);
    } catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error occurred' });
    }
});

export default router;
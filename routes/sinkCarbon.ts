import express, { Request, Response } from 'express';
import axios from 'axios';
import StellarSdk from '@stellar/stellar-sdk';
import dotenv from 'dotenv';
import { User } from '../models/user';
import { decryptPrivateKey } from './withdraw';

const { Operation, Networks, StrKey, Keypair, Transaction, Asset, Horizon, BASE_FEE, TransactionBuilder } = StellarSdk;

// Load environment variables
dotenv.config({ path: '.env.production' });

const router = express.Router();

// Middleware to ensure proper body parsing
router.use(express.json());

// Middleware to validate request body
router.use('/sink-carbon/xdr', (req: Request, res: Response, next) => {
    if (req.method !== 'POST') {
        return next();
    }
    
    console.log('🔍 Request body validation middleware:', {
        contentType: req.headers['content-type'],
        bodyKeys: Object.keys(req.body),
        rawBody: JSON.stringify(req.body, null, 2)
    });
    
    if (!req.body || typeof req.body !== 'object') {
        return res.status(400).json({
            error: 'Invalid request body',
            details: 'Request body must be a valid JSON object'
        });
    }
    
    next();
});

// Static server instances
const testnetServer = new StellarSdk.Horizon.Server(process.env.STELLAR_TESTNET_URL as string);

// Asset configuration
const USDC_ISSUER = 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';

// Route to get carbon offset quote
router.post('/quote', async (req: Request, res: Response) => {
    const requestId = Math.random().toString(36).substring(7);
    console.log(`[${requestId}] 🌱 Carbon Quote Request`);
    console.log(`[${requestId}] Headers:`, {
        'content-type': req.headers['content-type'],
        'user-agent': req.headers['user-agent'],
        'origin': req.headers['origin']
    });
    console.log(`[${requestId}] Body:`, req.body);

    try {
        const { usdAmount } = req.body;

        // Validate amount
        if (!usdAmount || isNaN(usdAmount) || usdAmount <= 0) {
            console.log(`[${requestId}] ❌ Invalid amount provided:`, usdAmount);
            return res.status(400).json({ error: 'Invalid USD amount' });
        }

        // Calculate carbon offset amount (1% of input amount)
        // Ensure it meets the minimum requirement of $1.52
        const calculatedAmount = (usdAmount * 0.01);
        const minimumAmount = 1.52;
        const carbonOffsetAmount = calculatedAmount < minimumAmount ? minimumAmount : calculatedAmount;
        
        console.log(`[${requestId}] 📊 Amount calculations:`, {
            originalAmount: usdAmount,
            calculatedPercentage: calculatedAmount,
            minimumRequired: minimumAmount,
            finalAmount: carbonOffsetAmount
        });

        // Get quote from Stellar Carbon API
        try {
            const apiUrl = `https://api.stellarcarbon.io/test/carbon/usd-quote?usd_amount=${carbonOffsetAmount.toFixed(2)}`;
            console.log(`[${requestId}] 🌐 Requesting quote from Stellar Carbon API:`, apiUrl);
            
            const response = await axios.get(apiUrl, {
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });

            console.log(`[${requestId}] ✅ API Response:`, response.data);
            
            const result = {
                success: true,
                quote: response.data,
                originalAmount: usdAmount,
                calculatedAmount: calculatedAmount.toFixed(2),
                finalOffsetAmount: carbonOffsetAmount.toFixed(2),
                note: carbonOffsetAmount > calculatedAmount 
                    ? "Amount adjusted to meet minimum requirement of $1.52" 
                    : undefined
            };
            
            console.log(`[${requestId}] 🎉 Successfully processed quote request`);
            return res.status(200).json(result);

        } catch (apiError: any) {
            console.error(`[${requestId}] ❌ API Error:`, {
                status: apiError.response?.status,
                statusText: apiError.response?.statusText,
                data: apiError.response?.data,
                details: apiError.response?.data?.detail,
                message: apiError.message
            });
            
            if (apiError.response?.data?.detail) {
                return res.status(apiError.response.status).json({ 
                    error: 'Carbon offset quote error',
                    details: apiError.response.data.detail
                });
            }
            
            return res.status(503).json({ 
                error: 'Failed to fetch carbon offset quote from Stellar Carbon API'
            });
        }

    } catch (error) {
        console.error(`[${requestId}] 💥 Internal Error:`, error);
        return res.status(500).json({ 
            error: 'Internal server error while processing carbon offset quote'
        });
    }
});

interface SinkCarbonParams {
    funder: string;
    recipient?: string;
    carbon_amount: number | string;
    usdc_amount: number | string;
    payment_asset?: string;
    vcs_project_id?: number;
    email: string;
}

// Route to get carbon sink transaction XDR
router.post('/sink-carbon/xdr', async (req: Request, res: Response) => {
    const requestId = Math.random().toString(36).substring(7);
    console.log(`[${requestId}] 🌱 Carbon Sink XDR Request`);
    console.log(`[${requestId}] Headers:`, {
        'content-type': req.headers['content-type'],
        'user-agent': req.headers['user-agent'],
        'origin': req.headers['origin']
    });
    console.log(`[${requestId}] Raw Body:`, JSON.stringify(req.body, null, 2));

    try {
        const { 
            funder, 
            recipient,
            carbon_amount,
            usdc_amount,
            payment_asset = 'USDC',
            vcs_project_id = 1360,
            email: requestEmail
        } = req.body as SinkCarbonParams;

        // Temporarily hardcode email since we know it from the withdrawal logs
        const email = requestEmail || 'olvisgil@gmail.com';

        console.log(`[${requestId}] Parsed parameters:`, {
            funder,
            recipient,
            carbon_amount,
            usdc_amount,
            payment_asset,
            vcs_project_id,
            email
        });

        // Validate required parameters
        const missingFields = [];
        if (!funder) missingFields.push('funder');
        if (!carbon_amount) missingFields.push('carbon_amount');
        
        if (missingFields.length > 0) {
            console.log(`[${requestId}] ❌ Missing required fields:`, missingFields);
            return res.status(400).json({ 
                error: `Missing required fields: ${missingFields.join(', ')}`,
                required_fields: ['funder', 'carbon_amount'],
                missing_fields: missingFields
            });
        }

        const finalRecipient = recipient || funder;

        // Validate the funder and recipient Stellar addresses
        if (!StrKey.isValidEd25519PublicKey(funder)) {
            console.log(`[${requestId}] ❌ Invalid funder Stellar address`);
            return res.status(400).json({ error: 'Invalid funder public key' });
        }

        if (!StrKey.isValidEd25519PublicKey(finalRecipient)) {
            console.log(`[${requestId}] ❌ Invalid recipient Stellar address`);
            return res.status(400).json({ error: 'Invalid recipient public key' });
        }

        // If usdc_amount is not provided, get a fresh quote
        let finalUsdcAmount = usdc_amount;
        if (!finalUsdcAmount) {
            try {
                const carbonAmountNum = Number(carbon_amount);
                // Get quote from Stellar Carbon API
                const quoteUrl = `https://api.stellarcarbon.io/test/carbon/usd-quote?carbon_amount=${carbonAmountNum.toFixed(6)}`;
                console.log(`[${requestId}] 🌐 Getting quote for carbon amount:`, quoteUrl);
                
                const quoteResponse = await axios.get(quoteUrl);
                finalUsdcAmount = quoteResponse.data.usd_amount;
                console.log(`[${requestId}] ✅ Got quote:`, quoteResponse.data);
            } catch (error: any) {
                console.log(`[${requestId}] ❌ Failed to get quote:`, error);
                return res.status(400).json({ error: 'Failed to get USDC amount for carbon amount. Please provide usdc_amount explicitly.' });
            }
        }

        try {
            // Only funder goes in query params
            const queryParams = new URLSearchParams({
                funder
            });

            const apiUrl = `https://api.stellarcarbon.io/test/carbon/sink-carbon/xdr?${queryParams.toString()}`;
            console.log(`[${requestId}] 🌐 Requesting XDR from Stellar Carbon API:`, apiUrl);

            // Rest of the parameters go in the request body
            const requestBody = {
                recipient: finalRecipient,
                carbon_amount: Number(carbon_amount).toFixed(6),
                usdc_amount: Number(finalUsdcAmount).toFixed(2),
                payment_asset,
                vcs_project_id: Number(vcs_project_id)
            };

            console.log(`[${requestId}] Request body:`, requestBody);

            const response = await axios.post(apiUrl, requestBody, { 
                headers: { 
                    'accept': 'application/json',
                    'content-type': 'application/json'
                }
            });

            // Log the complete response for debugging
            console.log(`[${requestId}] 🔍 Complete API Response:`, {
                status: response.status,
                statusText: response.statusText,
                headers: response.headers,
                data: response.data
            });
            
            // Get the XDR from the response
            if (!response.data || typeof response.data !== 'object') {
                console.log(`[${requestId}] ❌ Invalid response data type:`, typeof response.data);
                throw new Error(`Invalid response from Stellar Carbon API: ${JSON.stringify(response.data)}`);
            }

            console.log(`[${requestId}] 📦 Response data keys:`, Object.keys(response.data));
            
            const { tx_xdr } = response.data;
            console.log(`[${requestId}] 🔑 Carbon Sink XDR from response:`, tx_xdr);
            
            // Get user's private key by email
            const user = await User.findOne({ email });
            if (!user || !user.privateKeyXlmTestnet) {
                console.error(`[${requestId}] ❌ User not found or testnet private key not available for email: ${email}`);
                throw new Error('User not found or private key not available');
            }

            // Decrypt private key and create keypair
            const decryptedPrivateKey = decryptPrivateKey(user.privateKeyXlmTestnet);
            console.log(`[${requestId}] ✅ Private key decrypted successfully`);
            
            // Create keypair and verify it matches the funder
            const sourceKeypair = StellarSdk.Keypair.fromSecret(decryptedPrivateKey);
            if (sourceKeypair.publicKey() !== funder) {
                console.error(`[${requestId}] ❌ Private key does not match funder account. Got: ${sourceKeypair.publicKey()}, Expected: ${funder}`);
                throw new Error('Private key does not match funder account');
            }

            // Create Transaction object from XDR with proper network
            const transaction = new StellarSdk.Transaction(tx_xdr, StellarSdk.Networks.TESTNET);
            
            // Sign the transaction
            transaction.sign(sourceKeypair);
            console.log(`[${requestId}] ✅ Transaction signed successfully`);
            
            console.log(`[${requestId}] 🔑 Submitting carbon sink transaction...`);
            const result = await testnetServer.submitTransaction(transaction);
            console.log(`[${requestId}] ✅ Transaction submitted successfully:`, result);
            
            return res.status(200).json({ 
                message: 'Carbon sink successful',
                result
            });
        } catch (error: any) {
            // Log the complete error details
            const errorDetails = {
                status: error.response?.status,
                statusText: error.response?.statusText,
                data: error.response?.data,
                details: Array.isArray(error.response?.data?.detail) 
                    ? error.response?.data?.detail
                    : [error.response?.data?.detail],
                message: error.message,
                stack: error.stack // Include stack trace for debugging
            };
            
            console.error(`[${requestId}] ❌ API Error Details:`, JSON.stringify(errorDetails, null, 2));

            // Extract detailed error message
            let errorMessage = 'Failed to fetch carbon sink XDR from Stellar Carbon API';
            
            if (error.response?.status === 503) {
                errorMessage = 'Stellar Carbon API is temporarily unavailable. Please try again in a few minutes.';
            } else {
                const detail = error.response?.data?.detail;
                if (detail) {
                    if (Array.isArray(detail)) {
                        const firstError = detail[0];
                        if (firstError) {
                            const location = Array.isArray(firstError.loc) ? firstError.loc.join('.') : firstError.loc;
                            errorMessage = `${firstError.msg} at ${location}`;
                        }
                    } else {
                        errorMessage = detail.toString();
                    }
                }
            }

            return res.status(error.response?.status || 503).json({ 
                error: errorMessage,
                details: errorDetails
            });
        }

    } catch (error: unknown) {
        console.error(`[${requestId}] 💥 Error creating query params:`, error);
        return res.status(500).json({
            error: 'Failed to create query parameters',
            details: error instanceof Error ? error.message : String(error)
        });
    }
});

export default router;
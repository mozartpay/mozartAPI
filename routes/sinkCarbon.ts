import express, { Request, Response } from 'express';
import StellarSdk from '@stellar/stellar-sdk';
import dotenv from 'dotenv';
import { User } from '../models/user';
import { decryptPrivateKey } from './withdraw';
import { carbonAPI } from '../api/stellar-carbon/api';
import { MinimumAmountError, StellarCarbonAPIError } from '../api/stellar-carbon/types';

const { Operation, Networks, StrKey, Keypair, Transaction, Asset, Horizon, BASE_FEE, TransactionBuilder } = StellarSdk;

// Load environment variables
dotenv.config({ path: '.env.production' });

const router = express.Router();

// Email validation helper
const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

// Normalize email helper
const normalizeEmail = (email: string): string => {
    return email.toLowerCase().trim();
};

// Middleware to ensure proper body parsing
router.use(express.json());

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
        const calculatedAmount = (usdAmount * 0.01);
        
        console.log(`[${requestId}] 📊 Initial amount calculation:`, {
            originalAmount: usdAmount,
            calculatedPercentage: calculatedAmount
        });

        try {
            const quote = await carbonAPI.getUSDQuote(calculatedAmount);
            console.log(`[${requestId}] ✅ Quote received:`, quote);
            
            return res.status(200).json({
                success: true,
                quote,
                originalAmount: usdAmount,
                calculatedAmount: calculatedAmount.toFixed(2)
            });
        } catch (error) {
            if ((error as MinimumAmountError).error === 'MinimumAmountError') {
                const minError = error as MinimumAmountError;
                try {
                    // Retry with minimum amount
                    const retryQuote = await carbonAPI.getUSDQuote(minError.minimumAmount);
                    console.log(`[${requestId}] ✅ Retry quote received with minimum amount:`, retryQuote);
                    
                    return res.status(200).json({
                        success: true,
                        quote: retryQuote,
                        originalAmount: usdAmount,
                        calculatedAmount: calculatedAmount.toFixed(2),
                        adjustedAmount: minError.minimumAmount.toFixed(4),
                        note: minError.message
                    });
                } catch (retryError) {
                    console.error(`[${requestId}] ❌ Retry Error:`, retryError);
                    return res.status(503).json({ 
                        error: 'Failed to fetch carbon offset quote with adjusted amount'
                    });
                }
            }
            
            const apiError = error as StellarCarbonAPIError;
            console.error(`[${requestId}] ❌ API Error:`, apiError);
            
            return res.status(503).json({ 
                error: apiError.error,
                details: apiError.details
            });
        }
    } catch (error) {
        console.error(`[${requestId}] 💥 Internal Error:`, error);
        return res.status(500).json({ 
            error: 'Internal server error while processing carbon offset quote'
        });
    }
});

// Route to get carbon sink transaction XDR
router.post('/sink-carbon/xdr', async (req: Request, res: Response) => {
    const requestId = Math.random().toString(36).substring(7);
    console.log(`[${requestId}] 🌱 Carbon Sink XDR Request`);
    console.log(`[${requestId}] Headers:`, {
        'content-type': req.headers['content-type']
    });
    console.log(`[${requestId}] Body:`, req.body);

    try {
        const { 
            funder, 
            recipient,
            carbon_amount,
            usdc_amount,
            payment_asset,
            vcs_project_id,
            email
        } = req.body;

        // Validate required email
        if (!email) {
            console.log(`[${requestId}] ❌ Missing email parameter`);
            return res.status(400).json({
                error: 'Missing required parameter',
                details: 'Email is required'
            });
        }

        // Validate email format
        if (!isValidEmail(email)) {
            console.log(`[${requestId}] ❌ Invalid email format:`, email);
            return res.status(400).json({
                error: 'Invalid parameter',
                details: 'Invalid email format'
            });
        }

        // Normalize email
        const normalizedEmail = normalizeEmail(email);
        console.log(`[${requestId}] 📧 Normalized email:`, normalizedEmail);

        // Check if user exists
        const user = await User.findOne({ email: normalizedEmail });
        if (!user) {
            console.log(`[${requestId}] ❌ User not found for email:`, normalizedEmail);
            return res.status(404).json({
                error: 'User not found',
                details: 'No user found with the provided email'
            });
        }

        console.log(`[${requestId}] ✅ User found:`, { userId: user._id });

        try {
            const xdrResponse = await carbonAPI.getSinkCarbonXDR({
                funder,
                recipient,
                carbonAmount: carbon_amount,
                usdcAmount: usdc_amount,
                paymentAsset: payment_asset,
                vcsProjectId: vcs_project_id
            });

            return res.status(200).json({
                success: true,
                xdr: xdrResponse.xdr,
                user: {
                    email: normalizedEmail,
                    userId: user._id
                }
            });
        } catch (error) {
            const apiError = error as StellarCarbonAPIError;
            console.error(`[${requestId}] ❌ API Error:`, apiError);
            
            return res.status(503).json({
                error: apiError.error,
                details: apiError.details
            });
        }
    } catch (error) {
        console.error(`[${requestId}] 💥 Internal Error:`, error);
        return res.status(500).json({
            error: 'Internal server error while processing carbon sink XDR request',
            details: error instanceof Error ? error.message : String(error)
        });
    }
});

export default router;
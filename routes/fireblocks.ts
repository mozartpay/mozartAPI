import { Router } from 'express';
import { readFileSync } from 'fs';
import { Fireblocks, BasePath, TransferPeerPathType } from "@fireblocks/ts-sdk";
import { config } from '../config';
import { validateApiKey } from '../middleware/auth';

const router = Router();

// Initialize Fireblocks SDK
const fireblocks = new Fireblocks({
    apiKey: config.fireblocks.apiKey,
    basePath: BasePath.Sandbox,
    secretKey: config.fireblocks.apiSecret
});

// Create a new vault account
async function createVault(name: string) {
    try {
        const vault = await fireblocks.vaults.createVaultAccount({
            createVaultAccountRequest: {
                name,
                hiddenOnUI: false,
                autoFuel: false
            }
        });
        return vault.data;
    } catch (e) {
        console.error('Error creating vault:', e);
        throw e;
    }
}

// Get paged vault accounts
async function getVaultPagedAccounts(limit: number) {
    try {
        const vaults = await fireblocks.vaults.getPagedVaultAccounts({
            limit
        });
        return vaults.data;
    } catch (e) {
        console.error('Error getting vault accounts:', e);
        throw e;
    }
}

// Create a transaction
async function createTransaction(assetId: string, amount: string, srcId: string, destId: string) {
    try {
        const payload = {
            assetId,
            amount,
            source: {
                type: TransferPeerPathType.VaultAccount,
                id: String(srcId)
            },
            destination: {
                type: TransferPeerPathType.VaultAccount,
                id: String(destId)
            },
            note: "Transaction created via API"
        };
        const result = await fireblocks.transactions.createTransaction({ 
            transactionRequest: payload 
        });
        return result;
    } catch (e) {
        console.error('Error creating transaction:', e);
        throw e;
    }
}

// API Routes
router.post('/vault', validateApiKey, async (req, res) => {
    try {
        const { name } = req.body;
        const vault = await createVault(name);
        res.json(vault);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create vault' });
    }
});

router.get('/vaults', validateApiKey, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit as string) || 10;
        const vaults = await getVaultPagedAccounts(limit);
        res.json(vaults);
    } catch (error) {
        res.status(500).json({ error: 'Failed to get vaults' });
    }
});

router.post('/transaction', validateApiKey, async (req, res) => {
    try {
        const { assetId, amount, srcId, destId } = req.body;
        const transaction = await createTransaction(assetId, amount, srcId, destId);
        res.json(transaction);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create transaction' });
    }
});

export default router;
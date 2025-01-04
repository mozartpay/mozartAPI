import express from 'express';
import * as ccxt from 'ccxt';
import { Request, Response } from 'express';

const router = express.Router();

// Initialize exchange (using Binance as an example)
const exchange = new ccxt.binance({
    'enableRateLimit': true,
    // Add your API credentials here if needed
    // apiKey: process.env.BINANCE_API_KEY,
    // secret: process.env.BINANCE_SECRET,
});

// Get all available markets
router.get('/markets', async (req: Request, res: Response) => {
    try {
        const markets = await exchange.loadMarkets();
        res.json(markets);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Get ticker information for a specific symbol
router.get('/ticker/:symbol', async (req: Request, res: Response) => {
    try {
        const symbol = req.params.symbol.toUpperCase();
        const ticker = await exchange.fetchTicker(symbol);
        res.json(ticker);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Get order book for a specific symbol
router.get('/orderbook/:symbol', async (req: Request, res: Response) => {
    try {
        const symbol = req.params.symbol.toUpperCase();
        const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
        const orderbook = await exchange.fetchOrderBook(symbol, limit);
        res.json(orderbook);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Get recent trades for a symbol
router.get('/trades/:symbol', async (req: Request, res: Response) => {
    try {
        const symbol = req.params.symbol.toUpperCase();
        const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
        const trades = await exchange.fetchTrades(symbol, undefined, limit);
        res.json(trades);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Get account balance (requires authentication)
router.get('/balance', async (req: Request, res: Response) => {
    try {
        const balance = await exchange.fetchBalance();
        res.json(balance);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Place a limit order (requires authentication)
router.post('/order', async (req: Request, res: Response) => {
    try {
        const { symbol, side, amount, price } = req.body;
        const order = await exchange.createOrder(symbol, 'limit', side, amount, price);
        res.json(order);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Get open orders (requires authentication)
router.get('/open-orders', async (req: Request, res: Response) => {
    try {
        const symbol = req.query.symbol?.toString().toUpperCase();
        const orders = await exchange.fetchOpenOrders(symbol);
        res.json(orders);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
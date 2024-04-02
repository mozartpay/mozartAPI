import { Router, Request, Response } from "express";
import {
    isConnected,
    isAllowed,
    setAllowed,
    getUserInfo,
    getPublicKey,
    signTransaction,
    getNetwork,
} from "@stellar/freighter-api";
import StellarSdk from "stellar-sdk";

const router = Router();

router.post('/', async (req, res) => {
    try {
        // Set CORS headers to allow all origins
        res.header("Access-Control-Allow-Origin", "*");
        res.header("Access-Control-Allow-Methods", "GET,PUT,POST,DELETE,OPTIONS");
        res.header("Access-Control-Allow-Headers", "Origin,X-Requested-With,Content-Type,Accept,content-type,application/json");
        res.header("Content-Type", "application/json");

        // Extract email and amount from the request body
        const { email, amount } = req.body;

        // Validate the input
        if (!email || !amount) {
            return res.status(400).json({ error: "Email and amount are required." });
        }

        // Check if the user is connected to Freighter
        if (await isConnected()) {
            // Ideally, here you would create a transaction with StellarSdk,
            // then pass it to the user's Freighter extension for signing.
            // However, this involves client-side interaction for signing the transaction.

            // For example purposes, let's simulate a successful operation
            return res.json({ message: "User is connected to Freighter. Proceed with transaction creation and signing." });
        } else {
            return res.status(400).json({ error: "User is not connected to Freighter." });
        }
    } catch (error) {
        console.error("Error handling payment:", error);
        return res.status(500).json({ error: "An error occurred." });
    }
});

export default router;

"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const freighter_api_1 = require("@stellar/freighter-api");
const router = (0, express_1.Router)();
router.post('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
        if (yield (0, freighter_api_1.isConnected)()) {
            // Ideally, here you would create a transaction with StellarSdk,
            // then pass it to the user's Freighter extension for signing.
            // However, this involves client-side interaction for signing the transaction.
            // For example purposes, let's simulate a successful operation
            return res.json({ message: "User is connected to Freighter. Proceed with transaction creation and signing." });
        }
        else {
            return res.status(400).json({ error: "User is not connected to Freighter." });
        }
    }
    catch (error) {
        console.error("Error handling payment:", error);
        return res.status(500).json({ error: "An error occurred." });
    }
}));
exports.default = router;

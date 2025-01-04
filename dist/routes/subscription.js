"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const subscription_1 = __importDefault(require("../models/subscription"));
const router = (0, express_1.Router)();
router.post('/', async (req, res) => {
    res.header("Access-Control-Allow-Origin", '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
    res.header("Access-Control-Allow-Headers", 'Origin,X-Requested-With,Content-Type,Accept,content-type,application/json');
    res.header('Content-Type', 'application/json');
    try {
        const { email } = req.body;
        // Check if the email already exists
        const existingSubscription = await subscription_1.default.findOne({ email });
        if (existingSubscription) {
            return res.status(400).json({ message: 'Email already subscribed' });
        }
        // Create a new subscription
        const subscription = new subscription_1.default({ email });
        await subscription.save();
        return res.status(201).json({ message: 'Subscription successful' });
    }
    catch (error) {
        console.error('Error subscribing:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});
exports.default = router;

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const identity_1 = __importDefault(require("../models/identity"));
const router = express_1.default.Router();
// API endpoint to handle identity verification
router.post('/', async (req, res) => {
    res.header("Access-Control-Allow-Origin", '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
    res.header("Access-Control-Allow-Headers", 'Origin,X-Requested-With,Content-Type,Accept,content-type,application/json');
    res.header('Content-Type', 'application/json');
    const { email, documentType, document } = req.body;
    try {
        // Save identity information to MongoDB
        const identity = new identity_1.default({ email, documentType, document });
        await identity.save();
        res.status(200).json({ message: 'Identity Verification Request Has been sent !' });
    }
    catch (error) {
        console.error('Error saving identity:', error);
        res.status(500).json({ error: 'An error occurred while saving identity.' });
    }
});
exports.default = router;

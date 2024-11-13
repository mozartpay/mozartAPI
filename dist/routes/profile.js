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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const user_1 = require("../models/user");
const cors_1 = __importDefault(require("cors"));
const app = (0, express_1.default)();
const router = express_1.default.Router();
// Enable CORS for specific origin and allow credentials
app.use((0, cors_1.default)({
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Access-Control-Allow-Origin'],
    credentials: true, // Allow credentials (cookies, authentication headers, etc.)
}));
// Route to get user by email
router.get('/:email', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const email = req.params.email;
        const user = yield user_1.User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        // Extract and return user information
        const userInfo = user;
        res.status(200).json(userInfo);
    }
    catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}));
// Route to update user's image
router.post('/image', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, image } = req.body;
        const user = yield user_1.User.findOneAndUpdate({ email }, { image }, { new: true });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        console.log('User image updated:', user);
        return res.status(200).json({ message: 'User image updated successfully', user });
    }
    catch (error) {
        console.error('Error updating user image:', error);
        return res.status(500).json({ message: 'User image update failed' });
    }
}));
// New route to update user's preferred currency
router.post('/preferredCurrency', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, preferredCurrency } = req.body;
        if (!email || !preferredCurrency) {
            return res.status(400).json({ message: 'Email and preferred currency are required' });
        }
        const user = yield user_1.User.findOneAndUpdate({ email }, { preferredCurrency }, { new: true });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        console.log('User preferred currency updated:', user.preferredCurrency);
        return res.status(200).json({ message: 'Preferred currency updated successfully', preferredCurrency: user.preferredCurrency });
    }
    catch (error) {
        console.error('Error updating user preferred currency:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}));
// Route to update user's preferred network
router.post('/preferredNetwork', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, preferredNetwork } = req.body;
        if (!email || !preferredNetwork) {
            return res.status(400).json({ message: 'Email and preferred network are required' });
        }
        const user = yield user_1.User.findOneAndUpdate({ email }, { preferredNetwork }, { new: true });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        console.log('User preferred network updated:', user.preferredNetwork);
        return res.status(200).json({
            message: 'Preferred network updated successfully',
            preferredNetwork: user.preferredNetwork
        });
    }
    catch (error) {
        console.error('Error updating user preferred network:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}));
exports.default = router;

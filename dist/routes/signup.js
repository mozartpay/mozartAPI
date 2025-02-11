"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const user_1 = require("../models/user");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const messagebird_1 = __importDefault(require("messagebird"));
const dotenv_1 = __importDefault(require("dotenv"));
const router = express_1.default.Router();
dotenv_1.default.config({ path: '.env.production' });
router.post('/', async (req, res) => {
    try {
        const { email, password, fullname, number } = req.body;
        // Add phone number validation
        if (!number) {
            return res.status(400).json({ message: 'Phone number is required.' });
        }
        // Basic phone number format validation (you might want to adjust this regex based on your needs)
        const phoneRegex = /^\+?[1-9]\d{1,14}$/;
        if (!phoneRegex.test(number)) {
            return res.status(400).json({ message: 'Invalid phone number format. Please use international format (e.g., +1234567890).' });
        }
        // Check if the email is already registered
        const existingUser = await user_1.User.findOne({ email });
        if (existingUser) {
            return res.status(409).json({ message: 'Email already exists. Please use a different email.' });
        }
        // Hash the password using bcrypt
        const saltRounds = 10;
        const hashedPassword = await bcrypt_1.default.hash(password, saltRounds);
        // Generate a random verification code
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        // Create a new user document in MongoDB
        const newUser = new user_1.User({
            email,
            password: hashedPassword,
            name: fullname,
            number: number,
            balance: "0",
            balanceUsd: "0",
            balanceEur: "0",
            balanceCop: "0",
            verificationCode: verificationCode,
            preferredNetwork: "https://horizon-testnet.stellar.org",
            isPhoneVerified: false,
            isEmailVerified: false,
        });
        // Get JWT secret from environment variables
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            throw new Error('JWT secret is not defined in environment variables.');
        }
        const token = jsonwebtoken_1.default.sign({ _id: newUser._id?.toString(), name: newUser.name }, jwtSecret, {
            expiresIn: '1 hour',
        });
        newUser.token = token;
        const savedUser = await newUser.save();
        // Initialize the MessageBird client with API key from environment variables
        const messagebirdApiKey = process.env.MESSAGEBIRD_API_KEY;
        if (!messagebirdApiKey) {
            throw new Error('MessageBird API key is not defined in environment variables.');
        }
        const messagebird = (0, messagebird_1.default)(messagebirdApiKey);
        const params = {
            originator: 'MozartPay',
            recipients: [savedUser.number],
            body: `Your verification code is: ${verificationCode}`,
        };
        // Sending SMS using the MessageBird client
        messagebird.messages.create(params, (err, response) => {
            if (err) {
                console.error('Error sending SMS:', err);
            }
            else {
                console.log('SMS sent successfully:', response);
            }
        });
        return res.status(201).json({
            message: 'Phone number verification code sent!',
            user: {
                email: newUser.email,
                name: newUser.name,
                isPhoneVerified: newUser.isPhoneVerified,
            },
            token,
        });
    }
    catch (error) {
        console.error('Error during signup:', error);
        return res.status(500).json({ message: 'Internal server error. Please try again later.' });
    }
});
router.post('/verify', async (req, res) => {
    try {
        const { email, code } = req.body;
        // Find the user by email
        const user = await user_1.User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }
        // Compare the provided verification code with the one stored in the user document
        if (user.verificationCode === code) {
            // Update the user's phone verification status
            user.isPhoneVerified = true;
            await user.save();
            return res.status(200).json({ message: 'Phone number verified successfully.' });
        }
        else {
            return res.status(400).json({ message: 'Invalid verification code.' });
        }
    }
    catch (error) {
        console.error('Error during verification:', error);
        return res.status(500).json({ message: 'Internal server error. Please try again later.' });
    }
});
// Route to resend verification code
router.post('/resend-code', async (req, res) => {
    try {
        const { email } = req.body;
        const authHeader = req.headers['authorization'];
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ message: 'Authorization token is required' });
        }
        const token = authHeader.split(' ')[1];
        // Find the user
        const user = await user_1.User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        // Generate a new verification code
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        // Update the user's verification code
        user.verificationCode = verificationCode;
        await user.save();
        // Initialize MessageBird
        const messagebird = (0, messagebird_1.default)(process.env.MESSAGEBIRD_API_KEY);
        // Send the verification code via SMS
        messagebird.messages.create({
            originator: 'Mozart',
            recipients: [user.number],
            body: `Your Mozart verification code is: ${verificationCode}`
        }, (err, response) => {
            if (err) {
                console.error('MessageBird Error:', err);
                return res.status(500).json({ message: 'Error sending verification code' });
            }
            res.status(200).json({ message: 'Verification code resent successfully' });
        });
    }
    catch (error) {
        console.error('Error in resend-code route:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.default = router;

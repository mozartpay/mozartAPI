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
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const router = express_1.default.Router();
dotenv_1.default.config({ path: '.env.production' });
router.use(express_1.default.json());
// Rate limiter: maximum of 5 requests per 10 minutes per IP for signup endpoints
const signupLimiter = (0, express_rate_limit_1.default)({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 5, // limit each IP to 5 requests per windowMs
    message: {
        message: 'Too many requests from this IP, please try again after 10 minutes.'
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});
router.post('/', signupLimiter, async (req, res) => {
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
            preferences: {
                currency: 'USD',
                network: 'testnet',
                hideBalances: false
            },
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
        // Get and decrypt MessageBird API key
        const messagebirdApiKey = process.env.MESSAGEBIRD_API_KEY?.trim();
        if (!messagebirdApiKey) {
            console.error('MessageBird API key is not defined in environment variables.');
            return res.status(500).json({ message: 'SMS service configuration error' });
        }
        console.log('Initializing MessageBird with key length:', messagebirdApiKey.length);
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
router.post('/verify', signupLimiter, async (req, res) => {
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
router.post('/resend-code', signupLimiter, async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({
                message: 'Email is required',
                error: 'MISSING_EMAIL'
            });
        }
        // Find the user
        const user = await user_1.User.findOne({ email: email.toLowerCase() });
        if (!user) {
            return res.status(404).json({
                message: 'User not found',
                error: 'USER_NOT_FOUND'
            });
        }
        // Generate new verification code
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        // Update the user's verification code
        user.verificationCode = verificationCode;
        await user.save();
        // Get and decrypt MessageBird API key
        const messagebirdApiKey = process.env.MESSAGEBIRD_API_KEY?.trim();
        if (!messagebirdApiKey) {
            console.error('MessageBird API key is not defined in environment variables.');
            return res.status(500).json({
                message: 'SMS service configuration error',
                error: 'SMS_CONFIG_ERROR'
            });
        }
        console.log('Initializing MessageBird with key length:', messagebirdApiKey.length);
        const messagebird = (0, messagebird_1.default)(messagebirdApiKey);
        // Send the verification code via SMS
        messagebird.messages.create({
            originator: 'MozartPay',
            recipients: [user.number],
            body: `Your Mozart verification code is: ${verificationCode}`
        }, (err, response) => {
            if (err) {
                console.error('MessageBird Error:', err);
                const mbError = err;
                if (mbError.statusCode === 401 || (mbError.errors && mbError.errors[0]?.code === 2)) {
                    return res.status(500).json({
                        message: 'SMS service authentication error',
                        error: 'SMS_AUTH_ERROR'
                    });
                }
                return res.status(500).json({
                    message: 'Error sending verification code',
                    error: 'SMS_SEND_ERROR',
                    details: mbError.description || 'SMS service error'
                });
            }
            res.status(200).json({
                message: 'Verification code resent successfully',
                status: 'success'
            });
        });
    }
    catch (error) {
        console.error('Error in resend-code:', error);
        res.status(500).json({
            message: 'Internal server error',
            error: 'INTERNAL_ERROR'
        });
    }
});
exports.default = router;

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
const bcrypt_1 = __importDefault(require("bcrypt"));
const user_1 = require("../models/user");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const messagebird_1 = __importDefault(require("messagebird"));
const dotenv_1 = __importDefault(require("dotenv"));
const router = express_1.default.Router();
dotenv_1.default.config({ path: '.env.production' });
router.post('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { email, password, fullname, number } = req.body;
        // Check if the email is already registered
        const existingUser = yield user_1.User.findOne({ email });
        if (existingUser) {
            return res.status(409).json({ message: 'Email already exists. Please use a different email.' });
        }
        // Hash the password using bcrypt
        const saltRounds = 10;
        const hashedPassword = yield bcrypt_1.default.hash(password, saltRounds);
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
        });
        // Get JWT secret from environment variables
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            throw new Error('JWT secret is not defined in environment variables.');
        }
        const token = jsonwebtoken_1.default.sign({ _id: (_a = newUser._id) === null || _a === void 0 ? void 0 : _a.toString(), name: newUser.name }, jwtSecret, {
            expiresIn: '1 hour',
        });
        newUser.token = token;
        const savedUser = yield newUser.save();
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
            message: 'Signup successful!',
            user: {
                email: newUser.email,
                name: newUser.name,
            },
            token,
        });
    }
    catch (error) {
        console.error('Error during signup:', error);
        return res.status(500).json({ message: 'Internal server error. Please try again later.' });
    }
}));
router.post('/verify', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, code } = req.body;
        // Find the user by email
        const user = yield user_1.User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }
        // Compare the provided verification code with the one stored in the user document
        if (user.verificationCode === code) {
            return res.status(200).json({ message: 'Verification code is valid.' });
        }
        else {
            return res.status(400).json({ message: 'Invalid verification code.' });
        }
    }
    catch (error) {
        console.error('Error during verification:', error);
        return res.status(500).json({ message: 'Internal server error. Please try again later.' });
    }
}));
exports.default = router;

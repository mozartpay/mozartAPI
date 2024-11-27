"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
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
const crypto_1 = __importDefault(require("crypto"));
const cors_1 = __importDefault(require("cors"));
const ts_mailgun_1 = require("ts-mailgun");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const dotenv = __importStar(require("dotenv"));
dotenv.config({ path: '.env.production' });
const router = express_1.default.Router();
const app = (0, express_1.default)();
// Set up CORS middleware globally
const allowedOrigins = ['https://www.mozartpay.com', 'http://localhost:3000'];
app.use((0, cors_1.default)({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        }
        else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: 'GET,POST,PUT,DELETE,OPTIONS',
    allowedHeaders: 'Origin,X-Requested-With,Content-Type,Accept,Authorization',
    credentials: true,
    optionsSuccessStatus: 200
}));
// Initialize Mailgun with API key and domain from environment variables
const mailer = new ts_mailgun_1.NodeMailgun();
mailer.apiKey = process.env.MAILGUN_API_KEY || ''; // Ensure this is set in your environment variables
mailer.domain = process.env.MAILGUN_DOMAIN || 'mozartpay.com';
mailer.options = {
    host: process.env.MAILGUN_API_HOST
};
mailer.fromEmail = 'admin@mozartpay.com';
mailer.fromTitle = 'MozartPay';
mailer.init();
// Middleware to verify JWT token
function verifyToken(req, res, next) {
    var _a;
    const token = (_a = req.header('Authorization')) === null || _a === void 0 ? void 0 : _a.replace('Bearer ', '');
    if (!token) {
        return res.status(401).json({ message: 'Access denied. No token provided.' });
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // Now TypeScript won't complain about this
        next();
    }
    catch (error) {
        res.status(400).json({ message: 'Invalid token.' });
    }
}
router.post('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    res.setHeader("Content-Security-Policy", "default-src 'self'; " +
        "connect-src 'self' https://mozart-api-21ea5fd801a8.herokuapp.com; " +
        "style-src 'self' 'unsafe-inline';");
    console.log("request");
    try {
        const { email, password } = req.body;
        const user = yield user_1.User.findOne({ email });
        if (!user)
            return res.status(404).json({ message: 'User not found.' });
        const passwordMatch = yield bcrypt_1.default.compare(password, user.password);
        if (!passwordMatch)
            return res.status(401).json({ message: 'Incorrect password.' });
        // Generate JWT
        const token = jsonwebtoken_1.default.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '1h' });
        // Send email notification after successful login
        mailer.send(email, 'MozartPay - Sign-in Verification', `
  <h2>Sign-in Verification for MozartPay</h2>
  <p>Hi,</p>
  <p>We noticed a sign-in attempt associated with your account (${email}). If this was you, no further action is needed. If this seems suspicious, please review the details below:</p>
  
  <ul>
    <li><strong>Timestamp:</strong> ${new Date().toUTCString()}</li>
    <li><strong>IP Address:</strong> ${req.ip}</li>
    <li><strong>User Agent:</strong> ${req.get('User-Agent')}</li>
  </ul>
  
  <p>If this sign-in wasn't initiated by you, we strongly recommend you <a href='https://www.mozartpay.com/forgot_password'>reset your password immediately</a>.</p>

  <p>Your security is important to us. If you have any questions or concerns, feel free to contact our support team.</p>

  <p>Best regards,<br>
  The MozartPay Team<br>
  <small>Powered by OG Technologies EU, based in Vienna, Austria</small></p>
`)
            .then(result => console.log('Email sent: ', result))
            .catch(error => console.error('Error sending email: ', error));
        return res.status(200).json({
            message: 'Login successful!',
            token,
            user: { email: user.email, name: user.name, balance: user.balance, preferredNetwork: user.preferredNetwork, isPhoneVerified: user.isPhoneVerified },
        });
    }
    catch (error) {
        console.error('Error during signin:', error);
        return res.status(500).json({ message: 'Internal server error.' });
    }
}));
// Function to send reset password email
function sendResetPasswordEmail(email, resetToken) {
    const resetURL = `https://www.mozartpay.com/reset-password?token=${resetToken}`;
    mailer
        .send(email, 'Reset Password', `<p>Please click the following link to reset your password:</p>
    <a href="${resetURL}">Reset Password</a>`)
        .then(result => console.log('Reset password email sent:', result))
        .catch(error => console.error('Error sending reset password email:', error));
}
router.post('/reset-password', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const email = req.body.email;
    const resetToken = crypto_1.default.randomBytes(20).toString('hex');
    const hashedResetToken = crypto_1.default.createHash('sha256').update(resetToken).digest('hex');
    try {
        let user = yield user_1.User.findOneAndUpdate({ email }, { resetToken: hashedResetToken }, { new: true });
        if (!user)
            return res.status(404).json({ msg: 'User not found' });
        user.resetTokenExpiration = new Date(Date.now() + 3600000); // 1 hour expiration
        yield user.save();
        // Send the reset password email
        sendResetPasswordEmail(user.email, resetToken);
        res.json({ msg: 'Reset password email sent' });
    }
    catch (err) {
        console.log('Error during password reset:', err);
        res.status(500).json({ msg: 'Internal server error' });
    }
}));
router.post('/reset-password/:token', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { token } = req.params;
    const { password } = req.body;
    try {
        // Find the user with the matching reset token
        const user = yield user_1.User.findOne({
            resetToken: crypto_1.default.createHash('sha256').update(token).digest('hex'),
            resetTokenExpiration: { $gt: new Date() },
        });
        if (!user)
            return res.status(400).json({ message: 'Invalid or expired reset token.' });
        // Update the user's password
        const saltRounds = 10;
        const hashedPassword = yield bcrypt_1.default.hash(password, saltRounds);
        user.password = hashedPassword;
        user.resetToken = '';
        user.resetTokenExpiration = new Date(0);
        yield user.save();
        res.json({ message: 'Password reset successfully.' });
    }
    catch (error) {
        console.error('Error resetting password:', error);
        res.status(500).json({ message: 'Internal server error.' });
    }
}));
router.post('/validate-reset-token', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { token } = req.body;
    try {
        const user = yield user_1.User.findOne({ resetToken: crypto_1.default.createHash('sha256').update(token).digest('hex') });
        if (user && !isTokenExpired(user.resetTokenExpiration)) {
            res.json({ tokenValid: true });
        }
        else {
            res.json({ tokenValid: false });
        }
    }
    catch (error) {
        console.error('Error validating reset token:', error);
        res.status(500).json({ tokenValid: false });
    }
}));
// Function to check if the reset token is expired
function isTokenExpired(expiration) {
    return expiration < new Date();
}
exports.default = router;

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
const crypto_1 = __importDefault(require("crypto"));
const router = express_1.default.Router();
const ts_mailgun_1 = require("ts-mailgun");
const mailer = new ts_mailgun_1.NodeMailgun();
mailer.apiKey = process.env.mailer || 'key-yourkeyhere';
mailer.domain = 'mozartpay.com';
mailer.options = {
    host: 'api.eu.mailgun.net'
};
mailer.fromEmail = 'admin@mozartpay.com';
mailer.fromTitle = 'MozartPay';
mailer.init();
// Initialize Express app
const app = (0, express_1.default)();
router.options('/', (req, res) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin,X-Requested-With,Content-Type,Accept,Authorization');
    res.sendStatus(200); // Respond OK to preflight request
});
router.post('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    res.header("Access-Control-Allow-Origin", '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
    res.header("Access-Control-Allow-Headers", 'Origin,X-Requested-With,Content-Type,Accept,content-type,application/json');
    res.header('Content-Type', 'application/json');
    try {
        const email = req.body.email;
        const password = req.body.password;
        // Check if the user exists in the database
        const user = yield user_1.User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: 'User not found. Please check your email and password.' });
        }
        // Check if the provided password matches the hashed password in the database
        const passwordMatch = yield bcrypt_1.default.compare(password, user.password);
        if (!passwordMatch) {
            return res.status(401).json({ message: 'Incorrect password. Please check your email and password.' });
        }
        // Send email notification
        mailer
            .send(email, 'MozartPay', `We're verifying a recent sign-in for ${email}:<br><br>` +
            `Timestamp: ${new Date().toUTCString()}<br>` +
            `IP Address: ${req.ip}<br>` +
            `User agent: ${req.get('User-Agent')}<br><br>` +
            "You're receiving this message because of a successful sign-in from a device that we didnt recognize. If you believe that this sign-in is suspicious, please <a href='https://www.mozartpay.com/forgot_password'>Reset Password</a>` immediately.<br><br>" +
            "If you're aware of this sign-in, please disregard this notice. This can happen when you use your browser's incognito or private browsing mode or clear your cookies.<br><br>" +
            "Thanks,<br><br>")
            .then((result) => console.log('Done', result))
            .catch((error) => console.error('Error: ', error));
        // If user exists and password matches, send the user information in the response
        return res.status(200).json({
            message: 'Login successful!',
            user: {
                email: user.email,
                name: user.name,
                balance: user.balance
            },
        });
    }
    catch (error) {
        console.error('Error during signin:', error);
        return res.status(500).json({ message: 'Internal server error. Please try again later.' });
    }
}));
// Function to send reset password email
function sendResetPasswordEmail(email, resetToken) {
    const resetURL = `https://www.mozartpay.com/reset-password?token=${resetToken}`;
    mailer
        .send(email, 'Reset Password', `<p>Please click the following link to reset your password:</p>
  <a href="https://www.mozartpay.com/reset-password?token=${resetToken}">Reset Password</a>`)
        .then((result) => console.log('Done', result))
        .catch((error) => console.error('Error: ', error));
}
router.post('/reset-password', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const email = req.body.email;
    // Generate a reset token
    const resetToken = crypto_1.default.randomBytes(20).toString('hex');
    try {
        // Update user document in the MongoDB collection with the reset token
        let user = yield user_1.User.findOneAndUpdate({ email }, { resetToken }, { new: true });
        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }
        // Store the reset token in the user's document in the MongoDB collection
        user.resetToken = resetToken;
        user.resetTokenExpiration = new Date(Date.now() + 3600000); // Token expiration time (1 hour)
        yield user.save();
        // Send reset password email
        sendResetPasswordEmail(user.email, resetToken);
        res.json({ msg: 'Reset password email sent' });
    }
    catch (err) {
        console.log(err);
        res.status(500).json({ msg: 'Internal server error' });
    }
}));
router.post('/reset-password/:token', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { token } = req.params;
    const { password } = req.body;
    try {
        // Find the user with the given reset token
        const user = yield user_1.User.findOne({
            resetToken: token,
            resetTokenExpiration: { $gt: new Date() },
        });
        if (!user) {
            return res.status(400).json({ message: 'Invalid or expired reset token.' });
        }
        console.log('password reset');
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
        // Validate the reset token
        // Compare the token against the stored token in the database
        const user = yield user_1.User.findOne({ resetToken: token });
        if (user && !isTokenExpired(user.resetTokenExpiration)) {
            // Token is valid
            res.json({ tokenValid: true });
        }
        else {
            // Token is invalid or expired
            res.json({ tokenValid: false });
        }
    }
    catch (error) {
        console.error('Error validating reset token:', error);
        res.status(500).json({ tokenValid: false });
    }
}));
// Function to check if the token is expired
function isTokenExpired(expiration) {
    // Compare the token expiration with the current time
    return expiration < new Date();
}
exports.default = router;

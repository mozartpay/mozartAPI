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
const router = express_1.default.Router();
const ts_mailgun_1 = require("ts-mailgun");
const mailer = new ts_mailgun_1.NodeMailgun();
mailer.apiKey = 'key-c8d12b7428fbe666e074108aaa0820bc' || 'key-yourkeyhere';
mailer.domain = 'mozartpay.com';
mailer.options = {
    host: 'api.eu.mailgun.net'
};
mailer.fromEmail = 'hi@ogtechnologies.co';
mailer.fromTitle = 'MozartPay';
mailer.init();
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
            "You're receiving this message because of a successful sign-in from a device that we didnt recognize. If you believe that this sign-in is suspicious, please reset your password immediately.<br><br>" +
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
            },
        });
    }
    catch (error) {
        console.error('Error during signin:', error);
        return res.status(500).json({ message: 'Internal server error. Please try again later.' });
    }
}));
exports.default = router;

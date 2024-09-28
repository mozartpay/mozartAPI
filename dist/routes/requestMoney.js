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
const MoneyRequest_1 = __importDefault(require("../models/MoneyRequest"));
const ts_mailgun_1 = require("ts-mailgun");
const dotenv = __importStar(require("dotenv"));
const mailer = new ts_mailgun_1.NodeMailgun();
dotenv.config({ path: 'config.env' });
mailer.apiKey = process.env.MAILGUN_API_KEY || '';
mailer.domain = process.env.MAILGUN_DOMAIN || 'mozartpay.com';
mailer.options = {
    host: process.env.MAILGUN_API_HOST
};
mailer.fromEmail = 'admin@mozartpay.com';
mailer.fromTitle = 'MozartPay';
mailer.init();
const router = express_1.default.Router();
router.post('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    res.header("Access-Control-Allow-Origin", '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
    res.header("Access-Control-Allow-Headers", 'Origin,X-Requested-With,Content-Type,Accept,content-type,application/json');
    res.header('Content-Type', 'application/json');
    const { country, amount, currency, receiverName, receiverEmail, senderEmail } = req.body; // Added currency
    try {
        const newTransaction = new MoneyRequest_1.default({
            senderEmail,
            country,
            amount,
            currency,
            receiverName,
            receiverEmail,
        });
        yield newTransaction.save();
        // Generate URLs to view the request in the dashboard (assuming frontend routes)
        const transactionId = newTransaction._id; // Assuming Mongoose generates `_id`
        const receiverUrl = `https://www.mozartpay.com/login?redirect=/admin/?requestId=${transactionId}`;
        const senderUrl = `https://www.mozartpay.com/login?redirect=/admin/payment-requests?requestId=${transactionId}`;
        // Send email to receiver
        mailer
            .send(receiverEmail, 'You have received a payment request - MozartPay', `New Payment Request has been sent to your account from ${senderEmail}:<br><br>` +
            `Date: ${new Date().toUTCString()}<br>` +
            `Amount: ${amount} ${currency}<br><br>` + // Updated email content to include currency
            `Click <a href="${receiverUrl}">here</a> to log in and view the payment request details. Once logged in, you will be able to approve the request.<br><br>` +
            "You're receiving this message because of a successful payment request. If you believe this is suspicious, please contact us immediately.<br><br>" +
            "If you're aware of this payment, please disregard this notice.<br><br>" +
            "Thanks, we will notify you when the payment has been processed.<br><br>")
            .then((result) => console.log('Receiver email sent', result))
            .catch((error) => console.error('Error sending to receiver: ', error));
        // Send email to sender
        mailer
            .send(senderEmail, 'You have sent a payment request - MozartPay', `Your Payment Request has been sent successfully to ${receiverEmail}:<br><br>` +
            `Date: ${new Date().toUTCString()}<br>` +
            `Amount: ${amount} ${currency}<br><br>` + // Updated email content to include currency
            `Click <a href="${senderUrl}">here</a> to log in and view the status of your payment request.<br><br>` +
            "You're receiving this message because of a successful payment request sent from your account. If you believe this is suspicious, please <a href='https://www.mozartpay.com/forgot_password'>reset your password</a> immediately.<br><br>" +
            "If you're aware of this payment, please disregard this notice.<br><br>" +
            "Thanks,<br><br>")
            .then((result) => console.log('Sender email sent', result))
            .catch((error) => console.error('Error sending to sender: ', error));
        res.status(201).json({ message: 'Transaction data stored and emails sent successfully.' });
    }
    catch (error) {
        console.error('Error storing transaction data:', error);
        res.status(500).json({ error: 'An error occurred while storing the data.' });
    }
}));
router.get('/:senderEmail', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const senderEmail = req.params.senderEmail;
        const transactions = yield MoneyRequest_1.default.find({ senderEmail });
        if (!transactions) {
            return res.status(404).json({ message: 'No transactions found for the provided senderEmail' });
        }
        res.status(200).json(transactions);
    }
    catch (error) {
        console.error('Error fetching transactions:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}));
router.get('/receiver/:receiverEmail', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const receiverEmail = req.params.receiverEmail;
        const transactions = yield MoneyRequest_1.default.find({ receiverEmail });
        if (!transactions) {
            return res.status(404).json({ message: 'No transactions found for the provided receiverEmail' });
        }
        res.status(200).json(transactions);
    }
    catch (error) {
        console.error('Error fetching transactions:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}));
exports.default = router;

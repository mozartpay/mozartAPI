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
// routes/api.ts
const express_1 = __importDefault(require("express"));
const MoneyRequest_1 = __importDefault(require("../models/MoneyRequest"));
const ts_mailgun_1 = require("ts-mailgun");
const mailer = new ts_mailgun_1.NodeMailgun();
mailer.apiKey = 'key-c8d12b7428fbe666e074108aaa0820bc' || 'key-yourkeyhere';
mailer.domain = 'mozartpay.com';
mailer.options = {
    host: 'api.eu.mailgun.net'
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
    const { country, amount, receiverName, receiverEmail, senderEmail } = req.body;
    try {
        const newTransaction = new MoneyRequest_1.default({
            senderEmail,
            country,
            amount,
            receiverName,
            receiverEmail,
        });
        yield newTransaction.save();
        // Send email notification
        mailer
            .send(receiverEmail, 'MozartPay', `New Payment Request has been sent to you account from ${senderEmail} :<br><br>` +
            `Date: ${new Date().toUTCString()}<br>` +
            `Amount: ${amount}<br><br>` +
            "You're receiving this message because of a successful payment request has been sent. If you believe that this payment request is suspicious, please contact us immediately.<br><br>" +
            "If you're aware of this payment, please disregard this notice.<br><br>" +
            "Thanks,We will get in touch with you as soon as the payment has been made. <br><br>")
            .then((result) => console.log('Done', result))
            .catch((error) => console.error('Error: ', error));
        mailer
            .send(senderEmail, 'MozartPay', `your Payment Request has been sent successfully to ${receiverEmail} :<br><br>` +
            `Date: ${new Date().toUTCString()}<br>` +
            `Amount: ${amount}<br><br>` +
            "You're receiving this message because of a successful payment request has been sent from your account. If you believe that this payment request is suspicious,  please <a href='https://www.mozartpay.com/forgot_password'>Reset Password</a>` immediately.<br><br>" +
            "If you're aware of this payment, please disregard this notice.<br><br>" +
            "Thanks,<br><br>")
            .then((result) => console.log('Done', result))
            .catch((error) => console.error('Error: ', error));
        res.status(201).json({ message: 'Transaction data stored successfully.' });
    }
    catch (error) {
        console.error('Error storing transaction data:', error);
        res.status(500).json({ error: 'An error occurred while storing the data.' });
    }
}));
exports.default = router;

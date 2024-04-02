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
const axios_1 = __importDefault(require("axios"));
const AirtmPayment_1 = require("../models/AirtmPayment");
const uuid_1 = require("uuid");
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
const router = express_1.default.Router();
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
router.post('/create-payment', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    res.header("Access-Control-Allow-Origin", '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
    res.header("Access-Control-Allow-Headers", 'Origin,X-Requested-With,Content-Type,Accept,content-type,application/json');
    res.header('Content-Type', 'application/json');
    const apiKey = process.env.apiKey;
    const apiSecret = process.env.apiSecret;
    const credentials = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');
    const authorizationHeader = `Basic ${credentials}`;
    const { amount } = req.body;
    const { email } = req.body;
    const purchaseData = {
        code: (0, uuid_1.v4)(),
        description: 'Test purchase',
        cancel_uri: 'https://www.mozartpay.com/cancel',
        confirmation_uri: 'https://www.mozartpay.com/confirm',
        callback_uri: 'https://www.mozartpay.com/callback',
        amount,
        airtm_user_email: email,
        items: [
            {
                description: 'Test item 1',
                amount,
                quantity: 1,
            },
        ],
    };
    try {
        const response = yield axios_1.default.post('https://payments.static-stg.tests.airtm.org/purchases', purchaseData, {
            headers: {
                'Content-Type': 'application/json',
                Authorization: authorizationHeader,
            },
        });
        const payment = response.data;
        const savedPurchase = yield AirtmPayment_1.PurchaseModel.create(payment);
        console.log('Purchase created successfully:', savedPurchase);
        // Send email notification
        mailer
            .send(email, 'MozartPay', `New Payment has been done with this account:<br><br>` +
            `Timestamp: ${new Date().toUTCString()}<br>` +
            `IP Address: ${req.ip}<br>` +
            `User agent: ${req.get('User-Agent')}<br><br>` +
            `Amount: ${amount}<br><br>` +
            `Transaction code: ${purchaseData.code}<br><br>` +
            "You're receiving this message because of a successful payment has been done. If you believe that this payment is suspicious, please <a href='https://www.mozartpay.com/forgot_password'>Reset Password</a>` immediately.<br><br>" +
            "If you're aware of this payment, please disregard this notice.<br><br>" +
            "Thanks,<br><br>")
            .then((result) => console.log('Done', result))
            .catch((error) => console.error('Error: ', error));
        res.status(200).json({ message: 'Purchase created successfully', data: savedPurchase });
    }
    catch (error) {
        console.error('Error creating payment:', error);
        if (axios_1.default.isAxiosError(error)) {
            const axiosError = error;
            console.error('Status Code:', (_a = axiosError.response) === null || _a === void 0 ? void 0 : _a.status);
            console.error('Response Data:', (_b = axiosError.response) === null || _b === void 0 ? void 0 : _b.data);
            res.status(500).json({ error: 'Internal Server Error' });
        }
        else {
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
}));
router.get('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const purchaseId = req.params.id;
    try {
        const purchase = yield AirtmPayment_1.PurchaseModel.findOne({ id: purchaseId });
        if (purchase) {
            // If the purchase is found, send it as a response
            res.json(purchase);
        }
        else {
            // If the purchase is not found, send a 404 Not Found response
            res.status(404).json({ error: 'Purchase not found' });
        }
    }
    catch (error) {
        // Handle any errors that occurred during the retrieval process
        console.error('Error fetching purchase:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}));
router.get('/fetch/:code', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { code } = req.params;
    try {
        const purchase = yield AirtmPayment_1.PurchaseModel.findOne({ code: code.trim() }).exec();
        if (!purchase) {
            console.log(`Purchase with code "${code}"not found`);
            return res.status(404).json({ message: 'Purchase notttt found' });
        }
        return res.status(200).json({ purchase });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Server error' });
    }
}));
router.get('/purchases/:email', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const email = req.params.email;
        const purchases = yield AirtmPayment_1.PurchaseModel.find({ 'airtm_user_email': email });
        if (purchases.length === 0) {
            return res.status(404).json({ message: 'No purchases found for the provided email' });
        }
        res.status(200).json({ purchases });
    }
    catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}));
router.patch('/confirmed/:code', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { code } = req.params;
        // Find the purchase by ID
        const purchase = yield AirtmPayment_1.PurchaseModel.findOne({ code: code.trim() }).exec();
        if (!purchase) {
            return res.status(404).json({ message: 'Purchase not found' });
        }
        // Update the status to 'Created'
        purchase.status = 'Confirmed';
        yield purchase.save();
        return res.status(200).json({ message: 'Purchase status updated to Created' });
    }
    catch (error) {
        console.error('Error updating purchase status:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}));
router.patch('/rejected/:code', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { code } = req.params;
        // Find the purchase by ID
        const purchase = yield AirtmPayment_1.PurchaseModel.findOne({ code: code.trim() }).exec();
        if (!purchase) {
            return res.status(404).json({ message: 'Purchase not found' });
        }
        // Update the status to 'Created'
        purchase.status = 'Rejected';
        yield purchase.save();
        return res.status(200).json({ message: 'Purchase status updated to Created' });
    }
    catch (error) {
        console.error('Error updating purchase status:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}));
router.patch('/failed/:code', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { code } = req.params;
        // Find the purchase by ID
        const purchase = yield AirtmPayment_1.PurchaseModel.findOne({ code: code.trim() }).exec();
        if (!purchase) {
            return res.status(404).json({ message: 'Purchase not found' });
        }
        // Update the status to 'Created'
        purchase.status = 'Failed';
        yield purchase.save();
        return res.status(200).json({ message: 'Purchase status updated to Created' });
    }
    catch (error) {
        console.error('Error updating purchase status:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}));
exports.default = router;

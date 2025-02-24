"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const oas_1 = __importDefault(require("./routes/oas"));
const sep0001_1 = __importDefault(require("./routes/SEPs/sep0001"));
const withdraw_1 = __importDefault(require("./routes/withdraw"));
const signin_1 = __importDefault(require("./routes/signin"));
const signup_1 = __importDefault(require("./routes/signup"));
const order_1 = __importDefault(require("./routes/order"));
const profile_1 = __importDefault(require("./routes/profile"));
const subscription_1 = __importDefault(require("./routes/subscription"));
const convert_1 = __importDefault(require("./routes/convert"));
const sendMoney_1 = __importDefault(require("./routes/sendMoney"));
const requestMoney_1 = __importDefault(require("./routes/requestMoney"));
const identity_1 = __importDefault(require("./routes/identity"));
const trustline_1 = __importDefault(require("./routes/trustline"));
const balance_1 = __importDefault(require("./routes/balance"));
const xlm_1 = __importDefault(require("./routes/xlm"));
const notification_1 = __importDefault(require("./routes/notification"));
const swap_1 = __importDefault(require("./routes/swap"));
const helmet_1 = __importDefault(require("helmet"));
const db_1 = __importDefault(require("./db"));
const sinkCarbon_1 = __importDefault(require("./routes/sinkCarbon"));
const oracle_1 = __importDefault(require("./routes/oracle"));
const soroban_1 = __importDefault(require("./routes/soroban"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const cookies_1 = __importDefault(require("./routes/cookies"));
const fireblocks_1 = __importDefault(require("./routes/fireblocks"));
require('dotenv').config({ path: '.env.production' });
// Debug environment variables
console.log('Environment:', process.env.NODE_ENV);
console.log('MessageBird Key exists:', !!process.env.MESSAGEBIRD_API_KEY);
console.log('MessageBird Key length:', process.env.MESSAGEBIRD_API_KEY?.length || 0);
const port = process.env.PORT || '8000';
const app = (0, express_1.default)();
app.use((0, helmet_1.default)());
const allowedOrigins = ['https://mozartpay.com', 'https://www.mozartpay.com', 'http://localhost:3000', 'https://mozart-api-21ea5fd801a8.herokuapp.com', 'http://localhost:5173', 'https://mozart-api-21ea5fd801a8.herokuapp.com/api', 'http://localhost:8000'];
app.use((0, cors_1.default)({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        }
        else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
    exposedHeaders: ['set-cookie'],
    optionsSuccessStatus: 200
}));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
app.use((0, cookie_parser_1.default)());
// Configure cookie settings
app.use((req, res, next) => {
    res.cookie('cookieName', 'cookieValue', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        path: '/',
        domain: process.env.NODE_ENV === 'production' ? '.mozartpay.com' : 'localhost'
    });
    next();
});
const enforceHTTPS = (req, res, next) => {
    if (req.headers['x-forwarded-proto'] !== 'https') {
        return res.redirect(`https://${req.hostname}${req.url}`);
    }
    next();
};
// Then use the environment check
if (process.env.NODE_ENV === 'development') {
    app.use(enforceHTTPS);
    console.log("Running enforceHTTPS");
}
else {
    console.log("Not Running enforceHTTPS - Development Mode");
}
;
(0, db_1.default)();
(0, sep0001_1.default)();
// Default route
app.get("/", (req, res) => {
    res.send("Hello, Mozart Typescript Node.js server!");
});
// Define API routes
app.use('/api/oas', oas_1.default);
app.use('/api/withdraw', withdraw_1.default);
app.use('/api', order_1.default);
app.use('/api/profile', profile_1.default);
app.use('/api', subscription_1.default);
app.use('/api', convert_1.default);
app.use('/api', sendMoney_1.default);
app.use('/api', requestMoney_1.default);
app.use('/api', identity_1.default);
app.use('/api/stellar/trustline', trustline_1.default);
app.use('/api/user/balance', balance_1.default);
app.use('/api/xlm', xlm_1.default);
app.use('/api', notification_1.default);
app.use('/api', swap_1.default);
app.use('/api', fireblocks_1.default);
app.use('/api', soroban_1.default);
app.use('/api', sinkCarbon_1.default);
app.use('/api', oracle_1.default);
app.use('/api', cookies_1.default);
app.use('/api/signup', signup_1.default);
app.use('/api/signin', signin_1.default);
// Start the server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});

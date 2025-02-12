"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const oas_1 = __importDefault(require("./routes/oas"));
const sep0001_1 = __importDefault(require("./routes/SEPs/sep0001"));
const sep0002_1 = __importDefault(require("./routes/SEPs/sep0002"));
const body_parser_1 = __importDefault(require("body-parser"));
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
    methods: 'GET,POST,PUT,DELETE,OPTIONS',
    allowedHeaders: 'Origin,X-Requested-With,Content-Type,Accept,Authorization',
    optionsSuccessStatus: 200,
    exposedHeaders: ['set-cookie']
}));
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
// Middleware for parsing JSON requests
app.use(express_1.default.json());
app.use(body_parser_1.default.json({ limit: '30mb' }));
app.use((0, cookie_parser_1.default)());
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
app.use('/api/withdraw', withdraw_1.default);
app.use('/api/signin', signin_1.default);
app.use('/api/signup', signup_1.default);
app.use('/api/profile', profile_1.default);
app.use('/api/v1', order_1.default);
app.use('/api/subscribe', subscription_1.default);
app.use('/api/convert', convert_1.default);
app.use('/api/send', sendMoney_1.default);
app.use('/api/request', requestMoney_1.default);
app.use('/api/identity', identity_1.default);
app.use('/api/trustline', trustline_1.default);
app.use('/api/balance', balance_1.default);
app.use('/api/xlm', xlm_1.default);
app.use('/api/federation', sep0002_1.default);
app.use('/api/notifications', notification_1.default);
app.use('/api/swap', swap_1.default);
app.use('/api/soroban', soroban_1.default);
app.use('/api/oas', oas_1.default);
app.use('/api/carbon', sinkCarbon_1.default);
app.use('/api/oracle', oracle_1.default);
app.use('/api/cookies', cookies_1.default);
// Start the server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});

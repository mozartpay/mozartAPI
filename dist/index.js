"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const db_1 = __importDefault(require("./db"));
const cors_1 = __importDefault(require("cors"));
const body_parser_1 = __importDefault(require("body-parser"));
const withdraw_1 = __importDefault(require("./routes/withdraw"));
const signin_1 = __importDefault(require("./routes/signin"));
const signup_1 = __importDefault(require("./routes/signup"));
const order_1 = __importDefault(require("./routes/order"));
const profile_1 = __importDefault(require("./routes/profile"));
const subscription_1 = __importDefault(require("./routes/subscription"));
const convert_1 = __importDefault(require("./routes/convert"));
const transaction_1 = __importDefault(require("./routes/transaction"));
const requestMoney_1 = __importDefault(require("./routes/requestMoney"));
const identity_1 = __importDefault(require("./routes/identity"));
const trustline_1 = __importDefault(require("./routes/trustline"));
const balance_1 = __importDefault(require("./routes/balance"));
const xlm_1 = __importDefault(require("./routes/xlm"));
require('dotenv').config();
const port = process.env.PORT || '8000';
const app = (0, express_1.default)();
// Define allowed origins for development and production
const allowedOrigins = ['https://www.mozartpay.com', 'http://localhost:3000', 'https://mozart-api-21ea5fd801a8.herokuapp.com'];
// CORS Middleware
app.use((0, cors_1.default)({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests) and allowed origins
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
    optionsSuccessStatus: 200 // For legacy browser support
}));
// Middleware for parsing JSON requests
app.use(express_1.default.json());
app.use(body_parser_1.default.json({ limit: '30mb' }));
// Connect to database
(0, db_1.default)();
// Default Route
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
app.use('/api/transaction', transaction_1.default);
app.use('/api/request', requestMoney_1.default);
app.use('/api/identity', identity_1.default);
app.use('/api/trustline', trustline_1.default);
app.use('/api/balance', balance_1.default);
app.use('/api/xlm', xlm_1.default);
// Start the server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});

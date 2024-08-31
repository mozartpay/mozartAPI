"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const db_1 = __importDefault(require("./db"));
// import airtmRouter from './routes/airtmPayment';
const signin_1 = __importDefault(require("./routes/signin"));
const signup_1 = __importDefault(require("./routes/signup"));
const order_1 = __importDefault(require("./routes/order"));
const profile_1 = __importDefault(require("./routes/profile"));
const cors_1 = __importDefault(require("cors"));
const body_parser_1 = __importDefault(require("body-parser"));
const subscription_1 = __importDefault(require("./routes/subscription"));
const convert_1 = __importDefault(require("./routes/convert"));
const transaction_1 = __importDefault(require("./routes/transaction"));
const requestMoney_1 = __importDefault(require("./routes/requestMoney"));
const identity_1 = __importDefault(require("./routes/identity"));
const freighter_1 = __importDefault(require("./routes/freighter"));
const balance_1 = __importDefault(require("./routes/balance"));
const xlm_1 = __importDefault(require("./routes/xlm"));
require('dotenv').config();
const port = process.env.PORT || '8000';
const app = (0, express_1.default)();
app.use((0, cors_1.default)({
    origin: 'https://www.mozartpay.com',
    methods: 'GET,POST,PUT,DELETE,OPTIONS',
    allowedHeaders: 'Origin,X-Requested-With,Content-Type,Accept,Authorization'
}));
app.use(express_1.default.json());
app.use(body_parser_1.default.json({ limit: '30mb' }));
(0, db_1.default)();
app.get("/", (req, res) => {
    res.send("Hello, Mozart Typescript Node.js server!");
});
// app.use('/api/airtm', airtmRouter);
app.use('/api/signin', signin_1.default);
app.use('/api/signup', signup_1.default);
app.use('/api/profile', profile_1.default);
app.use('/api/v1', order_1.default);
app.use('/api/subscribe', subscription_1.default);
app.use('/api/convert', convert_1.default);
app.use('/api/transaction', transaction_1.default);
app.use('/api/request', requestMoney_1.default);
app.use('/api/identity', identity_1.default);
app.use('/api/freighter', freighter_1.default);
app.use('/api/balance', balance_1.default);
app.use('/api/xlm', xlm_1.default);
app.get("/hi", (req, res) => {
    res.send("Hello!!");
});
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const db_1 = __importDefault(require("./db"));
const payment_1 = __importDefault(require("./routes/payment"));
const signin_1 = __importDefault(require("./routes/signin"));
const signup_1 = __importDefault(require("./routes/signup"));
const order_1 = __importDefault(require("./routes/order"));
const profile_1 = __importDefault(require("./routes/profile"));
const cors_1 = __importDefault(require("cors"));
const body_parser_1 = __importDefault(require("body-parser"));
const subscription_1 = __importDefault(require("./routes/subscription"));
const port = process.env.PORT || '8000';
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use(body_parser_1.default.json({ limit: '30mb' }));
(0, db_1.default)();
app.get("/", (req, res) => {
    res.send("Hello, TypeScript Node.js server!");
});
app.use('/api/airtm', payment_1.default);
app.use('/api/signin', signin_1.default);
app.use('/api/signup', signup_1.default);
app.use('/api/profile', profile_1.default);
app.use('/api/v1', order_1.default);
app.use('/api/subscribe', subscription_1.default);
app.get("/hi", (req, res) => {
    res.send("BYEEE!!");
});
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});

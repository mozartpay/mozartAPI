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
exports.SECRET_KEY = void 0;
const express_1 = __importDefault(require("express"));
const order_1 = require("../models/order");
const user_1 = require("../models/user");
const router = express_1.default.Router();
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
exports.SECRET_KEY = process.env.SECRET_KEY;
router.get('/orders', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    res.header("Access-Control-Allow-Origin", '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
    res.header("Access-Control-Allow-Headers", 'Origin,X-Requested-With,Content-Type,Accept,content-type,application/json');
    res.header('Content-Type', 'application/json');
    try {
        const orders = yield order_1.OrderModel.find();
        res.json(orders);
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching orders' });
    }
}));
router.get('/orders/:orderId', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const orderId = req.params.orderId;
    try {
        const order = yield order_1.OrderModel.findById(orderId);
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }
        res.json(order);
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching order' });
    }
}));
router.post('/order', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const newOrder = req.body;
    try {
        // Extract the token from the headers
        const token = (_a = req.header('Authorization')) === null || _a === void 0 ? void 0 : _a.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ message: 'Authentication token missing' });
        }
        // Decode the token to get the user's email
        const decodedToken = jsonwebtoken_1.default.verify(token, exports.SECRET_KEY);
        const id = decodedToken._id;
        // Find the user by email - olvis
        const user = yield user_1.User.findOne({ _id: id });
        if (!user) {
            return res.status(401).json({ message: 'User not found' });
        }
        // Check if the user's token matches the provided token
        if (user.token !== token) {
            return res.status(401).json({ message: 'Invalid authentication token' });
        }
        // Check if the buyerEmail matches the authenticated user's email
        if (newOrder.buyerEmail !== user.email) {
            return res.status(401).json({ message: 'Buyer email does not match authenticated user' });
        }
        // Create the order
        const order = yield order_1.OrderModel.create(newOrder);
        res.status(201).json({ message: 'Order created successfully', order });
    }
    catch (error) {
        console.error('Error creating order:', error);
        res.status(400).json({ message: 'Error creating order' });
    }
}));
router.patch('/orders/:orderId', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const orderId = req.params.orderId;
    const updatedOrder = req.body;
    try {
        const order = yield order_1.OrderModel.findByIdAndUpdate(orderId, updatedOrder, { new: true });
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }
        res.json({ message: 'Order updated successfully', order });
    }
    catch (error) {
        res.status(400).json({ message: 'Error updating order' });
    }
}));
router.get('/order/:email', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const email = req.params.email;
        const orders = yield order_1.OrderModel.find({ buyerEmail: email }).exec();
        res.json(orders);
    }
    catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
}));
exports.default = router;

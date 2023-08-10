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
const order_1 = require("../models/order");
const router = express_1.default.Router();
// GET /orders
router.get('/orders', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const orders = yield order_1.OrderModel.find();
        res.json(orders);
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching orders' });
    }
}));
// GET /orders/:orderId
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
// POST /order
router.post('/order', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const newOrder = req.body;
    try {
        const order = yield order_1.OrderModel.create(newOrder);
        res.status(201).json({ message: 'Order created successfully', order });
    }
    catch (error) {
        res.status(400).json({ message: 'Error creating order' });
    }
}));
// PATCH /orders/:orderId
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
// GET orders by email
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

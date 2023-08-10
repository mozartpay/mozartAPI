"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrderModel = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const orderSchema = new mongoose_1.default.Schema({
    buyerName: String,
    amount: String,
    buyerEmail: String,
    method: String,
    status: String,
    currency: String,
    date: { type: Date, default: Date.now },
    description: String
});
exports.OrderModel = mongoose_1.default.model('Order', orderSchema);

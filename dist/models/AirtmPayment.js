"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PurchaseModel = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const purchaseSchema = new mongoose_1.default.Schema({
    id: { type: String, required: true, unique: true },
    partner_id: { type: String },
    status: { type: String, required: true },
    amount: { type: String, required: true },
    description: { type: String, required: true },
    confirmation_uri: { type: String },
    cancel_uri: { type: String },
    code: { type: String, required: true },
    airtm_operation_id: { type: String },
    created_at: { type: Date },
    updated_at: { type: Date },
    airtm_user_id: { type: String },
    airtm_user_email: { type: String },
    operation_type: { type: String, required: true },
    failure_uri: { type: String },
    failure_reason: { type: String },
    callback_uri: { type: String },
    airtm_operation_hash: { type: String },
    items: [
        {
            id: { type: String, required: true },
            operation_id: { type: String, required: true },
            description: { type: String, required: true },
            amount: { type: String, required: true },
            quantity: { type: Number, required: true },
        },
    ],
});
exports.PurchaseModel = mongoose_1.default.model('Purchase', purchaseSchema);

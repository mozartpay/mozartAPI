"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const identitySchema = new mongoose_1.default.Schema({
    email: String,
    documentType: String,
    document: Buffer,
});
const IdentityModel = mongoose_1.default.model('Identity', identitySchema);
exports.default = IdentityModel;

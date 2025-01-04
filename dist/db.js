"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
// Load environment variables from the .env file
dotenv_1.default.config();
async function connectToDB() {
    const mongoUri = process.env.MONGO_URI;
    await mongoose_1.default
        .connect(mongoUri, {
        heartbeatFrequencyMS: 3000,
        serverSelectionTimeoutMS: 30000,
        // ssl: true,
    })
        .then((res) => {
        console.log('Connected to MongoDB');
    })
        .catch((err) => {
        console.log(`Initial Distribution API Database connection error occurred -`, err);
    });
}
exports.default = connectToDB;

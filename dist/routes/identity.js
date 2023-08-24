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
const identity_1 = __importDefault(require("../models/identity"));
const router = express_1.default.Router();
// API endpoint to handle identity verification
router.post('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    res.header("Access-Control-Allow-Origin", '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
    res.header("Access-Control-Allow-Headers", 'Origin,X-Requested-With,Content-Type,Accept,content-type,application/json');
    res.header('Content-Type', 'application/json');
    const { email, documentType, document } = req.body;
    console.log('hi');
    try {
        console.log('save');
        // Save identity information to MongoDB
        const identity = new identity_1.default({ email, documentType, document });
        yield identity.save();
        console.log('saved');
        res.status(200).json({ message: 'Identity Verification Request Has been sent !' });
    }
    catch (error) {
        console.log('error');
        console.error('Error saving identity:', error);
        res.status(500).json({ error: 'An error occurred while saving identity.' });
    }
}));
exports.default = router;

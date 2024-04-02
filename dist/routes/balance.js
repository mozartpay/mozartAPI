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
const mongoose_1 = __importDefault(require("mongoose"));
const user_1 = require("../models/user");
const router = express_1.default.Router();
// Assuming you have a function to convert currencies to USD
function convertCurrencyToUSD(amount, currency) {
    return __awaiter(this, void 0, void 0, function* () {
        if (currency === 'USD') {
            return amount;
        }
        // Here you should call an actual currency conversion service
        // This is a placeholder that returns the input amount for the sake of this example
        return amount;
    });
}
router.post('/add-balance', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // You'll need to get the userId in a way that fits your authentication strategy
        const userId = new mongoose_1.default.Types.ObjectId(req.body.userId);
        const { amount, currency } = req.body;
        // Convert the amount to USD if necessary
        const amountInUSD = yield convertCurrencyToUSD(parseFloat(amount), currency);
        // Find the user and update their balance
        const user = yield user_1.User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }
        const currentBalance = parseFloat(user.balance || '0'); // Default to 0 if no balance is set
        const newBalance = (currentBalance + amountInUSD).toFixed(2); // Assuming we keep two decimals for cents
        user.balance = newBalance;
        yield user.save();
        res.status(200).json({ message: 'Balance updated successfully', newBalance: user.balance });
    }
    catch (error) {
        console.error('Error during balance update:', error);
        res.status(500).json({ message: 'Internal server error. Please try again later.' });
    }
}));
// GET route to fetch the user's balance by email
router.get('/balance/:email', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const email = req.query.email;
        if (typeof email !== 'string') {
            return res.status(400).json({ message: 'Invalid email format.' });
        }
        // Find the user by email
        const user = yield user_1.User.findOne({ email: email }).select('balance -_id'); // Select only the balance field
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }
        // Return the user's balance
        res.status(200).json({ balance: user.balance });
    }
    catch (error) {
        console.error('Error fetching user balance:', error);
        res.status(500).json({ message: 'Internal server error. Please try again later.' });
    }
}));
// router.get('/purchases/:email', async (req: Request, res: Response) => {
//   try {
//     const email = req.params.email;
//     const purchases: PurchaseDocument[] = await PurchaseModel.find({ 'airtm_user_email': email });
//     if (purchases.length === 0) {
//       return res.status(404).json({ message: 'No purchases found for the provided email' });
//     }
//     res.status(200).json({ purchases });
//   } catch (error) {
//     console.error('Error:', error);
//     res.status(500).json({ message: 'Internal server error' });
//   }
// });
exports.default = router;

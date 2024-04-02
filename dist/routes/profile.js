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
const user_1 = require("../models/user");
const router = express_1.default.Router();
router.get('/:email', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    res.header("Access-Control-Allow-Origin", '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
    res.header("Access-Control-Allow-Headers", 'Origin,X-Requested-With,Content-Type,Accept,content-type,application/json');
    res.header('Content-Type', 'application/json');
    try {
        const email = req.params.email;
        const user = yield user_1.User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        // Extract the desired user information
        const userInfo = user;
        res.status(200).json(userInfo);
    }
    catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}));
router.post('/image', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    res.header("Access-Control-Allow-Origin", '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
    res.header("Access-Control-Allow-Headers", 'Origin,X-Requested-With,Content-Type,Accept,content-type,application/json');
    res.header('Content-Type', 'application/json');
    const { email, image } = req.body;
    // console.log('email',email)
    // console.log('image',image)
    try {
        const user = yield user_1.User.findOneAndUpdate({ email }, { image }, { new: true });
        console.log('try');
        if (!user) {
            console.log('User not found');
            return res.status(404).json({ message: 'User not found' });
        }
        console.log('User image updated:', user);
        return res.status(200).json({ message: 'User image updated successfully', user });
    }
    catch (error) {
        console.error('Error updating user image:', error);
        return res.status(500).json({ message: 'User image update failed' });
    }
}));
exports.default = router;

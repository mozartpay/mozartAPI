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
const bcrypt_1 = __importDefault(require("bcrypt"));
const user_1 = require("../models/user");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const router = express_1.default.Router();
exports.SECRET_KEY = 'pvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.vaYmi2wAFIP-RGn6jvfY_MUYwghZd8rZzeDeZ4xiQmk';
router.post('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    res.header("Access-Control-Allow-Origin", '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
    res.header("Access-Control-Allow-Headers", 'Origin,X-Requested-With,Content-Type,Accept,content-type,application/json');
    res.header('Content-Type', 'application/json');
    try {
        const { email, password, fullname } = req.body;
        // Check if the email is already registered
        const existingUser = yield user_1.User.findOne({ email });
        if (existingUser) {
            return res.status(409).json({ message: 'Email already exists. Please use a different email.' });
        }
        // Hash the password using bcrypt
        const saltRounds = 10;
        const hashedPassword = yield bcrypt_1.default.hash(password, saltRounds);
        // Create a new user document in MongoDB
        const newUser = new user_1.User({
            email,
            password: hashedPassword,
            name: fullname
        });
        const token = jsonwebtoken_1.default.sign({ _id: (_a = newUser._id) === null || _a === void 0 ? void 0 : _a.toString(), name: newUser.name }, exports.SECRET_KEY, {
            expiresIn: '99 days',
        });
        newUser.token = token;
        yield newUser.save();
        return res.status(201).json({
            message: 'Signup successful!',
            user: {
                email: newUser.email,
                name: newUser.name,
            },
            token,
        });
    }
    catch (error) {
        console.error('Error during signup:', error);
        return res.status(500).json({ message: 'Internal server error. Please try again later.' });
    }
}));
exports.default = router;

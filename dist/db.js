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
const mongoose_1 = __importDefault(require("mongoose"));
function connectToDB() {
    return __awaiter(this, void 0, void 0, function* () {
        yield mongoose_1.default
            // .connect('mongodb+srv://MozartPayUser:MozartPayUser@cluster0.zlfsm.mongodb.net/test?authSource=admin&replicaSet=atlas-11penf-shard-0&readPreference=primary&ssl=true', {
            .connect('mongodb+srv://MozartPayUser:MozartPayUser@cluster0.zlfsm.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0', {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            heartbeatFrequencyMS: 3000,
            serverSelectionTimeoutMS: 30000,
        })
            .then((res) => {
            console.log('Connected to Distribution API Database - Initial Connection');
        })
            .catch((err) => {
            console.log(`Initial Distribution API Database connection error occurred -`, err);
        });
    });
}
exports.default = connectToDB;

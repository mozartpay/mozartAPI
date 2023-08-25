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
const express_1 = require("express");
const freighter_api_1 = require("@stellar/freighter-api");
const stellar_sdk_1 = __importDefault(require("stellar-sdk"));
const router = (0, express_1.Router)();
router.post('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        res.header("Access-Control-Allow-Origin", '*');
        res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
        res.header("Access-Control-Allow-Headers", 'Origin,X-Requested-With,Content-Type,Accept,content-type,application/json');
        res.header('Content-Type', 'application/json');
        // Get email and amount from the frontend request body
        const { email, amount } = req.body;
        if (!email || !amount) {
            return res.status(400).json({ error: "Email and amount are required." });
        }
        try {
            if (yield (0, freighter_api_1.isConnected)()) {
                // Handle your app authorization logic
                if (!(yield (0, freighter_api_1.isAllowed)())) {
                    yield (0, freighter_api_1.setAllowed)();
                }
                // Get user information (public key)
                const userInfo = yield (0, freighter_api_1.getUserInfo)();
                const { publicKey } = userInfo;
                // Get network information
                const network = yield (0, freighter_api_1.getNetwork)();
                // Set up Stellar SDK
                const server = new stellar_sdk_1.default.Server("https://horizon-testnet.stellar.org");
                const sourceKeys = stellar_sdk_1.default.Keypair.fromSecret("SCZANGBA5YHTNYVVV4C3U252E2B6P6F5T3U6MM63WBSBZATAQI3EBTQ4");
                const destinationId = "GA2C5RFPE6GCKMY3US5PAB6UZLKIGSPIUKSLRB6Q723BM2OARMDUYEJ5";
                // Build the transaction
                let transaction;
                const destinationAccount = yield server.loadAccount(destinationId);
                const sourceAccount = yield server.loadAccount(sourceKeys.publicKey());
                transaction = new stellar_sdk_1.default.TransactionBuilder(sourceAccount, {
                    fee: stellar_sdk_1.default.BASE_FEE,
                    networkPassphrase: stellar_sdk_1.default.Networks.TESTNET,
                })
                    .addOperation(stellar_sdk_1.default.Operation.payment({
                    destination: destinationId,
                    asset: stellar_sdk_1.default.Asset.native(),
                    amount: amount, // Use the amount from the frontend
                }))
                    .addMemo(stellar_sdk_1.default.Memo.text("Test Transaction"))
                    .setTimeout(180)
                    .build();
                // Convert transaction to XDR string
                const transactionXDR = transaction.toXDR("base64");
                // Use the transactionXDR with the Freighter API
                const signedTransaction = yield (0, freighter_api_1.signTransaction)(transactionXDR, {
                    network,
                    accountToSign: publicKey,
                });
                // Respond with the signed transaction or other data
                res.status(200).json({ signedTransaction });
            }
        }
        catch (error) {
            console.error("Error building transaction:", error);
            return res.status(500).json({ error: "An error occurred while building the transaction." });
        }
    }
    catch (error) {
        console.error("Error handling payment:", error);
        res.status(500).json({ error: "An error occurred." });
    }
}));
exports.default = router;

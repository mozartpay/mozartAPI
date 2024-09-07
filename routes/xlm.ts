import express, { Request, Response, Router } from 'express';
import StellarSdk from '@stellar/stellar-sdk';
import dotenv from 'dotenv';
import { User } from '../models/user';
import crypto from 'crypto';

dotenv.config({ path: './config.env' });

const { Keypair, TransactionBuilder, Networks, BASE_FEE, Operation } = StellarSdk;

const router: Router = express.Router();

// Correct environment variable names
const fundingSecretKey = process.env.STELLAR_SECRET_KEY as string;
const fundingPublicKey = process.env.STELLAR_PUBLIC_KEY as string;
const encryptionKey = process.env.ENCRYPTION_SECRET_KEY as string; // Add an encryption secret in your .env file

if (!fundingSecretKey || !fundingPublicKey || !encryptionKey) {
    throw new Error('STELLAR_SECRET_KEY, STELLAR_PUBLIC_KEY, and ENCRYPTION_SECRET_KEY must be set in config.env');
}

const fundingKeypair = Keypair.fromSecret(fundingSecretKey);
const server = new StellarSdk.Horizon.Server('https://horizon-testnet.stellar.org');
console.log(encryptionKey.length);
// Encryption function using AES-256
const encryptPrivateKey = (privateKey: string) => {
    const iv = crypto.randomBytes(16); // Initialization vector
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(encryptionKey), iv);
    let encrypted = cipher.update(privateKey);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex'); // Return IV + encrypted private key
  
};

// Decryption function
const decryptPrivateKey = (encryptedPrivateKey: string) => {
    const textParts = encryptedPrivateKey.split(':');
    const iv = Buffer.from(textParts.shift()!, 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(encryptionKey), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
};

// Helper function to wait for the account to be available on the network
const waitForAccount = async (publicKey: string, retries = 5, delay = 2000) => {
    for (let i = 0; i < retries; i++) {
        try {
            const account = await server.loadAccount(publicKey);
            return account; // Return the account if successfully loaded
        } catch (error) {
            console.log(`Attempt ${i + 1} failed. Retrying in ${delay / 1000} seconds...`);
            await new Promise(res => setTimeout(res, delay));
        }
    }
    throw new Error('Failed to load account after multiple attempts');
};

router.post('/create', async (req: Request, res: Response) => {
    try {
        const { email, currency } = req.body;

        // Ensure that this feature is only available for XLM
        if (currency !== 'XLM') {
            return res.status(400).json({ error: 'This feature is only available for XLM' });
        }

        // Generate a new Stellar keypair
        const pair = Keypair.random();

        // Load the funding account
        const sourceAccount = await server.loadAccount(fundingPublicKey);

        // Create a transaction to create a new account with 10 XLM
        const transaction = new TransactionBuilder(sourceAccount, {
            fee: BASE_FEE,
            networkPassphrase: Networks.TESTNET,
        })
            .addOperation(
                Operation.createAccount({
                    destination: pair.publicKey(),
                    startingBalance: '10', // Send 10 XLM to the new account to create it
                })
            )
            .setTimeout(30)
            .build();

        // Sign the transaction with the funding account's secret key
        transaction.sign(fundingKeypair);

        // Submit the transaction to the Stellar network
        const transactionResult = await server.submitTransaction(transaction);
        console.log('Transaction successful:', transactionResult);

        // Wait for the new account to be available on the network
        const account = await waitForAccount(pair.publicKey());

        // Encrypt the private key
        const encryptedPrivateKey = encryptPrivateKey(pair.secret());

        // Update the user's record with the new Stellar keypair and balance in MongoDB
        const user = await User.findOneAndUpdate(
            { email },
            {
                publicKeyXlm: pair.publicKey(),
                privateKeyXlm: encryptedPrivateKey, // Store the encrypted private key
            },
            { new: true } // Return the updated document
        );

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Send the public key and balance to the frontend, not the private key
        return res.json({
            publicKey: pair.publicKey(),
            balance: account.balances.find((b: { asset_type: string; balance: string }) => b.asset_type === 'native')?.balance || '0',
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

export default router;

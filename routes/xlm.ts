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

// Check if encryption key is of the correct length
if (encryptionKey.length !== 64) { // Expecting a hex-encoded 32-byte key
    throw new Error('ENCRYPTION_SECRET_KEY must be a 64-character hex string representing a 32-byte key');
}

const fundingKeypair = Keypair.fromSecret(fundingSecretKey);
const server = new StellarSdk.Horizon.Server('https://horizon-testnet.stellar.org');

// Encryption function using AES-256 with a hex-encoded key
const encryptPrivateKey = (privateKey: string) => {
    const iv = crypto.randomBytes(16); // Initialization vector (IV) should be 16 bytes
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(encryptionKey, 'hex'), iv);

    let encrypted = cipher.update(privateKey, 'utf8');
    encrypted = Buffer.concat([encrypted, cipher.final()]);

    // Return IV and encrypted data in hex format
    return iv.toString('hex') + ':' + encrypted.toString('hex');
};

// Decryption function
const decryptPrivateKey = (encryptedPrivateKey: string): string => {
    const textParts = encryptedPrivateKey.split(':');
    const iv = Buffer.from(textParts.shift()!, 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');

    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(encryptionKey, 'hex'), iv);

    let decrypted = Buffer.concat([decipher.update(encryptedText), decipher.final()]);
    return decrypted.toString('utf8');
};

// Helper function to wait for the account to be available on the network
const waitForAccount = async (publicKey: string, retries = 10, delay = 5000) => {
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

router.post('/decrypt', async (req: Request, res: Response) => {
    try {
        const { email } = req.body;

        // Fetch the user data from the database
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (!user.privateKeyXlm) {
            return res.status(400).json({ error: 'Private key not available' });
        }

        // Decrypt the private key
        const decryptedPrivateKey = decryptPrivateKey(user.privateKeyXlm);

        // Return the decrypted private key
        return res.json({
            privateKey: decryptedPrivateKey,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Failed to decrypt private key' });
    }
});

router.post('/', async (req: Request, res: Response) => {
    console.log('Received request');
    try {
        const { email, currency } = req.body;

        // Ensure that this feature is only available for XLM
        if (currency !== 'XLM') {
            return res.status(400).json({ error: 'This feature is only available for XLM' });
        }
        console.log('try to create account');
        // Generate a new Stellar keypair
        const pair = Keypair.random();
        console.log('pair created');
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

        // Wait 5 seconds before trying to fetch the new account
        await new Promise(res => setTimeout(res, 5000));

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

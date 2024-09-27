import express, { Request, Response } from 'express';
import Transaction, { ITransaction } from '../models/ApiTransaction';
import { NodeMailgun } from 'ts-mailgun';
import { User } from '../models/user'; // Import the User model
import StellarSdk from '@stellar/stellar-sdk';
import crypto from 'crypto';
import dotenv from 'dotenv';
dotenv.config({ path: 'config.env' });

const mailer = new NodeMailgun();
mailer.apiKey = process.env.MAILGUN_API_KEY || '';
mailer.domain = 'mozartpay.com';
mailer.options = {
    host: process.env.MAILGUN_API_HOST,
};
mailer.fromEmail = 'admin@mozartpay.com';
mailer.fromTitle = 'MozartPay';

// Check if the API key is valid
if (!mailer.apiKey) {
    console.error('Error: MAILGUN_API_KEY is not set or invalid.');
    process.exit(1); // Exit the process with an error code
}

mailer.init();

const router = express.Router();

const server = new StellarSdk.Horizon.Server('https://horizon-testnet.stellar.org'); // Use testnet for now
const { TransactionBuilder, Networks, BASE_FEE, Operation, Keypair } = StellarSdk;
const encryptionKey = process.env.ENCRYPTION_SECRET_KEY as string; // Ensure this is available in your .env file

// Helper function to decrypt private key
const decryptPrivateKey = (encryptedPrivateKey: string): string => {
    const textParts = encryptedPrivateKey.split(':');
    const iv = Buffer.from(textParts.shift()!, 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');

    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(encryptionKey, 'hex'), iv);

    let decrypted = Buffer.concat([decipher.update(encryptedText), decipher.final()]);
    return decrypted.toString('utf8');
};

// Helper function to sign and send a transaction using Stellar SDK
const sendStellarTransaction = async (senderPrivateKey: string, receiverPublicKey: string, amount: number | string) => {
    try {
        // Load the funding account (sender)
        const senderKeypair = Keypair.fromSecret(senderPrivateKey);
        const senderAccount = await server.loadAccount(senderKeypair.publicKey());

        // Ensure amount is a valid number and formatted correctly
        const formattedAmount = parseFloat(amount as string).toFixed(7).toString(); // Convert to number first, then format

        // Build the transaction
        const transaction = new TransactionBuilder(senderAccount, {
            fee: BASE_FEE,
            networkPassphrase: Networks.TESTNET,
        })
            .addOperation(Operation.payment({
                destination: receiverPublicKey,
                asset: StellarSdk.Asset.native(),
                amount: formattedAmount, // Correctly formatted string amount
            }))
            .setTimeout(30)
            .build();

        // Sign the transaction with the sender's private key
        transaction.sign(senderKeypair);

        // Submit the transaction to the Stellar network
        const transactionResult = await server.submitTransaction(transaction);
        return transactionResult;
    } catch (error: any) {
        console.error('Error signing or submitting the Stellar transaction:', error.response?.data || error);
        throw new Error('Failed to process the Stellar transaction.');
    }
};

router.post('/', async (req: Request, res: Response) => {
    res.header("Access-Control-Allow-Origin", '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
    res.header("Access-Control-Allow-Headers", 'Origin,X-Requested-With,Content-Type,Accept,content-type,application/json');
    res.header('Content-Type', 'application/json');

    const { country, amount, receiverName, receiverEmail, senderEmail } = req.body;

    try {
        // Check if the receiver has a MozartPay account
        const receiver = await User.findOne({ email: receiverEmail });
        if (!receiver) {
            return res.status(400).json({ error: 'Receiver does not have a MozartPay account.' });
        }

        // Check if the receiver has a publicKeyXlm
        if (!receiver.publicKeyXlm) {
            return res.status(400).json({ error: 'Receiver does not have a publicKeyXlm.' });
        }

        // Save the transaction in the database
        const newTransaction: ITransaction = new Transaction({
            senderEmail,
            country,
            amount,
            receiverName,
            receiverEmail,
        });
        await newTransaction.save();

        // Decrypt the sender's private key from the user model
        const sender = await User.findOne({ email: senderEmail });
        if (!sender || !sender.privateKeyXlm) {
            return res.status(400).json({ error: 'Sender does not have a valid private key.' });
        }
        const decryptedPrivateKey = decryptPrivateKey(sender.privateKeyXlm);

        // Sign and send the Stellar transaction
        const transactionResult = await sendStellarTransaction(decryptedPrivateKey, receiver.publicKeyXlm, amount);

        console.log('Stellar transaction successful:', transactionResult);

        // Send email notification to receiver
        mailer
            .send(receiverEmail, 'You have received a payment - MozartPay', `New Payment Transaction has been sent to your account from ${senderEmail} :<br><br>` +
                `Date: ${new Date().toUTCString()}<br>` +
                `Amount: ${amount}<br><br>` +
                "You're receiving this message because a successful payment request has been sent. If you believe that this payment request is suspicious, please contact us immediately.<br><br>" +
                "If you're aware of this payment, please disregard this notice.<br><br>" +
                "Thanks, We will get in touch with you as soon as the payment has been made. <br><br>")
            .then((result) => console.log('Receiver email sent', result))
            .catch((error: any) => console.error('Error sending email to receiver: ', error));

        // Send email notification to sender
        mailer
            .send(senderEmail, 'You have sent a payment - MozartPay', `Your Payment Transaction has been sent successfully to ${receiverEmail} :<br><br>` +
                `Date: ${new Date().toUTCString()}<br>` +
                `Amount: ${amount}<br><br>` +
                "You're receiving this message because a successful payment transaction has been sent from your account. If you believe that this payment request is suspicious, please <a href='https://www.mozartpay.com/forgot_password'>Reset Password</a> immediately.<br><br>" +
                "If you're aware of this payment, please disregard this notice.<br><br>" +
                "Thanks,<br><br>")
            .then((result) => console.log('Sender email sent', result))
            .catch((error: any) => console.error('Error sending email to sender: ', error));

        res.status(201).json({ message: 'Transaction processed and email sent successfully.' });
    } catch (error: any) {
        console.error('Error processing transaction:', error.message || error);
        res.status(500).json({ error: 'An error occurred while processing the transaction.' });
    }
});

export default router;


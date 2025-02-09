import express, { Request, Response } from 'express';
import Transaction, { ITransaction } from '../models/ApiTransaction';
import { NodeMailgun } from 'ts-mailgun';
import { User } from '../models/user'; 
import StellarSdk from '@stellar/stellar-sdk';
import crypto from 'crypto';
import dotenv from 'dotenv';
import logger, { logRequest, logError } from '../utils/logger';

dotenv.config({ path: '.env.production' });

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

const testnetServer = new StellarSdk.Horizon.Server(process.env.STELLAR_TESTNET_URL as string);
const mainnetServer = new StellarSdk.Horizon.Server(process.env.STELLAR_MAINNET_URL as string);

const getServer = (network: string = 'testnet'): typeof testnetServer => {
    return network === 'mainnet' ? mainnetServer : testnetServer;
};

const { TransactionBuilder, Networks, BASE_FEE, Operation, Keypair } = StellarSdk;

// Get network-specific encryption key
const getEncryptionKey = (network: string = 'testnet'): string => {
    const key = network === 'mainnet' 
        ? process.env.ENCRYPTION_SECRET_KEY_MAINNET 
        : process.env.ENCRYPTION_SECRET_KEY_TESTNET;
    
    if (!key) {
        throw new Error(`Encryption key for ${network} not found in environment variables`);
    }
    return key;
};

// Helper function to decrypt private key
const decryptPrivateKey = async (encryptedPrivateKey: string, network: string = 'testnet') => {
    try {
        logger.debug('Attempting to decrypt private key', {
            network,
            keyLength: encryptedPrivateKey.length
        });

        const encryptionKey = getEncryptionKey(network);
        const [iv, encryptedText] = encryptedPrivateKey.split(':');

        if (!iv || !encryptedText) {
            throw new Error('Invalid encrypted key format');
        }

        const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(encryptionKey, 'hex'), Buffer.from(iv, 'hex'));
        const decrypted = Buffer.concat([decipher.update(Buffer.from(encryptedText, 'hex')), decipher.final()]);
        
        logger.debug('Private key decrypted successfully');
        return decrypted.toString('utf8');
    } catch (error) {
        logger.error('Failed to decrypt private key', {
            error: error instanceof Error ? error.message : 'Unknown error',
            network
        });
        throw error;
    }
};

// Update the sendStellarTransaction helper function
const sendStellarTransaction = async (senderPrivateKey: string, receiverPublicKey: string, amount: number | string, network: string = 'testnet') => {
    try {
        logger.info('Initiating Stellar transaction', {
            receiverPublicKey,
            amount,
            network
        });

        const server = getServer(network);
        const senderKeypair = Keypair.fromSecret(senderPrivateKey);
        
        logger.debug('Loading sender account', {
            publicKey: senderKeypair.publicKey()
        });
        
        const senderAccount = await server.loadAccount(senderKeypair.publicKey());
        const formattedAmount = parseFloat(amount as string).toFixed(7).toString();

        logger.debug('Building transaction', {
            amount: formattedAmount,
            networkType: network === 'mainnet' ? 'PUBLIC' : 'TESTNET'
        });

        const transaction = new TransactionBuilder(senderAccount, {
            fee: BASE_FEE,
            networkPassphrase: network === 'mainnet' ? Networks.PUBLIC : Networks.TESTNET,
        })
            .addOperation(Operation.payment({
                destination: receiverPublicKey,
                asset: StellarSdk.Asset.native(),
                amount: formattedAmount,
            }))
            .setTimeout(30)
            .build();

        transaction.sign(senderKeypair);
        
        logger.debug('Submitting transaction to network');
        const transactionResult = await server.submitTransaction(transaction);
        
        logger.info('Transaction completed successfully', {
            hash: transactionResult.hash,
            ledger: transactionResult.ledger
        });
        
        return transactionResult;
    } catch (error: any) {
        const errorDetails = {
            message: error.message,
            response: error.response?.data,
            status: error.response?.status,
            network
        };
        
        logger.error('Stellar transaction failed', errorDetails);
        throw new Error('Failed to process the Stellar transaction.');
    }
};

router.post('/', async (req: Request, res: Response) => {
    try {
        logRequest(req, 'send-money');
        
        res.header("Access-Control-Allow-Origin", '*');
        res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
        res.header("Access-Control-Allow-Headers", 'Origin,X-Requested-With,Content-Type,Accept,content-type,application/json');
        res.header('Content-Type', 'application/json');

        const { country, amount, receiverName, receiverEmail, senderEmail, network = 'testnet' } = req.body;

        logger.info('Processing send money request', {
            country,
            amount,
            receiverName,
            receiverEmail,
            senderEmail,
            network
        });

        // Add network validation
        if (network && !['mainnet', 'testnet'].includes(network)) {
            logger.warn('Invalid network parameter received', {
                network,
                senderEmail
            });
            return res.status(400).json({ error: 'Invalid network parameter. Use "mainnet" or "testnet"' });
        }

        // Find sender user
        logger.debug('Looking up sender', { senderEmail });
        const sender = await User.findOne({ email: senderEmail });
        
        if (!sender) {
            logger.warn('Sender not found', { senderEmail });
            return res.status(404).json({ error: 'Sender not found' });
        }

        // Find or create receiver user
        logger.debug('Looking up receiver', { receiverEmail });
        let receiver = await User.findOne({ email: receiverEmail });

        if (!receiver) {
            logger.info('Creating new receiver account', { receiverEmail });
            const testnetKeypair = Keypair.random();
            const mainnetKeypair = Keypair.random();
            
            receiver = new User({
                email: receiverEmail,
                name: receiverName,
                publicKeyXlmTestnet: testnetKeypair.publicKey(),
                privateKeyXlmTestnet: testnetKeypair.secret(),
                publicKeyXlmMainnet: mainnetKeypair.publicKey(),
                privateKeyXlmMainnet: mainnetKeypair.secret(),
            });
            
            await receiver.save();
            logger.info('New receiver account created', {
                email: receiverEmail,
                publicKey: receiver.publicKeyXlmTestnet
            });
        }

        // Validate Mozart's Stellar public keys are available
        const mozartPublicKey = network === 'testnet' ? 
            process.env.STELLAR_PUBLIC_KEY_TESTNET : 
            process.env.STELLAR_PUBLIC_KEY_MAINNET;

        if (!mozartPublicKey) {
            logger.error('Mozart Stellar public key not found', { network });
            return res.status(500).json({ error: 'Internal configuration error' });
        }

        logger.debug('Using Mozart destination account', { 
            network,
            publicKey: mozartPublicKey
        });

        // Verify the destination account exists
        try {
            const server = getServer(network);
            await server.loadAccount(mozartPublicKey);
            logger.debug('Mozart destination account verified');
        } catch (error) {
            logger.error('Mozart destination account not found on network', {
                network,
                publicKey: mozartPublicKey
            });
            return res.status(500).json({ 
                error: 'Destination account not found on network',
                details: 'The Mozart receiving account has not been created on the network'
            });
        }

        // Process the transaction
        logger.debug('Preparing Stellar transaction');
        const decryptedPrivateKey = await decryptPrivateKey(
            network === 'testnet' ? sender.privateKeyXlmTestnet : sender.privateKeyXlmMainnet,
            network
        );
        const stellarResult = await sendStellarTransaction(
            decryptedPrivateKey,
            mozartPublicKey,
            amount,
            network
        );

        // Create transaction record
        logger.debug('Creating transaction record');
        const transaction = new Transaction({
            senderEmail,
            receiverEmail,
            amount,
            status: 'completed',
            transactionHash: stellarResult.hash,
            network
        });
        
        await transaction.save();
        logger.info('Transaction record created', {
            transactionId: transaction._id,
            hash: stellarResult.hash
        });

        // Send email notifications
        try {
            logger.debug('Sending email notifications');
            await Promise.all([
                mailer.send(receiverEmail, 'Payment Received', `You have received ${amount} XLM from ${senderEmail}`),
                mailer.send(senderEmail, 'Payment Sent', `Your payment of ${amount} XLM to ${receiverEmail} has been sent`)
            ]);
            logger.info('Email notifications sent successfully');
        } catch (emailError) {
            logger.error('Failed to send email notifications', {
                error: emailError instanceof Error ? emailError.message : 'Unknown error'
            });
            // Continue processing as email failure shouldn't affect transaction
        }

        return res.status(200).json({
            message: 'Transaction completed successfully',
            transactionHash: stellarResult.hash,
            amount,
            receiver: receiverEmail
        });

    } catch (error) {
        logError(error as Error, 'send-money', req);
        return res.status(500).json({
            error: 'Failed to process transaction',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

export default router;

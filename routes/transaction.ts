// routes/api.ts
import express, { Request, Response } from 'express';
import Transaction, { ITransaction } from '../models/Transaction';

const router = express.Router();

router.post('/', async (req: Request, res: Response) => {
    res.header("Access-Control-Allow-Origin", '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
    res.header("Access-Control-Allow-Headers", 'Origin,X-Requested-With,Content-Type,Accept,content-type,application/json');
    res.header('Content-Type', 'application/json');
  
    const { country, amount, receiverName, receiverEmail, senderEmail } = req.body;

    try {
        const newTransaction: ITransaction = new Transaction({
            senderEmail,
            country,
            amount,
            receiverName,
            receiverEmail,
        });

        await newTransaction.save();

        res.status(201).json({ message: 'Transaction data stored successfully.' });
    } catch (error) {
        console.error('Error storing transaction data:', error);
        res.status(500).json({ error: 'An error occurred while storing the data.' });
    }
});

export default router;

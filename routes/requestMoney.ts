// routes/api.ts
import express, { Request, Response } from 'express';
import MoneyRequest, { IMoneyRequest } from '../models/MoneyRequest';

const router = express.Router();

router.post('/', async (req: Request, res: Response) => {
    const { country, amount, receiverName, receiverEmail, senderEmail } = req.body;

    try {
        const newTransaction: IMoneyRequest = new MoneyRequest({
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

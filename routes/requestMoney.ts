// routes/api.ts
import express, { Request, Response } from 'express';
import MoneyRequest, { IMoneyRequest } from '../models/MoneyRequest';
import { NodeMailgun } from 'ts-mailgun';
const mailer = new NodeMailgun();
mailer.apiKey =  'key-c8d12b7428fbe666e074108aaa0820bc' || 'key-yourkeyhere'
mailer.domain = 'mozartpay.com';
mailer.options = {
  host: 'api.eu.mailgun.net'
};
mailer.fromEmail = 'admin@mozartpay.com';
mailer.fromTitle = 'MozartPay';
mailer.init();
const router = express.Router();

router.post('/', async (req: Request, res: Response) => {
    res.header("Access-Control-Allow-Origin", '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
    res.header("Access-Control-Allow-Headers", 'Origin,X-Requested-With,Content-Type,Accept,content-type,application/json');
    res.header('Content-Type', 'application/json');
  
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
         // Send email notification

    mailer
    .send(receiverEmail, 'MozartPay', `New Payment Request has been sent to you account from ${senderEmail} :<br><br>` +
      `Date: ${new Date().toUTCString()}<br>` +
      `Amount: ${amount}<br><br>` +
      "You're receiving this message because of a successful payment request has been sent. If you believe that this payment request is suspicious, please contact us immediately.<br><br>" +
      "If you're aware of this payment, please disregard this notice.<br><br>" +
      "Thanks,We will get in touch with you as soon as the payment has been made. <br><br>")
    .then((result) => console.log('Done', result))
    .catch((error) => console.error('Error: ', error));

    mailer
    .send(senderEmail, 'MozartPay', `your Payment Request has been sent successfully to ${receiverEmail} :<br><br>` +
      `Date: ${new Date().toUTCString()}<br>` +
      `Amount: ${amount}<br><br>` +
      "You're receiving this message because of a successful payment request has been sent from your account. If you believe that this payment request is suspicious,  please <a href='https://www.mozartpay.com/forgot_password'>Reset Password</a>` immediately.<br><br>" +
      "If you're aware of this payment, please disregard this notice.<br><br>" +
      "Thanks,<br><br>")
    .then((result) => console.log('Done', result))
    .catch((error) => console.error('Error: ', error));





        res.status(201).json({ message: 'Transaction data stored successfully.' });
    } catch (error) {
        console.error('Error storing transaction data:', error);
        res.status(500).json({ error: 'An error occurred while storing the data.' });
    }
});


router.get('/:senderEmail', async (req: Request, res: Response) => {
  try {
    const senderEmail = req.params.senderEmail;
    
    const transactions: IMoneyRequest[] = await MoneyRequest.find({ senderEmail });

    if (!transactions) {

      return res.status(404).json({ message: 'No transactions found for the provided senderEmail' });
      
    }

    res.status(200).json(transactions);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});


export default router;

import express, { Request, Response } from 'express';
import MoneyRequest, { IMoneyRequest } from '../models/MoneyRequest';
import { NodeMailgun } from 'ts-mailgun';
import * as dotenv from 'dotenv';

const mailer = new NodeMailgun();
dotenv.config({ path: 'config.env' });
mailer.apiKey = process.env.MAILGUN_API_KEY || '';
mailer.domain = process.env.MAILGUN_DOMAIN || 'mozartpay.com';
mailer.options = {
  host: process.env.MAILGUN_API_HOST
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

  const { country, amount, currency, receiverName, receiverEmail, senderEmail } = req.body; // Added currency

  try {
    const newTransaction: IMoneyRequest = new MoneyRequest({
      senderEmail,
      country,
      amount,
      currency, // Added currency
      receiverName,
      receiverEmail,
    });

    await newTransaction.save();

    // Generate URLs to view the request in the dashboard (assuming frontend routes)
    const transactionId = newTransaction._id; // Assuming Mongoose generates `_id`
    const receiverUrl = `https://www.mozartpay.com/login?redirect=/admin/?requestId=${transactionId}`;
    const senderUrl = `https://www.mozartpay.com/login?redirect=/admin/payment-requests?requestId=${transactionId}`;

    // Send email to receiver
    mailer
      .send(receiverEmail, 'You have received a payment request - MozartPay', 
        `New Payment Request has been sent to your account from ${senderEmail}:<br><br>` +
        `Date: ${new Date().toUTCString()}<br>` +
        `Amount: ${amount} ${currency}<br><br>` + // Updated email content to include currency
        `Click <a href="${receiverUrl}">here</a> to log in and view the payment request details. Once logged in, you will be able to approve the request.<br><br>` +
        "You're receiving this message because of a successful payment request. If you believe this is suspicious, please contact us immediately.<br><br>" +
        "If you're aware of this payment, please disregard this notice.<br><br>" +
        "Thanks, we will notify you when the payment has been processed.<br><br>")
      .then((result) => console.log('Receiver email sent', result))
      .catch((error) => console.error('Error sending to receiver: ', error));

    // Send email to sender
    mailer
      .send(senderEmail, 'You have sent a payment request - MozartPay', 
        `Your Payment Request has been sent successfully to ${receiverEmail}:<br><br>` +
        `Date: ${new Date().toUTCString()}<br>` +
        `Amount: ${amount} ${currency}<br><br>` + // Updated email content to include currency
        `Click <a href="${senderUrl}">here</a> to log in and view the status of your payment request.<br><br>` +
        "You're receiving this message because of a successful payment request sent from your account. If you believe this is suspicious, please <a href='https://www.mozartpay.com/forgot_password'>reset your password</a> immediately.<br><br>" +
        "If you're aware of this payment, please disregard this notice.<br><br>" +
        "Thanks,<br><br>")
      .then((result) => console.log('Sender email sent', result))
      .catch((error) => console.error('Error sending to sender: ', error));

    res.status(201).json({ message: 'Transaction data stored and emails sent successfully.' });
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

router.get('/receiver/:receiverEmail', async (req: Request, res: Response) => {
  try {
    const receiverEmail = req.params.receiverEmail;
    const transactions: IMoneyRequest[] = await MoneyRequest.find({ receiverEmail });

    if (!transactions) {
      return res.status(404).json({ message: 'No transactions found for the provided receiverEmail' });
    }

    res.status(200).json(transactions);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;

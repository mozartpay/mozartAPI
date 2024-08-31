// import express, { Express, Request, Response } from "express";
// import axios, { AxiosError } from 'axios';
// import { PurchaseModel, PurchaseDocument } from '../models/AirtmPayment';
// import { v4 as uuidv4 } from 'uuid';
// import { NodeMailgun } from 'ts-mailgun';
// const mailer = new NodeMailgun();
// mailer.apiKey =  process.env.mailer || 'key-yourkeyhere'
// mailer.domain = 'mozartpay.com';
// mailer.options = {
//   host: 'api.eu.mailgun.net'
// };
// mailer.fromEmail = 'admin@mozartpay.com';
// mailer.fromTitle = 'MozartPay';
// mailer.init();



// const router = express.Router();
// const app = express();
// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));

// router.post('/create-payment', async (req: Request, res: Response) => {
//   res.header("Access-Control-Allow-Origin", '*');
//   res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
//   res.header("Access-Control-Allow-Headers", 'Origin,X-Requested-With,Content-Type,Accept,content-type,application/json');
//   res.header('Content-Type', 'application/json');


//   const apiKey = process.env.apiKey
//   const apiSecret = process.env.apiSecret

//   const credentials = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');
//   const authorizationHeader = `Basic ${credentials}`;

//   const { amount } = req.body;
//   const { email } = req.body;

//   const purchaseData = {
//     code: uuidv4(),
//     description: 'Test purchase',
//     cancel_uri: 'https://www.mozartpay.com/cancel',
//     confirmation_uri: 'https://www.mozartpay.com/confirm',
//     callback_uri: 'https://www.mozartpay.com/callback',
//     amount,
//     airtm_user_email: email,
//     items: [
//       {
//         description: 'Test item 1',
//         amount,
//         quantity: 1,
//       },
//     ],
//   };

  
//   try {
//     const response = await axios.post('https://payments.static-stg.tests.airtm.org/purchases', purchaseData, {
//       headers: {
//         'Content-Type': 'application/json',
//         Authorization: authorizationHeader,
//       },
//     });

//     const payment = response.data;
//     const savedPurchase: PurchaseDocument = await PurchaseModel.create(payment);
//     console.log('Purchase created successfully:', savedPurchase);
//     // Send email notification

//     mailer
//       .send(email, 'MozartPay', `New Payment has been done with this account:<br><br>` +
//         `Timestamp: ${new Date().toUTCString()}<br>` +
//         `IP Address: ${req.ip}<br>` +
//         `User agent: ${req.get('User-Agent')}<br><br>` +
//         `Amount: ${amount}<br><br>` +
//         `Transaction code: ${purchaseData.code}<br><br>` +
//         "You're receiving this message because of a successful payment has been done. If you believe that this payment is suspicious, please <a href='https://www.mozartpay.com/forgot_password'>Reset Password</a>` immediately.<br><br>" +
//         "If you're aware of this payment, please disregard this notice.<br><br>" +
//         "Thanks,<br><br>")
//       .then((result) => console.log('Done', result))
//       .catch((error) => console.error('Error: ', error));


//     res.status(200).json({ message: 'Purchase created successfully', data: savedPurchase });
//   } catch (error) {
//     console.error('Error creating payment:', error);
//     if (axios.isAxiosError(error)) {
//       const axiosError = error as AxiosError;
//       console.error('Status Code:', axiosError.response?.status);
//       console.error('Response Data:', axiosError.response?.data);
//       res.status(500).json({ error: 'Internal Server Error' });
//     } else {
//       res.status(500).json({ error: 'Internal Server Error' });
//     }
//   }
// });


// router.get('/:id', async (req: Request, res: Response) => {
//   const purchaseId = req.params.id;

//   try {
//     const purchase = await PurchaseModel.findOne({ id: purchaseId });
//     if (purchase) {
//       // If the purchase is found, send it as a response
//       res.json(purchase);
//     } else {
//       // If the purchase is not found, send a 404 Not Found response
//       res.status(404).json({ error: 'Purchase not found' });
//     }
//   } catch (error) {
//     // Handle any errors that occurred during the retrieval process
//     console.error('Error fetching purchase:', error);
//     res.status(500).json({ error: 'Internal server error' });
//   }
// });


// router.get('/fetch/:code', async (req: Request, res: Response) => {
//   const { code } = req.params;

//   try {
//     const purchase = await PurchaseModel.findOne({ code: code.trim() }).exec();
//     if (!purchase) {
//       console.log(`Purchase with code "${code}"not found`);
//       return res.status(404).json({ message: 'Purchase notttt found' });
//     }

//     return res.status(200).json({ purchase });
//   } catch (error) {
//     console.error(error);
//     return res.status(500).json({ message: 'Server error' });
//   }
// });

// router.get('/purchases/:email', async (req: Request, res: Response) => {
//   try {
//     const email = req.params.email;

//     const purchases: PurchaseDocument[] = await PurchaseModel.find({ 'airtm_user_email': email });

//     if (purchases.length === 0) {
//       return res.status(404).json({ message: 'No purchases found for the provided email' });
//     }

//     res.status(200).json({ purchases });
//   } catch (error) {
//     console.error('Error:', error);
//     res.status(500).json({ message: 'Internal server error' });
//   }
// });

// router.patch('/confirmed/:code', async (req: Request, res: Response) => {
//   try {
//     const { code } = req.params;


//     // Find the purchase by ID
//     const purchase = await PurchaseModel.findOne({ code: code.trim() }).exec();
//     if (!purchase) {
//       return res.status(404).json({ message: 'Purchase not found' });
//     }

//     // Update the status to 'Created'
//     purchase.status = 'Confirmed';
//     await purchase.save();

//     return res.status(200).json({ message: 'Purchase status updated to Created' });
//   } catch (error) {
//     console.error('Error updating purchase status:', error);
//     return res.status(500).json({ message: 'Internal server error' });
//   }
// });

// router.patch('/rejected/:code', async (req: Request, res: Response) => {
//   try {
//     const { code } = req.params;


//     // Find the purchase by ID
//     const purchase = await PurchaseModel.findOne({ code: code.trim() }).exec();
//     if (!purchase) {
//       return res.status(404).json({ message: 'Purchase not found' });
//     }

//     // Update the status to 'Created'
//     purchase.status = 'Rejected';
//     await purchase.save();

//     return res.status(200).json({ message: 'Purchase status updated to Created' });
//   } catch (error) {
//     console.error('Error updating purchase status:', error);
//     return res.status(500).json({ message: 'Internal server error' });
//   }
// });


// router.patch('/failed/:code', async (req: Request, res: Response) => {
//   try {
//     const { code } = req.params;


//     // Find the purchase by ID
//     const purchase = await PurchaseModel.findOne({ code: code.trim() }).exec();
//     if (!purchase) {
//       return res.status(404).json({ message: 'Purchase not found' });
//     }

//     // Update the status to 'Created'
//     purchase.status = 'Failed';
//     await purchase.save();

//     return res.status(200).json({ message: 'Purchase status updated to Created' });
//   } catch (error) {
//     console.error('Error updating purchase status:', error);
//     return res.status(500).json({ message: 'Internal server error' });
//   }
// });

// export default router;

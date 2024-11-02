// import express, { Request, Response } from 'express';
// import paypal from '@paypal/checkout-server-sdk';
// import StellarSdk from '@stellar/stellar-sdk';
// import { User } from '../models/user'; // Import User model
// import dotenv from 'dotenv';

// // Load environment variables
// dotenv.config();

// const router = express.Router();
// const server = new StellarSdk.Horizon.Server('https://horizon-testnet.stellar.org'); // Stellar testnet URL

// // PayPal environment setup
// const environment = new paypal.core.SandboxEnvironment(
//   process.env.PAYPAL_CLIENT_ID as string,
//   process.env.PAYPAL_CLIENT_SECRET as string
// );
// const client = new paypal.core.PayPalHttpClient(environment);

// // Route to initiate the purchase
// router.post('/create-order', async (req: Request, res: Response) => {
//   try {
//     const { amount } = req.body;

//     if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
//       return res.status(400).json({ error: 'Invalid amount' });
//     }

//     const formattedAmount = parseFloat(amount).toFixed(2); // Use two decimals for USD

//     // Create the PayPal order
//     const orderRequest = {
//       intent: 'CAPTURE',
//       purchase_units: [
//         {
//           amount: {
//             currency_code: 'USD',
//             value: formattedAmount,
//           },
//         },
//       ],
//     };

//     const request = new paypal.orders.OrdersCreateRequest();
//     request.requestBody(orderRequest);

//     const order = await client.execute(request);

//     return res.status(201).json({ id: order.result.id });
//   } catch (error) {
//     console.error('Error creating PayPal order:', error);
//     return res.status(500).json({ error: 'Failed to create PayPal order' });
//   }
// });

// // Route to capture the payment and send XLM
// router.post('/capture-order', async (req: Request, res: Response) => {
//   try {
//     const { orderID, email, xlmAddress } = req.body;

//     // Validate Stellar address
//     if (!StellarSdk.StrKey.isValidEd25519PublicKey(xlmAddress)) {
//       return res.status(400).json({ error: 'Invalid Stellar address' });
//     }

//     // Capture the PayPal order
//     const request = new paypal.orders.OrdersCaptureRequest(orderID);
//     request.requestBody({});
//     const capture = await client.execute(request);

//     if (capture.result.status !== 'COMPLETED') {
//       return res.status(400).json({ error: 'Payment not completed' });
//     }

//     // Calculate the amount of XLM to send
//     const usdAmount = parseFloat(capture.result.purchase_units[0].amount.value);
//     const xlmPriceInUsd = 0.10; // Example price: 1 XLM = 0.10 USD
//     const xlmAmount = (usdAmount / xlmPriceInUsd).toFixed(7); // Up to 7 decimal places for XLM

//     // Load user account from the database
//     const user = await User.findOne({ email });
//     if (!user) {
//       return res.status(404).json({ error: 'User not found' });
//     }

//     // Decrypt the user's private key
//     const decryptedPrivateKey = decryptPrivateKey(user.privateKeyXlm);

//     // Create the Stellar keypair from the decrypted private key
//     const sourceKeypair = StellarSdk.Keypair.fromSecret(decryptedPrivateKey);

//     // Load the user's Stellar account
//     const account = await server.loadAccount(sourceKeypair.publicKey());

//     // Build the transaction to send XLM
//     const transaction = new StellarSdk.TransactionBuilder(account, {
//       fee: StellarSdk.BASE_FEE,
//       networkPassphrase: StellarSdk.Networks.TESTNET,
//     })
//       .addOperation(
//         StellarSdk.Operation.payment({
//           destination: xlmAddress,
//           asset: StellarSdk.Asset.native(),
//           amount: xlmAmount, // Send the calculated XLM amount
//         })
//       )
//       .setTimeout(30)
//       .build();

//     // Sign the transaction
//     transaction.sign(sourceKeypair);

//     // Submit the transaction to the Stellar network
//     const result = await server.submitTransaction(transaction);

//     // Respond with success
//     return res.status(200).json({
//       message: 'XLM purchase successful',
//       result,
//       xlmAmount,
//     });
//   } catch (error) {
//     console.error('Error capturing PayPal order or sending XLM:', error);
//     return res.status(500).json({ error: 'Failed to process purchase' });
//   }
// });

// export default router;


// Explanation:
// Create PayPal Order:

// The /create-order route handles creating a PayPal order for purchasing XLM.
// It sends the amount in USD to PayPal and returns an order ID for the client to proceed with the payment.
// Capture PayPal Order & Send XLM:

// The /capture-order route is triggered once PayPal confirms the payment.
// It captures the PayPal order, verifies the payment status, calculates the corresponding XLM amount based on the current price (in this example, 1 XLM = 0.10 USD), and sends XLM to the user’s Stellar address.
// The Stellar transaction is built, signed, and submitted to the testnet.
// Key Points:
// You must replace the xlmPriceInUsd with a dynamic price-fetching mechanism for real-time XLM/USD price.
// Ensure PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET are added to your environment variables (.env file).
// Let me know if you need help with further modifications!
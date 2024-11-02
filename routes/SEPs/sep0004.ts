// import express, { Express } from "express";
// import StellarSdk from '@stellar/stellar-sdk';

// const { Keypair, TransactionBuilder, Networks, BASE_FEE, Operation } = StellarSdk;

// const server = new StellarSdk.Horizon.Server('https://horizon-testnet.stellar.org');

// const app = express();


// // Helper function to get transactions for an account
// const getAccountTransactions = async (accountId, startTime, endTime) => {
//   let records = [];
//   try {
//     const transactions = await StellarSdk.transactions().forAccount(accountId).call();
//     // Filter transactions based on the provided timeframe
//     records = transactions.records.filter(transaction => {
//       const txTime = new Date(transaction.created_at).getTime();
//       return (!startTime || txTime >= startTime) && (!endTime || txTime <= endTime);
//     });
//   } catch (err) {
//     console.error("Error fetching transactions: ", err);
//   }
//   return records;
// };

// // Check for cached data before fetching
// app.get('/account/:accountId/transactions', async (req, res) => {
//     const { accountId } = req.params;
//     const { start, end } = req.query;
  
//     // Check if cached
//     let cachedData = await Transaction.findOne({ accountId });
  
//     if (cachedData) {
//       return res.json(cachedData);
//     }
  
//     // If no cache, fetch from Stellar
//     const transactions = await getAccountTransactions(accountId, startTime, endTime);
  
//     const newTransactionData = new Transaction({
//       accountId,
//       transactions,
//     });
  
//     await newTransactionData.save();
//     res.json(newTransactionData);
//   });
  
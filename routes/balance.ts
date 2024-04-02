import express, { Request, Response } from "express";
import mongoose from 'mongoose';
import { User } from '../models/user';

const router = express.Router();

// Assuming you have a function to convert currencies to USD
async function convertCurrencyToUSD(amount: number, currency: string): Promise<number> {
  if (currency === 'USD') {
    return amount;
  }
  // Here you should call an actual currency conversion service
  // This is a placeholder that returns the input amount for the sake of this example
  return amount;
}

router.post('/add-balance', async (req: Request, res: Response) => {
  try {
    // You'll need to get the userId in a way that fits your authentication strategy
    const userId = new mongoose.Types.ObjectId(req.body.userId);
    const { amount, currency } = req.body;

    // Convert the amount to USD if necessary
    const amountInUSD = await convertCurrencyToUSD(parseFloat(amount), currency);

    // Find the user and update their balance
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const currentBalance = parseFloat(user.balance || '0'); // Default to 0 if no balance is set
    const newBalance = (currentBalance + amountInUSD).toFixed(2); // Assuming we keep two decimals for cents

    user.balance = newBalance;
    await user.save();

    res.status(200).json({ message: 'Balance updated successfully', newBalance: user.balance });
  } catch (error) {
    console.error('Error during balance update:', error);
    res.status(500).json({ message: 'Internal server error. Please try again later.' });
  }
});

// GET route to fetch the user's balance by email
router.get('/balance/:email', async (req: Request, res: Response) => {
  try {
    const email = req.query.email;

    if (typeof email !== 'string') {
      return res.status(400).json({ message: 'Invalid email format.' });
    }

    // Find the user by email
    const user = await User.findOne({ email: email }).select('balance -_id'); // Select only the balance field
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // Return the user's balance
    res.status(200).json({ balance: user.balance });
  } catch (error) {
    console.error('Error fetching user balance:', error);
    res.status(500).json({ message: 'Internal server error. Please try again later.' });
  }
});
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

export default router;

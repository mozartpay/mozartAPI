import express, { Express, Request, Response } from 'express';
import { User } from '../models/user'; 
import cors from 'cors';

const app = express();
const router = express.Router();

// Enable CORS for specific origin and allow credentials
app.use(cors({
  origin: 'http://localhost:3000', // Allow requests from your frontend origin
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Access-Control-Allow-Origin'],
  credentials: true, // Allow credentials (cookies, authentication headers, etc.)
}));

// Route to get user by email
router.get('/:email', async (req: Request, res: Response) => {
  try {
    const email = req.params.email;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Extract and return user information
    const userInfo = user;
    res.status(200).json(userInfo);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Route to update user's image
router.post('/image', async (req: Request, res: Response) => {
  try {
    const { email, image } = req.body;

    const user = await User.findOneAndUpdate({ email }, { image }, { new: true });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    console.log('User image updated:', user);
    return res.status(200).json({ message: 'User image updated successfully', user });
  } catch (error) {
    console.error('Error updating user image:', error);
    return res.status(500).json({ message: 'User image update failed' });
  }
});

// New route to update user's preferred currency
router.post('/preferredCurrency', async (req: Request, res: Response) => {
  try {
    const { email, preferredCurrency } = req.body;

    if (!email || !preferredCurrency) {
      return res.status(400).json({ message: 'Email and preferred currency are required' });
    }

    const user = await User.findOneAndUpdate(
      { email },
      { preferredCurrency },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    console.log('User preferred currency updated:', user.preferredCurrency);
    return res.status(200).json({ message: 'Preferred currency updated successfully', preferredCurrency: user.preferredCurrency });
  } catch (error) {
    console.error('Error updating user preferred currency:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;

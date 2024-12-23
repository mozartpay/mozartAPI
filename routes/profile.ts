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

    console.log('User preferred currency updated:', user.preferences.currency);
    return res.status(200).json({ 
      message: 'Preferred currency updated successfully', 
      user
    });
  } catch (error) {
    console.error('Error updating user preferred currency:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Route to update user's preferred network
router.post('/preferredNetwork', async (req: Request, res: Response) => {
  try {
    const { email, preferredNetwork } = req.body;

    if (!email || !preferredNetwork) {
      return res.status(400).json({ message: 'Email and preferred network are required' });
    }

    const user = await User.findOneAndUpdate(
      { email },
      { preferredNetwork },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    console.log('User preferred network updated:', user.preferences.network);
    return res.status(200).json({ 
      message: 'Preferred network updated successfully', 
      user
    });
  } catch (error) {
    console.error('Error updating user preferred network:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Route to update user's balance visibility setting
router.post('/hideBalances', async (req: Request, res: Response) => {
  try {
    const { email, hideBalances } = req.body;

    // Input validation
    if (!email) {
      return res.status(400).json({
        status: 'error',
        code: 'MISSING_EMAIL',
        message: 'Email is required'
      });
    }

    if (typeof hideBalances !== 'boolean') {
      return res.status(400).json({
        status: 'error',
        code: 'INVALID_HIDE_BALANCES',
        message: 'hideBalances must be a boolean value'
      });
    }

    const user = await User.findOneAndUpdate(
      { email },
      { hideBalances },
      { 
        new: true,
        maxTimeMS: 15000
      }
    );

    if (!user) {
      return res.status(404).json({
        status: 'error',
        code: 'USER_NOT_FOUND',
        message: 'User not found'
      });
    }

    // Enhanced logging based on hideBalances value
    if (hideBalances) {
      console.log(`User ${email} has enabled balance hiding`);
    } else {
      console.log(`User ${email} has disabled balance hiding`);
    }
    console.log('User balance visibility updated:', user.preferences.hideBalances);

    return res.status(200).json({
      status: 'success',
      data: {
        user
      },
      message: `Balance visibility ${hideBalances ? 'hidden' : 'shown'} successfully`
    });

  } catch (error: any) {
    console.error('Error updating balance visibility:', error);
    
    // Database timeout errors
    if (error.name === 'MongooseError' && error.message.includes('buffering timed out')) {
      return res.status(503).json({
        status: 'error',
        code: 'DATABASE_TIMEOUT',
        message: 'Database operation timed out. Please try again later'
      });
    }
    
    if (error.name === 'MongoTimeoutError') {
      return res.status(503).json({
        status: 'error',
        code: 'CONNECTION_TIMEOUT',
        message: 'Database connection timed out. Please try again later'
      });
    }

    // Validation errors
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        status: 'error',
        code: 'VALIDATION_ERROR',
        message: 'Invalid data provided',
        details: error.message
      });
    }

    // Generic database errors
    if (error.name === 'MongoError' || error.name === 'MongoServerError') {
      return res.status(503).json({
        status: 'error',
        code: 'DATABASE_ERROR',
        message: 'Database error occurred. Please try again later'
      });
    }

    // Default error response
    return res.status(500).json({
      status: 'error',
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred'
    });
  }
});

export default router;

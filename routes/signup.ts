import express, { Express, Request, Response } from "express";
import bcrypt from 'bcrypt';
import { User } from '../models/user';
import jwt from 'jsonwebtoken';
import initMB from 'messagebird';
import dotenv from 'dotenv';

const router = express.Router();
dotenv.config({ path: '.env.production' });

export interface CustomRequest extends Request {
  token: string;
}

router.post('/', async (req: Request, res: Response) => {
  try {
    const { email, password, fullname, number } = req.body;

    // Add phone number validation
    if (!number) {
      return res.status(400).json({ message: 'Phone number is required.' });
    }

    // Basic phone number format validation (you might want to adjust this regex based on your needs)
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    if (!phoneRegex.test(number)) {
      return res.status(400).json({ message: 'Invalid phone number format. Please use international format (e.g., +1234567890).' });
    }

    // Check if the email is already registered
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: 'Email already exists. Please use a different email.' });
    }

    // Hash the password using bcrypt
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Generate a random verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Create a new user document in MongoDB
    const newUser = new User({
      email,
      password: hashedPassword,
      name: fullname,
      number: number,
      balance: "0",
      balanceUsd: "0",
      balanceEur: "0",
      balanceCop: "0",
      verificationCode: verificationCode,
      preferredNetwork: "https://horizon-testnet.stellar.org",
      isPhoneVerified: false,
      isEmailVerified: false,
    });

    // Get JWT secret from environment variables
    const jwtSecret = process.env.JWT_SECRET as string;

    if (!jwtSecret) {
      throw new Error('JWT secret is not defined in environment variables.');
    }

    const token = jwt.sign({ _id: newUser._id?.toString(), name: newUser.name }, jwtSecret, {
      expiresIn: '1 hour',
    });

    newUser.token = token;
    const savedUser = await newUser.save();

    // Initialize the MessageBird client with API key from environment variables
    const messagebirdApiKey = process.env.MESSAGEBIRD_API_KEY as string;

    if (!messagebirdApiKey) {
      throw new Error('MessageBird API key is not defined in environment variables.');
    }

    const messagebird = initMB(messagebirdApiKey);

    const params = {
      originator: 'MozartPay',
      recipients: [savedUser.number],
      body: `Your verification code is: ${verificationCode}`,
    };

    // Sending SMS using the MessageBird client
    messagebird.messages.create(params, (err, response) => {
      if (err) {
        console.error('Error sending SMS:', err);
      } else {
        console.log('SMS sent successfully:', response);
      }
    });

    return res.status(201).json({
      message: 'Phone number verification code sent!',
      user: {
        email: newUser.email,
        name: newUser.name,
        isPhoneVerified: newUser.isPhoneVerified,
      },
      token,
    });
  } catch (error) {
    console.error('Error during signup:', error);
    return res.status(500).json({ message: 'Internal server error. Please try again later.' });
  }
});

router.post('/verify', async (req: Request, res: Response) => {
  try {
    const { email, code } = req.body;

    // Find the user by email
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // Compare the provided verification code with the one stored in the user document
    if (user.verificationCode === code) {
      // Update the user's phone verification status
      user.isPhoneVerified = true;
      await user.save();
      
      return res.status(200).json({ message: 'Phone number verified successfully.' });
    } else {
      return res.status(400).json({ message: 'Invalid verification code.' });
    }
  } catch (error) {
    console.error('Error during verification:', error);
    return res.status(500).json({ message: 'Internal server error. Please try again later.' });
  }
});

export default router;

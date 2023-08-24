import express, { Express, Request, Response } from "express";
import bcrypt from 'bcrypt';
import { User } from '../models/user';
import jwt from 'jsonwebtoken';
import initMB from 'messagebird';
const router = express.Router();
require('dotenv').config();

export interface CustomRequest extends Request {
  token: string;
}

router.post('/', async (req: Request, res: Response) => {
  res.header("Access-Control-Allow-Origin", '*');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
  res.header("Access-Control-Allow-Headers", 'Origin,X-Requested-With,Content-Type,Accept,content-type,application/json');
  res.header('Content-Type', 'application/json');
  try {
    const { email, password, fullname, number } = req.body;
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
      verificationCode:verificationCode,
    });
  
    const token = jwt.sign({ _id: newUser._id?.toString(), name: newUser.name }, 'pvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.vaYmi2wAFIP-RGn6jvfY_MUYwghZd8rZzeDeZ4xiQmk', {
      expiresIn: '99 days',
    });
    newUser.token = token;
    const savedUser = await newUser.save();

 
    // Initialize the MessageBird client
    const messagebird = initMB('txZ7iSUHutKrn8eXHZVMTaGxB');

    
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
      message: 'Signup successful!',
      user: {
        email: newUser.email,
        name: newUser.name,
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
      return res.status(200).json({ message: 'Verification code is valid.' });
    } else {
      return res.status(400).json({ message: 'Invalid verification code.' });
    }
  } catch (error) {
    console.error('Error during verification:', error);
    return res.status(500).json({ message: 'Internal server error. Please try again later.' });
  }
});
export default router;
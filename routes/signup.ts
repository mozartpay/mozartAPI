import express, { Express, Request, Response } from "express";
import bcrypt from 'bcrypt';
import { User } from '../models/user';
import jwt from 'jsonwebtoken';
import Secret from 'jsonwebtoken';
import JwtPayload from 'jsonwebtoken';
const router = express.Router();

export const SECRET_KEY = 'pvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.vaYmi2wAFIP-RGn6jvfY_MUYwghZd8rZzeDeZ4xiQmk';
export interface CustomRequest extends Request {
  token: string;
}

router.post('/', async (req: Request, res: Response) => {
  res.header("Access-Control-Allow-Origin", '*');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
  res.header("Access-Control-Allow-Headers", 'Origin,X-Requested-With,Content-Type,Accept,content-type,application/json');
  res.header('Content-Type', 'application/json');
  try {
    const { email, password, fullname } = req.body;
    // Check if the email is already registered
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: 'Email already exists. Please use a different email.' });
    }

    // Hash the password using bcrypt
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create a new user document in MongoDB
    const newUser = new User({
      email,
      password: hashedPassword,
      name: fullname
    });

    const token = jwt.sign({ _id: newUser._id?.toString(), name: newUser.name }, SECRET_KEY, {
      expiresIn: '99 days',
    });
    newUser.token = token;
    await newUser.save();


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

export default router;
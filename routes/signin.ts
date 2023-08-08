import express, { Express, Request, Response } from "express";
import bcrypt from 'bcrypt';
import { User } from '../models/user'; 
const router = express.Router();

router.post('/', async (req: Request, res: Response) => {
  res.header("Access-Control-Allow-Origin", '*');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
  res.header("Access-Control-Allow-Headers", 'Origin,X-Requested-With,Content-Type,Accept,content-type,application/json');
  res.header('Content-Type', 'application/json');
  try {
    const email = req.body.email;
    const password = req.body.password;
    // Check if the user exists in the database
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found. Please check your email and password.' });
    }

    // Check if the provided password matches the hashed password in the database
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ message: 'Incorrect password. Please check your email and password.' });
    }

    // If user exists and password matches, send the user information in the response
    return res.status(200).json({
      message: 'Login successful!',
      user: {
        email: user.email,
        name: user.name,
      },
    });
  } catch (error) {
    console.error('Error during signin:', error);
    return res.status(500).json({ message: 'Internal server error. Please try again later.' });
  }
});


export default router;
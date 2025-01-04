import express, { Express, Request, Response, NextFunction } from "express";
import bcrypt from 'bcrypt';
import { User } from '../models/user';
import crypto from 'crypto';
import cors from 'cors';
import { NodeMailgun } from 'ts-mailgun';
import jwt from 'jsonwebtoken';

import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.production' });

const router = express.Router();
const app: Express = express();

// Set up CORS middleware globally
const allowedOrigins = ['https://www.mozartpay.com', 'http://localhost:3000'];
app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: 'GET,POST,PUT,DELETE,OPTIONS',
  allowedHeaders: 'Origin,X-Requested-With,Content-Type,Accept,Authorization',
  credentials: true, // Allow credentials such as cookies or auth tokens
  optionsSuccessStatus: 200
}));

// Initialize Mailgun with API key and domain from environment variables
const mailer = new NodeMailgun();
mailer.apiKey = process.env.MAILGUN_API_KEY || ''; // Ensure this is set in your environment variables
mailer.domain = process.env.MAILGUN_DOMAIN || 'mozartpay.com';
mailer.options = {
  host: process.env.MAILGUN_API_HOST
};
mailer.fromEmail = 'admin@mozartpay.com';
mailer.fromTitle = 'MozartPay';
mailer.init();

// Middleware to verify JWT token
function verifyToken(req: CustomRequest, res: Response, next: NextFunction) {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ message: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string);
    req.user = decoded; // Now TypeScript won't complain about this
    next();
  } catch (error) {
    res.status(400).json({ message: 'Invalid token.' });
  }
}

interface CustomRequest extends Request {
  user?: any;
}

router.post('/', async (req: Request, res: Response) => {
  res.setHeader("Content-Security-Policy", 
    "default-src 'self'; " +
    "connect-src 'self' https://mozart-api-21ea5fd801a8.herokuapp.com; " +
    "style-src 'self' 'unsafe-inline';"
  );

  console.log("request")
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email })
      .select('+password +preferences');

    if (!user) return res.status(404).json({ message: 'User not found.' });

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) return res.status(401).json({ message: 'Incorrect password.' });

    user.lastLogin = new Date();
    await user.save();

    // Generate JWT
    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET as string,
      { expiresIn: '1h' }
    );

    // Send email notification after successful login
    mailer.send(email, 'MozartPay - Sign-in Verification', `
  <h2>Sign-in Verification for MozartPay</h2>
  <p>Hi,</p>
  <p>We noticed a sign-in attempt associated with your account (${email}). If this was you, no further action is needed. If this seems suspicious, please review the details below:</p>
  
  <ul>
    <li><strong>Timestamp:</strong> ${new Date().toUTCString()}</li>
    <li><strong>IP Address:</strong> ${req.ip}</li>
    <li><strong>User Agent:</strong> ${req.get('User-Agent')}</li>
  </ul>
  
  <p>If this sign-in wasn't initiated by you, we strongly recommend you <a href='https://www.mozartpay.com/forgot_password'>reset your password immediately</a>.</p>

  <p>Your security is important to us. If you have any questions or concerns, feel free to contact our support team.</p>

  <p>Best regards,<br>
  The MozartPay Team<br>
  <small>Powered by OG Technologies EU, based in Vienna, Austria</small></p>
`)
    .then(result => console.log('Email sent: ', result))
    .catch(error => console.error('Error sending email: ', error));

    return res.status(200).json({
      message: 'Login successful!',
      token,
      user: {
        ...user.toJSON(),
        preferences: user.preferences
      }
    });
  } catch (error) {
    console.error('Error during signin:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});

// Function to send reset password email
function sendResetPasswordEmail(email: string, resetToken: string) {
  const resetURL = `https://www.mozartpay.com/reset-password?token=${resetToken}`;
  mailer
    .send(email, 'Reset Password', `<p>Please click the following link to reset your password:</p>
    <a href="${resetURL}">Reset Password</a>`)
    .then(result => console.log('Reset password email sent:', result))
    .catch(error => console.error('Error sending reset password email:', error));
}

router.post('/reset-password', async (req: Request, res: Response) => {
  const email = req.body.email;
  const resetToken = crypto.randomBytes(20).toString('hex');
  const hashedResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');

  try {
    let user = await User.findOneAndUpdate({ email }, { resetToken: hashedResetToken }, { new: true });
    if (!user) return res.status(404).json({ msg: 'User not found' });

    user.resetTokenExpiration = new Date(Date.now() + 3600000); // 1 hour expiration
    await user.save();

    // Send the reset password email
    sendResetPasswordEmail(user.email, resetToken);

    res.json({ msg: 'Reset password email sent' });
  } catch (err) {
    console.log('Error during password reset:', err);
    res.status(500).json({ msg: 'Internal server error' });
  }
});

router.post('/reset-password/:token', async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  try {
    // Find the user with the matching reset token
    const user = await User.findOne({
      resetToken: crypto.createHash('sha256').update(token).digest('hex'),
      resetTokenExpiration: { $gt: new Date() },
    });

    if (!user) return res.status(400).json({ message: 'Invalid or expired reset token.' });

    // Update the user's password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    user.password = hashedPassword;
    user.resetToken = '';
    user.resetTokenExpiration = new Date(0);
    await user.save();

    res.json({ message: 'Password reset successfully.' });
  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

router.post('/validate-reset-token', async (req, res) => {
  const { token } = req.body;

  try {
    const user = await User.findOne({ resetToken: crypto.createHash('sha256').update(token).digest('hex') });

    if (user && !isTokenExpired(user.resetTokenExpiration)) {
      res.json({ tokenValid: true });
    } else {
      res.json({ tokenValid: false });
    }
  } catch (error) {
    console.error('Error validating reset token:', error);
    res.status(500).json({ tokenValid: false });
  }
});

// Function to check if the reset token is expired
function isTokenExpired(expiration: Date): boolean {
  return expiration < new Date();
}

export default router;

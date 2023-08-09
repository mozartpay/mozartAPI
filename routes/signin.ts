import express, { Express, Request, Response } from "express";
import bcrypt from 'bcrypt';
import { User } from '../models/user';
import crypto from 'crypto';
const router = express.Router();
import { NodeMailgun } from 'ts-mailgun';
const mailer = new NodeMailgun();
mailer.apiKey = 'key-c8d12b7428fbe666e074108aaa0820bc' || 'key-yourkeyhere'
mailer.domain = 'mozartpay.com';
mailer.options = {
	host: 'api.eu.mailgun.net'
};
mailer.fromEmail = 'admin@mozartpay.com';
mailer.fromTitle = 'MozartPay';
mailer.init();



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

    // Send email notification

    mailer
  .send(email, 'MozartPay', `We're verifying a recent sign-in for ${email}:<br><br>` +
    `Timestamp: ${new Date().toUTCString()}<br>` +
    `IP Address: ${req.ip}<br>` +
    `User agent: ${req.get('User-Agent')}<br><br>` +
    "You're receiving this message because of a successful sign-in from a device that we didnt recognize. If you believe that this sign-in is suspicious, please <a href='https://www.mozartpay.com/forgot-password'>Reset Password</a>` immediately.<br><br>" +
    "If you're aware of this sign-in, please disregard this notice. This can happen when you use your browser's incognito or private browsing mode or clear your cookies.<br><br>" +
    "Thanks,<br><br>")
  .then((result) => console.log('Done', result))
  .catch((error) => console.error('Error: ', error));


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


// Function to send reset password email
function sendResetPasswordEmail(email:any, resetToken:any) {
  const resetURL = `https://www.mozartpay.com/reset-password?token=${resetToken}`;
  mailer
  .send(email, 'Reset Password', `<p>Please click the following link to reset your password:</p>
  <a href="https://www.mozartpay.com/reset-password?token=${resetToken}">Reset Password</a>`,)
  .then((result) => console.log('Done', result))
  .catch((error) => console.error('Error: ', error));
}


router.post('/reset-password', async (req: Request, res: Response) => {
  const email = req.body.email;

  // Generate a reset token
  const resetToken = crypto.randomBytes(20).toString('hex');

  try {
      // Update user document in the MongoDB collection with the reset token
      let user = await User.findOneAndUpdate({ email }, { resetToken }, { new: true });
      if (!user) {
          return res.status(404).json({ msg: 'User not found' });
      }

      // Store the reset token in the user's document in the MongoDB collection
      user.resetToken = resetToken;
      user.resetTokenExpiration = new Date(Date.now() + 3600000);// Token expiration time (1 hour)
      await user.save();

      // Send reset password email
      sendResetPasswordEmail(user.email, resetToken);

      res.json({ msg: 'Reset password email sent' });
  } catch (err) {
      console.log(err);
      res.status(500).json({ msg: 'Internal server error' });
  }
});

router.post('/reset-password/:token', async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  try {
      // Find the user with the given reset token
      const user = await User.findOne({
          resetToken: token,
          resetTokenExpiration: { $gt: new Date() },
      });

      if (!user) {
          return res.status(400).json({ message: 'Invalid or expired reset token.' });
      }


      console.log('password reset')
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
      // Validate the reset token
      // Compare the token against the stored token in the database
      const user = await User.findOne({ resetToken: token });

      if (user && !isTokenExpired(user.resetTokenExpiration)) {
          // Token is valid
          res.json({ tokenValid: true });
      } else {
          // Token is invalid or expired
          res.json({ tokenValid: false });
      }
  } catch (error) {
      console.error('Error validating reset token:', error);
      res.status(500).json({ tokenValid: false });
  }
});

// Function to check if the token is expired
function isTokenExpired(expiration: Date): boolean {
  // Compare the token expiration with the current time
  return expiration < new Date();
}

export default router;
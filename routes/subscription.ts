import { Router, Request, Response } from 'express';
import Subscription, { ISubscription } from '../models/subscription';

const router = Router();

router.post('/', async (req: Request, res: Response) => {
  res.header("Access-Control-Allow-Origin", '*');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
  res.header("Access-Control-Allow-Headers", 'Origin,X-Requested-With,Content-Type,Accept,content-type,application/json');
  res.header('Content-Type', 'application/json');

  try {
    const { email } = req.body;

    // Check if the email already exists
    const existingSubscription = await Subscription.findOne({ email });
    if (existingSubscription) {
      return res.status(400).json({ message: 'Email already subscribed' });
    }

    // Create a new subscription
    const subscription: ISubscription = new Subscription({ email });
    await subscription.save();

    return res.status(201).json({ message: 'Subscription successful' });
  } catch (error) {
    console.error('Error subscribing:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;

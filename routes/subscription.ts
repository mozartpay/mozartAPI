import { Router, Request, Response } from 'express';
import Subscription, { ISubscription } from '../models/subscription';

const router = Router();

router.post('/', async (req: Request, res: Response) => {
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

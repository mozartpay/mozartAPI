import express, { Request, Response } from 'express';
import Notification from '../models/Notification';

const router = express.Router();

// Get notifications for a specific user
router.get('/:userId', async (req: Request, res: Response) => {
  try {
    const notifications = await Notification.find({ userId: req.params.userId });
    res.json(notifications);
  } catch (err) {
    if (err instanceof Error) {
      res.status(500).json({ message: err.message });
    } else {
      res.status(500).json({ message: 'Unknown error' });
    }
  }
});

// Create a new notification
router.post('/', async (req: Request, res: Response) => {
  const notification = new Notification({
    userId: req.body.userId,
    message: req.body.message,
  });
  try {
    const savedNotification = await notification.save();
    res.json(savedNotification);
  } catch (err) {
    if (err instanceof Error) {
      res.status(500).json({ message: err.message });
    } else {
      res.status(500).json({ message: 'Unknown error' });
    }
  }
});

// Mark notifications as read
router.patch('/:id/read', async (req: Request, res: Response) => {
  try {
    const notification = await Notification.findById(req.params.id);
    if (notification) {
      notification.isRead = true;
      await notification.save();
      res.json(notification);
    } else {
      res.status(404).json({ message: 'Notification not found' });
    }
  } catch (err) {
    if (err instanceof Error) {
      res.status(500).json({ message: err.message });
    } else {
      res.status(500).json({ message: 'Unknown error' });
    }
  }
});

export default router;

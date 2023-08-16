import express, { Request, Response } from 'express';
import { Order, OrderModel } from '../models/order'; 
import { User } from '../models/user'; 
const router = express.Router();
import jwt from 'jsonwebtoken';
export const SECRET_KEY = 'pvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.vaYmi2wAFIP-RGn6jvfY_MUYwghZd8rZzeDeZ4xiQmk';
// GET /orders
router.get('/orders', async (req: Request, res: Response) => {
  try {
    const orders = await OrderModel.find();
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching orders' });
  }
});

// GET /orders/:orderId
router.get('/orders/:orderId', async (req: Request, res: Response) => {
    const orderId = req.params.orderId;
  
    try {
      const order = await OrderModel.findById(orderId);
      if (!order) {
        return res.status(404).json({ message: 'Order not found' });
      }
      res.json(order);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching order' });
    }
  });

// POST /order
router.post('/order', async (req: Request, res: Response) => {
  const newOrder = req.body;

  try {
    // Extract the token from the headers
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ message: 'Authentication token missing' });
    }

    // Decode the token to get the user's email
    const decodedToken: any = jwt.verify(token, SECRET_KEY);
    const id = decodedToken._id;

    // Find the user by email
    const user = await User.findOne({ _id: id });

    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    // Check if the user's token matches the provided token
    if (user.token !== token) {
      return res.status(401).json({ message: 'Invalid authentication token' });
    }

    // Check if the buyerEmail matches the authenticated user's email
    if (newOrder.buyerEmail !== user.email) {
      return res.status(401).json({ message: 'Buyer email does not match authenticated user' });
    }

    // Create the order
    const order = await OrderModel.create(newOrder);

    res.status(201).json({ message: 'Order created successfully', order });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(400).json({ message: 'Error creating order' });
  }
});

// PATCH /orders/:orderId
router.patch('/orders/:orderId', async (req: Request, res: Response) => {
  const orderId = req.params.orderId;
  const updatedOrder: Partial<Order> = req.body;

  try {
    const order = await OrderModel.findByIdAndUpdate(orderId, updatedOrder, { new: true });
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    res.json({ message: 'Order updated successfully', order });
  } catch (error) {
    res.status(400).json({ message: 'Error updating order' });
  }
});

// GET orders by email
router.get('/order/:email', async (req, res) => {
  try {
    const email = req.params.email;
    const orders: Order[] = await OrderModel.find({ buyerEmail: email }).exec();
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;

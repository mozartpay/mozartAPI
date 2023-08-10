import express, { Request, Response } from 'express';
import { Order, OrderModel } from '../models/order'; 

const router = express.Router();

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
  const newOrder: Order = req.body;

  try {
    const order = await OrderModel.create(newOrder);
    res.status(201).json({ message: 'Order created successfully', order });
  } catch (error) {
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
router.get('/orders/:email', async (req, res) => {
  try {
    const email = req.params.email;
    const orders: Order[] = await OrderModel.find({ buyerEmail: email }).exec();
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;

import mongoose, { Document } from 'mongoose';

export interface Order extends Document {
  buyerName: string;
  amount: string;
  buyerEmail: string;
  method: string;
  price: string;
  currency: string;
}

const orderSchema = new mongoose.Schema<Order>({
  buyerName: String,
  amount: String,
  buyerEmail: String,
  method: String,
  price: String,
  currency: String,
});

export const OrderModel = mongoose.model<Order>('Order', orderSchema);

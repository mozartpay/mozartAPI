import mongoose, { Document } from 'mongoose';

export interface Order extends Document {
  buyerName: string;
  amount: string;
  buyerEmail: string;
  method: string;
  status : string;
  currency: string;
  date:Date;
  description:string;
}

const orderSchema = new mongoose.Schema<Order>({
  buyerName: String,
  amount: String,
  buyerEmail: String,
  method: String,
  status : String,
  currency: String,
  date: { type: Date, default: Date.now },
  description:String
});

export const OrderModel = mongoose.model<Order>('Order', orderSchema);

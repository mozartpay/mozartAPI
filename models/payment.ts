import { Schema, model, Document } from 'mongoose';

export interface IPayment extends Document {
  amount: number;
  currency: string;
  paymentMethod: string;
  email: string;
  status: string;
  createdAt: Date;
}

const PaymentSchema = new Schema<IPayment>({
  amount: { type: Number, required: true },
  currency: { type: String, required: true },
  paymentMethod: { type: String, required: true },
  email: { type: String, required: true },
  status: { type: String, default: 'pending' },
  createdAt: { type: Date, default: Date.now },
});

export default model<IPayment>('Payment', PaymentSchema);

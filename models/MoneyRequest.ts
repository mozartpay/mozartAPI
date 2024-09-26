import mongoose, { Document, Schema } from 'mongoose';

export interface IMoneyRequest extends Document {
    senderEmail: string;
    country: string;
    amount: number;
    currency: string; // Added currency field
    receiverName: string;
    receiverEmail: string;
    date: Date;
    status: string;
}

const transactionRequstSchema = new Schema<IMoneyRequest>({
    senderEmail: String,
    country: String,
    amount: Number,
    currency: String, // Added currency field
    receiverName: String,
    receiverEmail: String,
    date: { type: Date, default: Date.now },
    status: { type: String, default: 'pending' },
});

const MoneyRequest = mongoose.model<IMoneyRequest>('MoneyRequest', transactionRequstSchema);

export default MoneyRequest;

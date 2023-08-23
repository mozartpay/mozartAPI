import mongoose, { Document, Schema } from 'mongoose';

export interface ITransaction extends Document {
    senderEmail: string;
    country: string;
    amount: number;
    receiverName: string;
    receiverEmail: string;
}

const transactionSchema = new Schema<ITransaction>({
    senderEmail: String,
    country: String,
    amount: Number,
    receiverName: String,
    receiverEmail: String,
});

const Transaction = mongoose.model<ITransaction>('Transaction', transactionSchema);

export default Transaction;

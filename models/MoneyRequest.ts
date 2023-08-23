import mongoose, { Document, Schema } from 'mongoose';

export interface IMoneyRequest extends Document {
    senderEmail: string;
    country: string;
    amount: number;
    receiverName: string;
    receiverEmail: string;
}

const transactionRequstSchema = new Schema<IMoneyRequest>({
    senderEmail: String,
    country: String,
    amount: Number,
    receiverName: String,
    receiverEmail: String,
});

const MoneyRequest = mongoose.model<IMoneyRequest>('MoneyRequest', transactionRequstSchema);

export default MoneyRequest;

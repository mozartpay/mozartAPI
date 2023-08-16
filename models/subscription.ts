import mongoose, { Document, Schema } from 'mongoose';

export interface ISubscription extends Document {
  email: string;
}

const subscriptionSchema = new Schema({
  email: { type: String, required: true, unique: true },
});

export default mongoose.model<ISubscription>('Subscription', subscriptionSchema);

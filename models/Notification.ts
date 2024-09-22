import mongoose, { Document, Schema } from 'mongoose';

interface NotificationDoc extends Document {
  userId: mongoose.Schema.Types.ObjectId;
  message: string;
  isRead: boolean;
  createdAt: Date;
}

const notificationSchema = new Schema<NotificationDoc>({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Reference to the User model
  message: { type: String, required: true },
  isRead: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

const Notification = mongoose.model<NotificationDoc>('Notification', notificationSchema);

// Correct TypeScript export
export default Notification;


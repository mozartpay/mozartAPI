import mongoose, { Document, Schema } from 'mongoose';

// Define the interface for the Identity document
interface IIdentity extends Document {
  email: string;
  documentType: string;
  document: Buffer;
  createdAt: Date;
  updatedAt: Date;
}

// Create the schema with enhanced fields and parameters
const identitySchema = new Schema<IIdentity>({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/\S+@\S+\.\S+/, 'Email is invalid'], // Simple regex for basic email format
  },
  documentType: {
    type: String,
    required: [true, 'Document type is required'],
    enum: ['passport', 'ID card', 'driver license'], // Restrict values to a set of allowed document types
  },
  document: {
    type: Buffer,
    required: [true, 'Document is required'],
  },
}, {
  timestamps: true,  // Automatically manage createdAt and updatedAt fields
  versionKey: false,  // Disable the __v version key
});

// Index for faster querying on email
identitySchema.index({ email: 1 });

// Create and export the model
const IdentityModel = mongoose.model<IIdentity>('Identity', identitySchema);

export default IdentityModel;

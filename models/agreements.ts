import mongoose from 'mongoose';

interface AgreementDoc extends mongoose.Document {
  contractID: string;
  terms: string;
  createdBy: string;
  signedBy?: string;
  status: 'Created' | 'Signed' | 'Canceled' | 'Updated';
  newTerms?: string;
  createdAt: Date;
  updatedAt: Date;
}

const agreementSchema = new mongoose.Schema<AgreementDoc>({
  contractID: { type: String, required: true, unique: true },
  terms: { type: String, required: true },
  createdBy: { type: String, required: true },
  signedBy: { type: String },
  status: { 
    type: String, 
    enum: ['Created', 'Signed', 'Canceled', 'Updated'],
    default: 'Created' 
  },
  newTerms: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Update the updatedAt field on save
agreementSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

export const Agreement = mongoose.model<AgreementDoc>('Agreement', agreementSchema);

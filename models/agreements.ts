import mongoose, { Schema, Document } from 'mongoose';

export interface AgreementDoc extends Document {
  contractID: string;
  terms: string;
  createdBy: string;
  status: string;
  signedBy?: string;
  vaultBalance?: number;
  newTerms?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AgreementSchema = new Schema({
  contractID: { type: String, required: true },
  terms: { type: String, required: true },
  createdBy: { type: String, required: true },
  status: { type: String, required: true },
  signedBy: { type: String },
  vaultBalance: { type: Number, default: 0 },
  newTerms: { type: String }
},{ timestamps: true });

export const Agreement = mongoose.model<AgreementDoc>('Agreement', AgreementSchema);

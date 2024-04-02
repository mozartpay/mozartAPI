import mongoose from 'mongoose';

export interface PurchaseItem {
  id: string;
  operation_id: string;
  description: string;
  amount: string;
  quantity: number;
}

export interface PurchaseDocument extends mongoose.Document {
  id: string;
  partner_id: string;
  status: string;
  amount: string;
  description: string;
  confirmation_uri: string;
  cancel_uri: string;
  code: string;
  airtm_operation_id: string | null;
  created_at: Date;
  updated_at: Date;
  airtm_user_id: string | null;
  airtm_user_email: string | null;
  operation_type: string;
  failure_uri: string | null;
  failure_reason: string | null;
  callback_uri: string;
  airtm_operation_hash: string | null;
  items: PurchaseItem[];
}

const purchaseSchema = new mongoose.Schema<PurchaseDocument>({
  id: { type: String, required: true, unique: true },
  partner_id: { type: String },
  status: { type: String, required: true },
  amount: { type: String, required: true },
  description: { type: String, required: true },
  confirmation_uri: { type: String },
  cancel_uri: { type: String },
  code: { type: String, required: true },
  airtm_operation_id: { type: String },
  created_at: { type: Date },
  updated_at: { type: Date },
  airtm_user_id: { type: String },
  airtm_user_email: { type: String },
  operation_type: { type: String, required: true },
  failure_uri: { type: String },
  failure_reason: { type: String },
  callback_uri: { type: String },
  airtm_operation_hash: { type: String },
  items: [
    {
      id: { type: String, required: true },
      operation_id: { type: String, required: true },
      description: { type: String, required: true },
      amount: { type: String, required: true },
      quantity: { type: Number, required: true },
    },
  ],
});

export const PurchaseModel = mongoose.model<PurchaseDocument>('Purchase', purchaseSchema);

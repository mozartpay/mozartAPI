import mongoose, { Document, Schema } from 'mongoose';


const identitySchema = new mongoose.Schema({
  email: String,
  documentType: String,
  document: Buffer,
});

const IdentityModel = mongoose.model('Identity', identitySchema);

export default IdentityModel;
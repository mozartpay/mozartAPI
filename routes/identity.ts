import express, { Request, Response } from 'express';
import multer from 'multer';
import IdentityModel from '../models/identity';
const router = express.Router();

// Configure Multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage });

// API endpoint to handle identity verification
router.post('/', upload.single('document'), async (req: Request, res: Response) => {
    const { email, documentType } = req.body;
    const document = req.file ? req.file.buffer : null; // Handle the case when no file is uploaded
  
    try {
      if (!document) {
        return res.status(400).json({ error: 'No document uploaded.' });
      }
  
      // Save identity information to MongoDB
      const identity = new IdentityModel({ email, documentType, document });
      await identity.save();
  
      res.status(200).json({ message: 'Identity Verification Request Has been sent !' });
    } catch (error) {
      console.error('Error saving identity:', error);
      res.status(500).json({ error: 'An error occurred while saving identity.' });
    }
  });
  
  export default router;
import express, { Request, Response } from 'express';
import IdentityModel from '../models/identity';
const router = express.Router();



// API endpoint to handle identity verification
router.post('/', async (req: Request, res: Response) => {
  res.header("Access-Control-Allow-Origin", '*');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
  res.header("Access-Control-Allow-Headers", 'Origin,X-Requested-With,Content-Type,Accept,content-type,application/json');
  res.header('Content-Type', 'application/json');

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
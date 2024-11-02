import express, { Request, Response } from 'express';
import { parseStringPromise } from 'xml2js';
import { Agreement } from '../models/agreements';
import { z } from 'zod';

const router = express.Router();

const inputSchema = z.object({
  xmlData: z.string().optional(),
  contractId: z.string().optional(),
  xdr: z.string().optional(),
  jsonData: z.object({}).passthrough().optional(),
}).refine(data => 
  data.xmlData || data.contractId || data.xdr || data.jsonData, 
  { message: "At least one input type is required" }
);

const validateXML = async (input: any): Promise<any> => {
  try {
    if (typeof input === 'string') {
      return await parseStringPromise(input);
    } else if (typeof input === 'object') {
      return input;
    }
    return null;
  } catch (error) {
    throw new Error('Invalid input format');
  }
};

router.post('/get-agreement', async (req: Request, res: Response) => {
  try {
    const validatedInput = inputSchema.parse(req.body);
    const result = await validateXML(
      validatedInput.xmlData || 
      validatedInput.jsonData || 
      validatedInput.contractId || 
      validatedInput.xdr
    );
    
    const contractID = result?.Document?.Agreement?.[0]?.ContractID?.[0];
    if (!contractID) {
      return res.status(400).json({ error: 'Contract ID not found in XML' });
    }

    const agreement = await Agreement.findOne({ contractID });
    if (!agreement) {
      return res.status(404).json({ error: 'Agreement not found' });
    }

    return res.status(200).json({ agreement });
  } catch (error: any) {
    console.error('Error fetching agreement:', error.message);
    return res.status(500).json({ error: 'Failed to fetch agreement' });
  }
});

router.post('/sign-agreement', async (req: Request, res: Response) => {
  try {
    const validatedInput = inputSchema.parse(req.body);
    const result = await validateXML(
      validatedInput.xmlData || 
      validatedInput.jsonData || 
      validatedInput.contractId || 
      validatedInput.xdr
    );
    
    const contractID = result?.Document?.Agreement?.[0]?.ContractID?.[0];
    const userID = result?.Document?.Agreement?.[0]?.UserID?.[0];
    if (!contractID || !userID) {
      return res.status(400).json({ error: 'Required fields not found in input' });
    }

    const agreement = await Agreement.findOne({ contractID });
    if (!agreement) {
      return res.status(404).json({ error: 'Agreement not found' });
    }

    agreement.status = 'Signed';
    agreement.signedBy = userID;
    await agreement.save();

    return res.status(200).json({ 
      message: 'Agreement signed successfully', 
      agreement 
    });
  } catch (error: any) {
    console.error('Error signing agreement:', error.message);
    return res.status(500).json({ error: 'Failed to sign agreement' });
  }
});

router.post('/update-agreement', async (req: Request, res: Response) => {
  try {
    const validatedInput = inputSchema.parse(req.body);
    const result = await validateXML(
      validatedInput.xmlData || 
      validatedInput.jsonData || 
      validatedInput.contractId || 
      validatedInput.xdr
    );

    const contractID = result?.Document?.Agreement?.[0]?.ContractID?.[0];
    const newTerms = result?.Document?.Agreement?.[0]?.NewTerms?.[0];
    if (!contractID || !newTerms) {
      return res.status(400).json({ error: 'Required fields not found in input' });
    }

    const agreement = await Agreement.findOne({ contractID });
    if (!agreement) {
      return res.status(404).json({ error: 'Agreement not found' });
    }

    agreement.status = 'Updated';
    agreement.newTerms = newTerms;
    await agreement.save();

    return res.status(200).json({ 
      message: 'Agreement updated successfully', 
      agreement 
    });
  } catch (error: any) {
    console.error('Error updating agreement:', error.message);
    return res.status(500).json({ error: 'Failed to update agreement' });
  }
});

router.post('/cancel-agreement', async (req: Request, res: Response) => {
  try {
    const validatedInput = inputSchema.parse(req.body);
    const result = await validateXML(
      validatedInput.xmlData || 
      validatedInput.jsonData || 
      validatedInput.contractId || 
      validatedInput.xdr
    );

    const contractID = result?.Document?.Agreement?.[0]?.ContractID?.[0];
    if (!contractID) {
      return res.status(400).json({ error: 'Contract ID not found in input' });
    }

    const agreement = await Agreement.findOne({ contractID });
    if (!agreement) {
      return res.status(404).json({ error: 'Agreement not found' });
    }

    agreement.status = 'Canceled';
    await agreement.save();

    return res.status(200).json({ 
      message: 'Agreement canceled successfully', 
      agreement 
    });
  } catch (error: any) {
    console.error('Error canceling agreement:', error.message);
    return res.status(500).json({ error: 'Failed to cancel agreement' });
  }
});

router.post('/create-agreement', async (req: Request, res: Response) => {
  try {
    const validatedInput = inputSchema.parse(req.body);
    const result = await validateXML(
      validatedInput.xmlData || 
      validatedInput.jsonData || 
      validatedInput.contractId || 
      validatedInput.xdr
    );
    
    const contractID = result?.Document?.Agreement?.[0]?.ContractID?.[0];
    const terms = result?.Document?.Agreement?.[0]?.Terms?.[0];
    const createdBy = result?.Document?.Agreement?.[0]?.CreatedBy?.[0];
    
    if (!contractID || !terms || !createdBy) {
      return res.status(400).json({ error: 'Required fields not found in input' });
    }

    const newAgreement = new Agreement({
      contractID,
      terms,
      createdBy,
      status: 'Created'
    });

    await newAgreement.save();

    return res.status(201).json({ 
      message: 'Agreement created successfully', 
      agreement: newAgreement 
    });
  } catch (error: any) {
    console.error('Error creating agreement:', error.message);
    return res.status(500).json({ error: 'Failed to create agreement' });
  }
});

export default router;

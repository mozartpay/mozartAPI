import express, { Request, Response } from 'express';
import { parseStringPromise } from 'xml2js';
import { Agreement } from '../models/agreements';
import { z } from 'zod';
import StellarSdk from '@stellar/stellar-sdk';
import { getServer } from './soroban';

const router = express.Router();

const inputSchema = z.object({
  xmlData: z.string().optional(),
  contractId: z.string().optional(),
  xdr: z.string().optional(),
  jsonData: z.object({}).passthrough().optional(),
  network: z.enum(['testnet', 'mainnet']).default('mainnet'),
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
    
    const contractId = result?.Document?.Agreement?.[0]?.ContractID?.[0] || validatedInput.contractId;
    if (!contractId) {
      return res.status(400).json({ error: 'Contract ID not found' });
    }

    // First try to get from blockchain
    try {
      const server = getServer(validatedInput.network);
      const contract = new StellarSdk.SorobanRpc(server).getContract(contractId);
      const metadata = await contract.getMetadata();
      if (metadata) {
        return res.status(200).json({ agreement: metadata });
      }
    } catch (error) {
      console.log('Contract not found on blockchain, checking database...');
    }

    // Fallback to database
    const agreement = await Agreement.findOne({ contractId });
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
    
    const contractId = result?.Document?.Agreement?.[0]?.ContractID?.[0] || validatedInput.contractId;
    if (!contractId) {
      return res.status(400).json({ error: 'Contract ID not found' });
    }

    // Try to sign on blockchain first
    try {
      const server = getServer(validatedInput.network);
      const contract = new StellarSdk.SorobanRpc(server).getContract(contractId);
      const response = await contract.call('sign', []);
      return res.status(200).json({ 
        message: 'Agreement signed on blockchain',
        txHash: response.hash
      });
    } catch (error) {
      console.error('Failed to sign on blockchain:', error);
      return res.status(500).json({ error: 'Failed to sign agreement on blockchain' });
    }
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

    const contractId = result?.Document?.Agreement?.[0]?.ContractID?.[0] || validatedInput.contractId;
    const newTerms = result?.Document?.Agreement?.[0]?.NewTerms?.[0];
    if (!contractId || !newTerms) {
      return res.status(400).json({ error: 'Required fields not found in input' });
    }

    const agreement = await Agreement.findOne({ contractId });
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

    const contractId = result?.Document?.Agreement?.[0]?.ContractID?.[0] || validatedInput.contractId;
    const accountAddress = result?.Document?.Agreement?.[0]?.AccountAddress?.[0];

    if (!contractId || !accountAddress) {
      return res.status(400).json({ error: 'Required fields not found in input' });
    }

    const agreement = await Agreement.findOne({ contractId });
    if (!agreement) {
      return res.status(404).json({ error: 'Agreement not found' });
    }

    agreement.status = 'Canceled';
    agreement.vaultBalance = 0;
    await agreement.save();

    return res.status(200).json({ 
      message: 'Agreement canceled and funds withdrawn successfully', 
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
    
    const contractId = result?.Document?.Agreement?.[0]?.ContractID?.[0] || validatedInput.contractId;
    const terms = result?.Document?.Agreement?.[0]?.Terms?.[0];
    const createdBy = result?.Document?.Agreement?.[0]?.CreatedBy?.[0];
    
    if (!contractId || !terms || !createdBy) {
      return res.status(400).json({ error: 'Required fields not found in input' });
    }

    const newAgreement = new Agreement({
      contractId,
      terms,
      createdBy,
      status: 'Created',
      vaultBalance: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await newAgreement.save();
    console.log(newAgreement);

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

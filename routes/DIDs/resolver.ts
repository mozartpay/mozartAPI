// import express, { Request, Response } from 'express';
// import { DIDResolver } from 'did-resolver';
// import { getResolver } from 'web-did-resolver';

// const router = express.Router();

// // Create a DID Resolver with the did:web method
// const resolver = new DIDResolver({
//   ...getResolver()
// });

// // Route to resolve the DID and return the DID Document
// router.get('/resolve-did', async (req: Request, res: Response) => {
//   try {
//     const did = 'did:web:mozartpay.com';  // Replace with the actual DID if needed
//     const didDocument = await resolver.resolve(did);
    
//     res.json({
//       success: true,
//       didDocument
//     });
//   } catch (error: unknown) {
//     res.status(500).json({
//       success: false,
//       message: 'Error resolving DID',
//       error: error instanceof Error ? error.message : 'Unknown error'
//     });
//   }
// });

// // Route for verifying signatures
// router.post('/verify-signature', async (req: Request, res: Response) => {
//   // Example of receiving signed transaction data
//   const { transaction, signature, publicKey } = req.body;

//   // You can implement a signature verification logic here
//   // Check if the public key matches the one in the DID document
//   const did = 'did:web:mozartpay.com';
//   const didDocument = await resolver.resolve(did);
  
//   const verificationMethod = didDocument.didDocument.verificationMethod.find(
//     (method: any) => method.publicKeyMultibase === publicKey
//   );

//   if (verificationMethod) {
//     // Proceed with verifying the signature
//     // Implement blockchain logic for payment processing here

//     res.json({
//       success: true,
//       message: 'Signature verified, payment processed'
//     });
//   } else {
//     res.status(400).json({
//       success: false,
//       message: 'Public key does not match the DID document'
//     });
//   }
// });

// export default router;

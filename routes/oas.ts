// import express, { Request, Response } from 'express';
// import fs from 'fs';
// import path from 'path';
// import multer from 'multer';
// import { parseStringPromise } from 'xml2js';
// import { User } from '../models/user'; // Assuming User model is used for signing actions

// const router = express.Router();

// // Set up file upload middleware using multer
// const upload = multer({ dest: 'uploads/' });

// // Define the path to your ISO 20022 XSD file for validation (optional, if needed later)
// const iso20022XsdPath = path.join(__dirname, '../schemas/iso20022.xsd');

// // Utility function to validate XML (optional for future use)
// const validateXML = async (xmlData: string): Promise<boolean> => {
//   // You may add validation logic here if needed, e.g., using a separate validation package
//   // This is left empty for now as xml2js itself doesn't provide XSD validation
//   return true;
// };

// // Fetch Agreement Route
// router.post('/get-agreement', upload.single('file'), async (req: Request, res: Response) => {
//   try {
//     const xmlFile = req.file?.path;
//     if (!xmlFile) {
//       return res.status(400).json({ error: 'No XML file uploaded' });
//     }

//     // Read XML data from the file
//     const xmlData = fs.readFileSync(xmlFile, 'utf-8');

//     // Optionally validate the XML
//     await validateXML(xmlData);

//     // Parse the XML data
//     const result = await parseStringPromise(xmlData);
    
//     // Example: Extract the contract ID from the parsed XML (adjust based on your schema)
//     const contractID = result?.Document?.Agreement?.[0]?.ContractID?.[0];
//     if (!contractID) {
//       return res.status(400).json({ error: 'Contract ID not found in XML' });
//     }

//     // Fetch agreement details from the database (mocking this part)
//     const agreement = { contractID, details: 'Agreement details' };

//     return res.status(200).json({ agreement });
//   } catch (error) {
//     console.error('Error fetching agreement:', error.message);
//     return res.status(500).json({ error: 'Failed to fetch agreement' });
//   } finally {
//     if (req.file) {
//       fs.unlinkSync(req.file.path); // Clean up uploaded file
//     }
//   }
// });

// // Sign Agreement Route
// router.post('/sign-agreement', upload.single('file'), async (req: Request, res: Response) => {
//   try {
//     const xmlFile = req.file?.path;
//     if (!xmlFile) {
//       return res.status(400).json({ error: 'No XML file uploaded' });
//     }

//     // Read XML data from the file
//     const xmlData = fs.readFileSync(xmlFile, 'utf-8');

//     // Optionally validate the XML
//     await validateXML(xmlData);

//     // Parse the XML data
//     const result = await parseStringPromise(xmlData);
    
//     // Example: Extract the contract ID and user ID from the XML
//     const contractID = result?.Document?.Agreement?.[0]?.ContractID?.[0];
//     const userID = result?.Document?.Agreement?.[0]?.UserID?.[0];
//     if (!contractID || !userID) {
//       return res.status(400).json({ error: 'Required fields not found in XML' });
//     }

//     // Find the user and "sign" the agreement (mocking this part)
//     User.findById(userID, (err, user) => {
//       if (err || !user) {
//         return res.status(404).json({ error: 'User not found' });
//       }

//       // Mock signing process
//       const signedAgreement = { contractID, signedBy: user.name, status: 'Signed' };

//       return res.status(200).json({ message: 'Agreement signed successfully', signedAgreement });
//     });
//   } catch (error) {
//     console.error('Error signing agreement:', error.message);
//     return res.status(500).json({ error: 'Failed to sign agreement' });
//   } finally {
//     if (req.file) {
//       fs.unlinkSync(req.file.path); // Clean up uploaded file
//     }
//   }
// });

// // Update Agreement Route
// router.post('/update-agreement', upload.single('file'), async (req: Request, res: Response) => {
//   try {
//     const xmlFile = req.file?.path;
//     if (!xmlFile) {
//       return res.status(400).json({ error: 'No XML file uploaded' });
//     }

//     // Read XML data from the file
//     const xmlData = fs.readFileSync(xmlFile, 'utf-8');

//     // Optionally validate the XML
//     await validateXML(xmlData);

//     // Parse the XML data
//     const result = await parseStringPromise(xmlData);

//     // Example: Extract the contract ID and new terms from the XML
//     const contractID = result?.Document?.Agreement?.[0]?.ContractID?.[0];
//     const newTerms = result?.Document?.Agreement?.[0]?.NewTerms?.[0];
//     if (!contractID || !newTerms) {
//       return res.status(400).json({ error: 'Required fields not found in XML' });
//     }

//     // Mock updating process (this would normally involve saving to the database)
//     const updatedAgreement = { contractID, newTerms };

//     return res.status(200).json({ message: 'Agreement updated successfully', updatedAgreement });
//   } catch (error) {
//     console.error('Error updating agreement:', error.message);
//     return res.status(500).json({ error: 'Failed to update agreement' });
//   } finally {
//     if (req.file) {
//       fs.unlinkSync(req.file.path); // Clean up uploaded file
//     }
//   }
// });

// // Cancel Agreement Route
// router.post('/cancel-agreement', upload.single('file'), async (req: Request, res: Response) => {
//   try {
//     const xmlFile = req.file?.path;
//     if (!xmlFile) {
//       return res.status(400).json({ error: 'No XML file uploaded' });
//     }

//     // Read XML data from the file
//     const xmlData = fs.readFileSync(xmlFile, 'utf-8');

//     // Optionally validate the XML
//     await validateXML(xmlData);

//     // Parse the XML data
//     const result = await parseStringPromise(xmlData);

//     // Example: Extract the contract ID from the XML
//     const contractID = result?.Document?.Agreement?.[0]?.ContractID?.[0];
//     if (!contractID) {
//       return res.status(400).json({ error: 'Contract ID not found in XML' });
//     }

//     // Mock canceling process (this would normally involve updating the database)
//     const canceledAgreement = { contractID, status: 'Canceled' };

//     return res.status(200).json({ message: 'Agreement canceled successfully', canceledAgreement });
//   } catch (error) {
//     console.error('Error canceling agreement:', error.message);
//     return res.status(500).json({ error: 'Failed to cancel agreement' });
//   } finally {
//     if (req.file) {
//       fs.unlinkSync(req.file.path); // Clean up uploaded file
//     }
//   }
// });

// export default router;

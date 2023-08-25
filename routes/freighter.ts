import { Router, Request, Response } from "express";
import {
  isConnected,
  isAllowed,
  setAllowed,
  getUserInfo,
  signTransaction,
  getNetwork,
} from "@stellar/freighter-api";
import StellarSdk from "stellar-sdk"; 

const router = Router();

router.post('/', async (req: Request, res: Response) => {
  try {
    res.header("Access-Control-Allow-Origin", '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
    res.header("Access-Control-Allow-Headers", 'Origin,X-Requested-With,Content-Type,Accept,content-type,application/json');
    res.header('Content-Type', 'application/json');
  
    // Get email and amount from the frontend request body
    const { email, amount } = req.body;

    if (!email || !amount) {
      return res.status(400).json({ error: "Email and amount are required." });
    }

    // Set up Stellar SDK
    const server = new StellarSdk.Server("https://horizon-testnet.stellar.org");
    const sourceKeys = StellarSdk.Keypair.fromSecret("SCZANGBA5YHTNYVVV4C3U252E2B6P6F5T3U6MM63WBSBZATAQI3EBTQ4");
    const destinationId = "GA2C5RFPE6GCKMY3US5PAB6UZLKIGSPIUKSLRB6Q723BM2OARMDUYEJ5";

    // Build the transaction
    let transaction;
    try {
      const destinationAccount = await server.loadAccount(destinationId);
      const sourceAccount = await server.loadAccount(sourceKeys.publicKey());

      transaction = new StellarSdk.TransactionBuilder(sourceAccount, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: StellarSdk.Networks.TESTNET,
      })
        .addOperation(
          StellarSdk.Operation.payment({
            destination: destinationId,
            asset: StellarSdk.Asset.native(),
            amount: amount, // Use the amount from the frontend
          }),
        )
        .addMemo(StellarSdk.Memo.text("Test Transaction"))
        .setTimeout(180)
        .build();
    } catch (error) {
      console.error("Error building transaction:", error);
      return res.status(500).json({ error: "An error occurred while building the transaction." });
    }

    if (await isConnected()) {
      // Handle your app authorization logic
      if (!(await isAllowed())) {
        await setAllowed();
      }

      // Get user information (public key)
      const userInfo = await getUserInfo();
      const { publicKey } = userInfo;

      // Get network information
      const network = await getNetwork();

      // Convert transaction to XDR string
      const transactionXDR = transaction.toXDR("base64");

      // Use the transactionXDR with the Freighter API
      const signedTransaction = await signTransaction(transactionXDR, {
        network,
        accountToSign: publicKey,
      });

      // Respond with the signed transaction or other data
      res.status(200).json({ signedTransaction });
    } else {
      res.status(400).json({ error: "Freighter is not installed." });
    }
  } catch (error) {
    console.error("Error handling payment:", error);
    res.status(500).json({ error: "An error occurred." });
  }
});

export default router;

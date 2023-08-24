import express, { Express, Request, Response } from "express";
const CC = require('currency-converter-lt');
const router = express.Router();
const app = express();
app.use(express.json());

const currencyConverter = new CC();
router.post('/', async (req: Request, res: Response) => {
  res.header("Access-Control-Allow-Origin", '*');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
  res.header("Access-Control-Allow-Headers", 'Origin,X-Requested-With,Content-Type,Accept,content-type,application/json');
  res.header('Content-Type', 'application/json');

  const { amount, targetCurrency } = req.body;

  try {
   
      const response = await currencyConverter.from('USD').to(targetCurrency).amount(1).convert();
      const convertedAmount = parseFloat((response * amount / 100).toFixed(5));

      res.json({ convertedAmount });
    
  } catch (error) {
    console.error('Error converting:', error);
    res.status(500).json({ error: 'An error occurred during conversion.' });
  }
});


export default router;
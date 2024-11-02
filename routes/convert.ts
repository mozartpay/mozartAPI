import express, { Request, Response } from 'express';
const CC = require('currency-converter-lt');
const router = express.Router();

const app = express();
app.use(express.json());

router.post('/', async (req: Request, res: Response) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
  res.header(
    'Access-Control-Allow-Headers',
    'Origin,X-Requested-With,Content-Type,Accept,content-type,application/json'
  );
  res.header('Content-Type', 'application/json');

  const { amount, sourceCurrency, targetCurrency } = req.body;

  try {
    // Initialize a new currency converter instance with the source and target currencies
    let currencyConverter = new CC({
      from: sourceCurrency,
      to: targetCurrency,
      amount: amount,
    });

    // Perform the conversion
    let convertedAmount = await currencyConverter.convert();

    // Log the conversion rate for debugging
    console.log(`Converted ${amount} ${sourceCurrency} to ${convertedAmount} ${targetCurrency}`);

    // Apply adjustment based on currency pairs
    if (sourceCurrency === 'COP' && (targetCurrency === 'USD' || targetCurrency === 'EUR')) {
      // Apply specific adjustment for COP to USD/EUR conversion
      convertedAmount = convertedAmount * 0.00001;
    } else if ((sourceCurrency === 'USD' || sourceCurrency === 'EUR') && targetCurrency === 'COP') {
      // Apply specific adjustment for USD/EUR to COP conversion
      convertedAmount = convertedAmount * 1000;
    } else if (sourceCurrency === 'EUR' && targetCurrency === 'USD') {
      // Apply specific adjustment for EUR to USD conversion
      convertedAmount = convertedAmount * 0.01;
    } else if (sourceCurrency === 'USD' && targetCurrency === 'EUR') {
      // Apply specific adjustment for USD to EUR conversion
      convertedAmount = convertedAmount * 0.01;
    }

    // Return the converted amount, ensuring the number is properly formatted
    res.json({ convertedAmount: parseFloat(convertedAmount.toFixed(5)) });
  } catch (error) {
    console.error('Error converting:', error);
    res.status(500).json({ error: 'An error occurred during conversion.' });
  }
});

export default router;
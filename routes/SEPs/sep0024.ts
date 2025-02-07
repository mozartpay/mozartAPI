import { Router, Request, Response, NextFunction } from 'express';
import { body, query, validationResult, CustomValidator } from 'express-validator';
import jwt from 'jsonwebtoken';

declare global {
  namespace Express {
    interface Request {
      anchorUser?: any;  // Or define a more specific type based on your decoded JWT
    }
  }
}

const router = Router();

// Add after imports, before router definition
const isStellarAddress: CustomValidator = (value) => {
  return typeof value === 'string' && value.startsWith('G') && value.length === 56;
};

// SEP-24 Authentication Middleware
const sep24Auth = (req: Request, res: Response, next: NextFunction) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ 
      error: 'authentication_required',
      message: 'Authentication token required' 
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.STELLAR_SECRET!);
    req.anchorUser = decoded;
    next();
  } catch (err) {
    return res.status(401).json({
      error: 'invalid_token',
      message: 'Invalid authentication token'
    });
  }
};

// SEP-24 Standard Endpoints
router.get('/deposit', [
  query('asset_code').exists().isString(),
  query('account').exists().custom(isStellarAddress).withMessage('Invalid Stellar address'),
], sep24Auth, (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      error: 'invalid_request',
      message: errors.array()[0].msg 
    });
  }

  // Check if asset is supported
  const supportedAssets = ['USDC', 'XLM'];
  if (!supportedAssets.includes(req.query.asset_code as string)) {
    return res.status(400).json({
      error: 'unsupported_asset',
      message: 'The specified asset is not supported'
    });
  }

  // Return deposit information
  res.json({
    how: 'https://your-anchor.com/deposit-instructions',
    extra_info: {
      message: 'Complete KYC verification to proceed',
      fields: ['email', 'phone_number']
    },
    min_amount: 10,
    max_amount: 10000,
    status: 'requires_kyc'
  });
});

router.get('/withdraw', [
  query('asset_code').exists().isString(),
  query('account').exists().custom(isStellarAddress).withMessage('Invalid Stellar address'),
], sep24Auth, (req: Request, res: Response) => {
  // Similar validation and logic as deposit
});

router.get('/transactions', [
  query('asset_code').exists().isString(),
], sep24Auth, (req: Request, res: Response) => {
  // Return transaction history
});

router.get('/transaction/:id', sep24Auth, (req: Request, res: Response) => {
  // Return specific transaction details
});

// SEP-24 Error Handler
router.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('SEP24 Error:', err);
  res.status(500).json({
    error: 'internal_server_error',
    message: 'Something went wrong'
  });
});

export default router;

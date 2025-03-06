import express, { Express, NextFunction, Request, Response } from "express";
import cors from 'cors';
import oas from './routes/oas';
import runSepOne from './routes/SEPs/sep0001';
import Federation from "./routes/SEPs/sep0002";
import bodyParser from 'body-parser';
import withdraw from './routes/withdraw';
import signinRouter from './routes/signin';
import signupRouter from './routes/signup';
import order from './routes/order';
import profile from './routes/profile';
import subscriptionRoutes from './routes/subscription';
import Money from './routes/convert';
import SendMoney from './routes/sendMoney';
import MoneyRequest from './routes/requestMoney';
import Identity from './routes/identity';
import trustlineRouter from './routes/trustline';
import Balance from "./routes/balance";
import Xlm from "./routes/xlm";
import Notification from "./routes/notification";
import swap from './routes/swap';
import helmet from 'helmet';
import connectToDB from './db';
import sinkCarbon from './routes/sinkCarbon';
import oracle from './routes/oracle';
import sorobanRouter from './routes/soroban';
import cookieParser from 'cookie-parser';
import cookieRoutes from './routes/cookies';
import fireblocksRouter from './routes/fireblocks';

require('dotenv').config({ path: '.env.production'});

// Debug environment variables
console.log('Environment:', process.env.NODE_ENV);
console.log('MessageBird Key exists:', !!process.env.MESSAGEBIRD_API_KEY);
console.log('MessageBird Key length:', process.env.MESSAGEBIRD_API_KEY?.length || 0);

const port = process.env.PORT || '8000';
const app: Express = express();

app.use(helmet());

const allowedOrigins = ['https://mozartpay.com', 'https://www.mozartpay.com', 'http://localhost:3000', 'https://mozart-api-21ea5fd801a8.herokuapp.com', 'http://localhost:5173', 'https://mozart-api-21ea5fd801a8.herokuapp.com/api', 'http://localhost:8000'];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['set-cookie'],
  optionsSuccessStatus: 200
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Configure cookie settings
app.use((req: Request, res: Response, next: NextFunction) => {
  res.cookie('cookieName', 'cookieValue', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    path: '/',
    domain: process.env.NODE_ENV === 'production' ? '.mozartpay.com' : 'localhost'
  });
  next();
});

const enforceHTTPS = (req: Request, res: Response, next: NextFunction ) => {
  if (req.headers['x-forwarded-proto'] !== 'https') {
    return res.redirect(`https://${req.hostname}${req.url}`);
  }
  next();
};
// Then use the environment check
if (process.env.NODE_ENV === 'development') {
  app.use(enforceHTTPS);
  console.log("Running enforceHTTPS");
} else {
  console.log("Not Running enforceHTTPS - Development Mode");
};  

connectToDB();

runSepOne();

// Default route
app.get("/", (req: Request, res: Response) => {
  res.send("Hello, Mozart Typescript Node.js server!");
});

// Define API routes
app.use('/api/oas', oas);
app.use('/api/withdraw', withdraw);
app.use('/api', order);
app.use('/api/profile', profile);
app.use('/api', subscriptionRoutes);
app.use('/api', Money);
app.use('/api', SendMoney);
app.use('/api', MoneyRequest);
app.use('/api', Identity);
app.use('/api/stellar/trustline', trustlineRouter);
app.use('/api/user/balance', Balance);
app.use('/api/xlm', Xlm);
app.use('/api', Notification);
app.use('/api', swap);
app.use('/api', fireblocksRouter);
app.use('/api', sorobanRouter);
app.use('/api/carbon', sinkCarbon);
app.use('/api', oracle);
app.use('/api', cookieRoutes);
app.use('/api/signup', signupRouter);
app.use('/api/signin', signinRouter);

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

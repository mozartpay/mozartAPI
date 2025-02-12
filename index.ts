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
import Trustline from './routes/trustline';
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
        methods: 'GET,POST,PUT,DELETE,OPTIONS',
        allowedHeaders: 'Origin,X-Requested-With,Content-Type,Accept,Authorization',
        optionsSuccessStatus: 200,
        exposedHeaders: ['set-cookie']
}));

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

// Middleware for parsing JSON requests
app.use(express.json());
app.use(bodyParser.json({ limit: '30mb' }));
app.use(cookieParser());
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
app.use('/api/withdraw', withdraw);
app.use('/api/signin', signinRouter);
app.use('/api/signup', signupRouter);
app.use('/api/profile', profile);
app.use('/api/v1', order);
app.use('/api/subscribe', subscriptionRoutes);
app.use('/api/convert', Money);
app.use('/api/send', SendMoney);
app.use('/api/request', MoneyRequest);
app.use('/api/identity', Identity);
app.use('/api/trustline', Trustline);
app.use('/api/balance', Balance);
app.use('/api/xlm', Xlm);
app.use('/api/federation', Federation);
app.use('/api/notifications', Notification);
app.use('/api/swap', swap);
app.use('/api/soroban', sorobanRouter);
app.use('/api/oas', oas);
app.use('/api/carbon', sinkCarbon);
app.use('/api/oracle', oracle);
app.use('/api/cookies', cookieRoutes);

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

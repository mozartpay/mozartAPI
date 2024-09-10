import express, { Express, Request, Response } from "express";
import connectToDB from './db';
import withdraw from './routes/withdraw';
import signinRouter from './routes/signin';
import signupRouter from './routes/signup';
import order from './routes/order';
import profile from './routes/profile';
import cors from 'cors';
import bodyParser from 'body-parser';
import subscriptionRoutes from './routes/subscription';
import Money from './routes/convert';
import Transaction from './routes/transaction';
import MoneyRequest from './routes/requestMoney';
import Identity from './routes/identity';
import Trustline from './routes/trustline';
import Balance from "./routes/balance";
import Xlm from "./routes/xlm";

require('dotenv').config();

const port = process.env.PORT || '8000'
const app: Express = express();

// Add both allowed origins
const allowedOrigins = ['https://www.mozartpay.com', 'http://localhost:3000'];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin, like mobile apps or curl requests
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: 'GET,POST,PUT,DELETE,OPTIONS',
  allowedHeaders: 'Origin,X-Requested-With,Content-Type,Accept,Authorization',
  credentials: true,  // Allow credentials such as cookies or auth tokens
  optionsSuccessStatus: 200,  // To prevent OPTIONS request failing for older browsers
}));

app.use(express.json());
app.use(bodyParser.json({ limit: '30mb' }));

connectToDB();

app.options('*', (req: Request, res: Response) => {
  // Handle preflight requests
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin,X-Requested-With,Content-Type,Accept,Authorization');
  res.sendStatus(200);  // Respond OK to preflight
});

app.get("/", (req: Request, res: Response) => {
  res.send("Hello, Mozart Typescript Node.js server!");
});

app.use('/api/withdraw', withdraw);
app.use('/api/signin', signinRouter);
app.use('/api/signup', signupRouter);
app.use('/api/profile', profile);
app.use('/api/v1', order);
app.use('/api/subscribe', subscriptionRoutes);
app.use('/api/convert', Money);
app.use('/api/transaction', Transaction);
app.use('/api/request', MoneyRequest);
app.use('/api/identity', Identity);
app.use('/api/trustline', Trustline);
app.use('/api/balance', Balance);
app.use('/api/xlm', Xlm);

app.get("/hi", (req: Request, res: Response) => {
  res.send("Hello!!");
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

import express, { Express, Request, Response } from "express";
import connectToDB from './db';
import cors from 'cors';
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
import path from 'path';



require('dotenv').config();

const port = process.env.PORT || '8000';
const app: Express = express();


// Define allowed origins for development and production
const allowedOrigins = ['https://www.mozartpay.com', 'http://localhost:3000','https://mozart-api-21ea5fd801a8.herokuapp.com'];

// CORS Middleware
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests) and allowed origins
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,  // Allow credentials (cookies, authorization headers)
  methods: 'GET,POST,PUT,DELETE,OPTIONS',
  allowedHeaders: 'Origin,X-Requested-With,Content-Type,Accept,Authorization',
  optionsSuccessStatus: 200  // For legacy browser support
}));

// Middleware for parsing JSON requests
app.use(express.json());
app.use(bodyParser.json({ limit: '30mb' }));

// Connect to database
connectToDB();

app.get('/.well-known/stellar.toml', (req, res) => {
  res.sendFile(path.join(__dirname, './stellar.toml'));
});

// Default Route
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

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

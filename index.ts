import express, { Express, Request, Response } from "express";

import connectToDB from './db';
import corsMiddleware from './cors';
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


require('dotenv').config();

const port = process.env.PORT || '8000';
const app: Express = express();

corsMiddleware()

// Middleware for parsing JSON requests
app.use(express.json());
app.use(bodyParser.json({ limit: '30mb' }));

// Connect to database
connectToDB();

runSepOne()

// Default route
app.get("/", (res: Response) => {
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

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

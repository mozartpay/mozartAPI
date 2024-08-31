import express, { Express, Request, Response } from "express";
import connectToDB from './db';
// import airtmRouter from './routes/airtmPayment';
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
import Freighter from './routes/freighter';
import Balance from "./routes/balance";
import Xlm from "./routes/xlm";

require('dotenv').config();

const port = process.env.PORT || '8000'
const app: Express = express();

app.use(cors());
app.use(express.json());

app.use(bodyParser.json({ limit: '30mb' }));

connectToDB();
app.get("/", (req: Request, res: Response) => {
  res.send("Hello, Mozart Typescript Node.js server!");
});


// app.use('/api/airtm', airtmRouter);
app.use('/api/signin', signinRouter);
app.use('/api/signup', signupRouter);
app.use('/api/profile', profile);
app.use('/api/v1', order);
app.use('/api/subscribe', subscriptionRoutes);
app.use('/api/convert', Money);
app.use('/api/transaction', Transaction);
app.use('/api/request', MoneyRequest);
app.use('/api/identity', Identity);
app.use('/api/freighter', Freighter);
app.use('/api/balance', Balance);
app.use('/api/xlm', Xlm);

app.get("/hi", (req: Request, res: Response) => {
  res.send("Hello!!");
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});


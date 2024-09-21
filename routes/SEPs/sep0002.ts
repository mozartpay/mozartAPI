import express, { Express, Request, Response } from "express";

require('dotenv').config();

const app: Express = express();


interface User {
    stellar_address: string;
    account_id: string;
    memo_type?: string;
    memo?: string;
  }
  
  const users: { [key: string]: User } = {
    'bob': {
      stellar_address: 'bob*mozartpay.com',
      account_id: 'Gxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    },
    'alice': {
      stellar_address: 'alice*mozartpay.com',
      account_id: 'Gyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy',
    }
  };
  
  // Federation endpoint
  app.get('/', (req, res) => {
    console.log("federate server running")
    const { q, type } = req.query;
  
    if (!q || !type) {
      return res.status(400).json({ error: 'Missing query parameters' });
    }
  
    const qValue = Array.isArray(q) ? q[0] : q;
    if (typeof qValue === 'string') {
      const [username, domain] = qValue.split('*');
  
      if (domain !== 'mozartpay.com' || !users[username]) {
        return res.status(404).json({ error: 'Stellar address not found' });
      }
      console.log("federate server running")
      return res.status(200).json(users[username]);
      
    } else {
      return res.status(400).json({ error: 'Invalid query parameter' });
    }
  });

  export default app;
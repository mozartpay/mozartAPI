import express, { Express, Request, Response } from "express";
import cors from 'cors';
const router = express.Router();

// Define allowed origins for development and production
const allowedOrigins = ['https://www.mozartpay.com', 'http://localhost:3000', 'https://mozart-api-21ea5fd801a8.herokuapp.com'];

async function runCorsMiddleware() {
  console.log("Cors running")
// CORS Middleware
router.use(cors({
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
  optionsSuccessStatus: 200
}));
}

export default runCorsMiddleware;
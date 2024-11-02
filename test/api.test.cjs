const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
// Import routes
const signupRouter = require('../routes/signup');
const signinRouter = require('../routes/signin');
const balanceRouter = require('../routes/balance');
const orderRouter = require('../routes/order');
const sendMoneyRouter = require('../routes/sendMoney');

dotenv.config({ path: 'config.env' });

const app = express();
app.use(express.json());

// Use routes
app.use('/signup', signupRouter);
app.use('/signin', signinRouter);
app.use('/balance', balanceRouter);
app.use('/order', orderRouter);
app.use('/sendMoney', sendMoneyRouter);

describe('API Tests', async () => {
  before(async () => {
    // Connect to a test database
    await mongoose.connect(process.env.MONGO_URI_TEST);
  });

  after(async () => {
    // Disconnect from the test database
    await mongoose.connection.close();
  });

  it('should sign up a new user', async () => {
    const res = await request(app)
      .post('/signup')
      .send({
        email: 'test@example.com',
        password: 'password123',
        fullname: 'Test User',
        number: '+1234567890'
      });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.message, 'Signup successful!');
  });

  it('should sign in an existing user', async () => {
    const res = await request(app)
      .post('/signin')
      .send({
        email: 'test@example.com',
        password: 'password123'
      });

    assert.strictEqual(res.status, 200);
    assert.ok(res.body.token);
  });

  it('should fetch user balance', async () => {
    // First, sign in to get the token
    const signinRes = await request(app)
      .post('/signin')
      .send({
        email: 'test@example.com',
        password: 'password123'
      });

    const token = signinRes.body.token;

    const res = await request(app)
      .get('/balance')
      .query({ email: 'test@example.com' })
      .set('Authorization', `Bearer ${token}`);

    assert.strictEqual(res.status, 200);
    assert.ok(res.body.balances);
  });

  it('should create a new order', async () => {
    // First, sign in to get the token
    const signinRes = await request(app)
      .post('/signin')
      .send({
        email: 'test@example.com',
        password: 'password123'
      });

    const token = signinRes.body.token;

    const res = await request(app)
      .post('/order')
      .send({
        buyerName: 'Test User',
        amount: '100',
        buyerEmail: 'test@example.com',
        method: 'credit_card',
        currency: 'USD',
        description: 'Test order'
      })
      .set('Authorization', `Bearer ${token}`);

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.message, 'Order created successfully');
  });

  it('should send money', async () => {
    // First, sign in to get the token
    const signinRes = await request(app)
      .post('/signin')
      .send({
        email: 'test@example.com',
        password: 'password123'
      });

    const token = signinRes.body.token;

    const res = await request(app)
      .post('/sendMoney')
      .send({
        country: 'US',
        amount: 50,
        receiverName: 'Receiver Test',
        receiverEmail: 'receiver@example.com',
        senderEmail: 'test@example.com'
      })
      .set('Authorization', `Bearer ${token}`);

    assert.strictEqual(res.status, 200);
    assert.ok(res.body.message.includes('Transaction successful'));
  });
});

const test = require('node:test');
const assert = require('node:assert');
const mongoose = require('mongoose');
const express = require('express');
const request = require('supertest');
require('dotenv').config({ path: './.env' });

// Import routes
const signupRouter = require('../dist/routes/signup').default || require('../dist/routes/signup').router;
const signinRouter = require('../dist/routes/signin').default || require('../dist/routes/signin').router;
const balanceRouter = require('../dist/routes/balance').default || require('../dist/routes/balance').router;
const orderRouter = require('../dist/routes/order').default || require('../dist/routes/order').router;
const sendMoneyRouter = require('../dist/routes/sendMoney').default || require('../dist/routes/sendMoney').router;

// Use describe for test suites
test.describe('API Tests', async () => {
    let app;
    let authToken; // Store the auth token for authenticated requests
    
    // Setup before all tests
    test.before(async () => {
        // Connect to MongoDB using the test URI from config
        await mongoose.connect(process.env.MONGO_URI_TEST || process.env.MONGO_URI, {
            maxPoolSize: process.env.POOL_SIZE || 5
        });
        
        // Setup Express app
        app = express();
        app.use(express.json());
        app.use('/signup', signupRouter);
        app.use('/signin', signinRouter);
        app.use('/balance', balanceRouter);
        app.use('/order', orderRouter);
        app.use('/sendMoney', sendMoneyRouter);
    });

    // Cleanup after all tests
    test.after(async () => {
        if (mongoose.connection.readyState === 1) { // If connected
            // Clean up test database
            await mongoose.connection.dropDatabase();
            await mongoose.connection.close();
        }
    });

    // Individual test cases
    test.it('should sign up a new user', async () => {
        const response = await request(app)
            .post('/signup')
            .send({
                email: 'contactseaadviser@gmail.com',
                password: 'password123',
                phone: '+436604426691',
                name: 'Test User'
            });
        
        assert.strictEqual(response.status, 201);
    });

    test.it('should sign in an existing user', async () => {
        const response = await request(app)
            .post('/signin')
            .send({
                email: 'contactseaadviser@gmail.com',
                password: 'password123'
            });
        
        assert.strictEqual(response.status, 200);
        // Store the token for subsequent requests
        authToken = response.body.token;
    });

    test.it('should fetch user balance', async () => {
        const response = await request(app)
            .get('/balance')
            .set('Authorization', `Bearer ${authToken}`)
            .send();
        
        assert.strictEqual(response.status, 200);
    });

    test.it('should create a new order', async () => {
        const response = await request(app)
            .post('/order')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
                amount: 100,
                currency: 'USD',
                description: 'Test order'
            });
        
        assert.strictEqual(response.status, 201);
    });

    test.it('should send money', async () => {
        const response = await request(app)
            .post('/sendMoney')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
                recipientEmail: 'contactseaadviser@gmail.com',
                amount: 50,
                currency: 'USD',
                description: 'Test transfer'
            });
        
        assert.strictEqual(response.status, 200);
    });
});

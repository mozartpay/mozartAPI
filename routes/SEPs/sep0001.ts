import express, { Express } from "express";
import path from 'path';

require('dotenv').config();

const app: Express = express();

async function runSepOne() {

// Serve the stellar.toml file
app.use('/.well-known', express.static(path.join(__dirname, '.well-known')));

console.log("Toml file running")

}

export default runSepOne;

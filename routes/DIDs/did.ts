import express, { Express } from "express";
import path from 'path';

require('dotenv').config();

const app: Express = express();

async function runDidJson() {

  // Serve only the did.json file from the .well-known directory
  app.get('/.well-known/did.json', (req, res) => {
    res.sendFile(path.join(__dirname, '.well-known', 'did.json'));
  });

  console.log("did.json is now hosted");

}

export default runDidJson;

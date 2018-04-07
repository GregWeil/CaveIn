/// assets.js
// https://glitch.com/edit/#!/assets-lib?path=assets.js
// lightly modified to be typescript

import * as express from 'express';
import * as fs from 'fs';

const router = express.Router();
const content = fs.readFileSync('.glitch-assets', 'utf8');
const rows = content.split("\n");
const assets = rows.map((row) => {
  try {
    return JSON.parse(row);
  } catch (e) {}
}).filter((asset) => {
  return asset;
});

// Example url
// https://cdn.gomix.com/us-east-1%3A1a0f89c8-26bf-4073-baed-2b409695e959%2Ffoobar.png

router.use((request, response) => {
  response.header("Access-Control-Allow-Origin", "*");
  response.header("Access-Control-Allow-Methods", "GET");
  response.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  
  const path = request.path.substring(1);
  
  const [matching] = assets.filter((asset) => {
    return asset.name === path;
  });
  
  if (!matching || !matching.url) {
    return response.status(404).end("No such file");
  }
  
  return response.redirect(matching.url);
});

export default router;
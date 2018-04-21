// server.ts
// where your node app starts

import * as express from 'express';
import * as browserify from 'browserify';
import assets from './assets';

// express init
const app = express();

// http://expressjs.com/en/starter/static-files.html
app.use(express.static('public'));
app.use('/assets', assets);



app.use('/client.js');

// http://expressjs.com/en/starter/basic-routing.html
app.get('/', express.static('public/index.html'));

// listen for requests :)
const listener = app.listen(process.env.PORT, () => {
  console.log('Your app is listening on port ' + listener.address().port);
});
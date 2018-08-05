// main.ts
// where your node app starts

import * as express from 'express';
import * as browserify from 'browserify';
import assets from './assets';

// express init
const app = express();

const client = new Promise((resolve, reject) => {
  browserify('bin/client/main.js').bundle((err, data) => {
    if (err) {
      console.error(err);
      console.log(data);
    } else {
      resolve(data);
    }
  });
});
app.use('/client.js', async (req, res) => res.send(await client));

app.use('/assets', assets);

app.use(express.static('public'));

// listen for requests :)
const listener = app.listen(process.env.PORT, () => {
  console.log('Your app is listening on port ' + listener.address().port);
});
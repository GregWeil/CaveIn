/// main.ts
// where your node app starts

import * as express from 'express';
import * as browserify from 'browserify';

// express init
const app = express();

const client = new Promise((resolve, reject) => {
  browserify('bin/client/main.js')
    .transform('uglifyify', { global: true })
    .bundle((err, data) => {
      if (err) {
        //console.error(err);
      }
      resolve(data);
    });
});
app.get('/client.js', async (req, res) => {
  res.set('Content-Type', 'application/javascript');
  res.send(await client);
});

app.use(express.static('public'));

// listen for requests :)
const listener = app.listen(process.env.PORT, () => {
  const addr = listener.address()!;
  const bind = typeof addr === 'string' ? `pipe ${addr}` : `port ${addr.port}`;
  console.log(`Your app is listening on ${bind}!`);
});

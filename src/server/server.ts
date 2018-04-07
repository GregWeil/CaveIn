// server.ts
// where your node app starts

import Express from 'express';
import Assets from 'assets';

// express init
const app = Express();

// http://expressjs.com/en/starter/static-files.html
app.use(Express.static('public'));
app.use('/client.js', Express.static('/tmp/bin/client.js'));

app.use('/assets', Assets);

// http://expressjs.com/en/starter/basic-routing.html
app.get('/', Express.static('public/index.html'));

// listen for requests :)
const listener = app.listen(process.env.PORT, () => {
  console.log('Your app is listening on port ' + listener.address().port);
});
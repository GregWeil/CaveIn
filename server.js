// server.js
// where your node app starts

// express init
var express = require('express');
var app = express();

// http://expressjs.com/en/starter/static-files.html
app.use(express.static('public'));
app.use('/client.js', express.static('/tmp/bin/client.js'));

app.use('/assets', require('./assets'));

// http://expressjs.com/en/starter/basic-routing.html
app.get('/', express.static('public/index.html'));

// listen for requests :)
var listener = app.listen(process.env.PORT, function () {
  console.log('Your app is listening on port ' + listener.address().port);
});
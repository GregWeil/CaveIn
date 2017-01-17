// server.js
// where your node app starts

// common init
var fs = require('fs');

// browserify init
var browserify = require('browserify');
var watchify = require('watchify');

// express init
var express = require('express');

var b = browserify({
  entries: ['./client/main.js'],
  paths: ['./client', './client/game', './client/engine'],
  plugin: [watchify],
  cache: {}, packageCache: {}
});

function bundle(ids, callback) {
  b.bundle().on('end', function() {
    console.log('bundle created' + (ids.length ? ' for ' + ids.join(', ') : ''));
    if (callback) callback();
  }).on('error', function(error) {
    console.log(error.message);
  }).pipe(fs.createWriteStream('public/bundle.js'));
}
b.on('update', bundle);

bundle([], function() {
  var app = express();
  
  // http://expressjs.com/en/starter/static-files.html
  app.use(express.static('public'));
  
  // http://expressjs.com/en/starter/basic-routing.html
  app.get("/", function (request, response) {
    response.sendFile(__dirname + '/public/index.html');
  });
  
  // listen for requests :)
  var listener = app.listen(process.env.PORT, function () {
    console.log('Your app is listening on port ' + listener.address().port);
  });
});
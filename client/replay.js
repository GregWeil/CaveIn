/// replays.js
//Replay validation and recording

var _ = require('underscore');

var Game = require('game.js');

function replayValidate(replay) {
  if (!replay) return false;
  if (!replay.validate) return false;
  
  var game = new Game({
    headless: true,
    seed: replay.seed
  });
  
  var alive = true;
  var aborted = false;
  game.on('player-died', function(evt) {
    alive = false;
  });
  
  for (var i = 0; i < replay.commands.length; ++i) {
    if (!alive) {
      aborted = true;
      break;
    }
    game.update(replay.commands[i]);
  }
  
  var invalid = [];
  
  if (aborted) {
    invalid.push('player died before end of inputs');
  }
  
  if (alive !== replay.validate.alive) {
    invalid.push('player alive state mismatch');
  }
  
  if (game.score !== replay.validate.score) {
    invalid.push('score mismatch');
  }
  
  game.destructor();
  
  if (invalid.length) {
    console.log(invalid.join('\n'));
  }
  
  return !invalid.length;
}

module.exports = {
  validate: replayValidate
};
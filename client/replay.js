/// replays.js
//Replay validation and recording

var _ = require('underscore');

var Game = require('game.js');

function validate(replay) {
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

function getScore(replay) {
  return replay.validate.score;
}

function getAlive(replay) {
  return replay.validate.alive;
}

function isContinuation(long, short) {
  if (!long || !short) return false;
  if (long.seed !== short.seed) return false;
  if (getScore(long) < getScore(short)) return false;
  return false;
}

module.exports = {
  validate: validate,
  getScore: getScore,
  isContinuation: isContinuation
};
/// replays.js
//Replay validation and recording

var _ = require('underscore');
var deferred = require('deferred');

var Game = require('game.js');

function validate(replay) {
  if (!replay) return deferred(false);
  if (!replay.validate) return deferred(false);
  
  var game = new Game({
    headless: true,
    seed: replay.seed
  });

  return deferred(function() {
  }).then(function(game) {
    var alive = true;
    var aborted = false;
    game.on('player-died', function(evt) {
      alive = false;
    });
    return {
      game: game,
      alive: alive,
      aborted: aborted
    }
  }).then(function)

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

    if (invalid.length) {
      console.log(invalid.join('\n'));
    }

    game.destructor();
    return !invalid.length;
  });
}

function record(game, callback, replay) {
  replay = replay || {
    seed: game.randomSeed,
    commands: [],
    validate: {
      alive: true,
      score: 0,
      version: 1
    }
  };
  
  callback(replay, game);
  
  game.on('update', function(evt) {
    replay.commands.push(evt.data.command);
  }, undefined, -Infinity);
  
  game.on('score', function(evt) {
    replay.validate.score = game.score;
  }, undefined, Infinity);
  
  game.on('player-died', function(evt) {
    replay.validate.alive = false;
  }, undefined, Infinity);
  
  game.on('update', function(evt) {
    callback(replay, game);
  }, undefined, Infinity);
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
  return true;
}

module.exports = {
  validate: validate,
  record: record,
  getScore: getScore,
  getAlive: getAlive,
  isContinuation: isContinuation
};
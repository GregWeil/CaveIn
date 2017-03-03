/// replays.js
//Replay validation and recording

var _ = require('underscore');
var deferred = require('deferred');

var Game = require('game.js');

function execute(game, commands, rate, limit) {
  var def = deferred();

  var start = _.now();
  var index = 0;

  function step() {
    var target = (_.now() - start) * (rate / 1000);
    target = Math.min(target, index + limit, commands.length);
    
    for (var i = index; i < target; ++i) {
      
    }
    index = target;
    
    if (index < commands.length) {
      _.defer(step);
    } else {
      def.resolve(false);
    }
  }
  
  _.defer(step);

  return def.promise;
}

function validate(replay) {
  if (!replay) return deferred(false);
  if (!replay.validate) return deferred(false);

  var game = new Game({
    headless: true,
    seed: replay.seed
  });

  var alive = true;
  game.on('player-died', function(evt) {
    alive = false;
  });

  return deferred(
    replay.commands
  ).reduce(function validateStep(aborted, command, index) {
    if (!alive || aborted) {
      return true;
    }

    game.update(command);

    var def = deferred();
    if (index % 25 !== 0) {
      def.resolve(false);
    } else {
      _.defer(def.resolve, false);
    }
    return def.promise;
  }, false).then(function(aborted) {
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

    return !invalid.length;
  }).finally(function() {
    game.destructor();
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
  if (long.commands.length < short.commands.length) return false;
  return true;
}

module.exports = {
  execute: execute,
  validate: validate,
  record: record,
  getScore: getScore,
  getAlive: getAlive,
  isContinuation: isContinuation
};
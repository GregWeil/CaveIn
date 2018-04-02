/// replays.js
//Replay validation and recording

var Game = require('./game/game');

function execute(game, commands, rate, limit) {
  return new Promise((resolve, reject) => {
    var start = performance.now() - 1;

    rate = rate || Infinity;
    limit = limit || Infinity;

    function step(index) {
      var target = Math.round((performance.now() - start) * (rate / 1000));
      target = Math.min(target, (index + limit), commands.length);

      for (var i = index; i < target; ++i) {
        if (!game.commandCheck(commands[i])) {
          reject();
          return;
        }
        game.update(commands[i]);
      }

      if (target < commands.length) {
        setTimeout(step, 0, target);
      } else {
        resolve();
      }
    }

    setTimeout(step, 0, 0);
  });
}

async function validate(replay) {
  if (!replay) return false;
  if (!replay.validate) return false;
  
  var game = new Game({
    seed: replay.seed
  });
  
  var alive = true;
  game.on('player-died', function(evt) {
    alive = false;
  });
  
  var invalid = [];
  
  try {
    await execute(game, replay.commands, Infinity, 500);
  } catch (e) {
    invalid.push('invalid inputs');
  }
  if (alive && !replay.validate.alive) {
    invalid.push('player should have died');
  }
  if (!alive && replay.validate.alive) {
    invalid.push('player should have lived');
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
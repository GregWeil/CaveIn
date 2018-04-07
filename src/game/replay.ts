/// replays.js
//Replay validation and recording

import * as Game from './game';

class Replay {
  
  commands: string[];
  
}

function execute(game: any, commands: string[], rate: number, limit: number) {
  return new Promise((resolve, reject) => {
    var start = performance.now() - 1;

    rate = rate || Infinity;
    limit = limit || Infinity;

    function step(index: number) {
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

async function validate(replay: any) {
  if (!replay) return false;
  if (!replay.validate) return false;
  
  var game: any = new Game({
    seed: replay.seed
  });
  
  var alive = true;
  game.on('player-died', (evt: any) => {
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

function record(game: any, callback: (replay: any, game: any) => void, replay: any) {
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

  game.on('update', (evt: any) => {
    replay.commands.push(evt.data.command);
  }, undefined, -Infinity);

  game.on('score', (evt: any) => {
    replay.validate.score = game.score;
  }, undefined, Infinity);

  game.on('player-died', (evt: any) => {
    replay.validate.alive = false;
  }, undefined, Infinity);

  game.on('update', (evt: any) => {
    callback(replay, game);
  }, undefined, Infinity);
}

function getScore(replay: any) {
  return replay.validate.score;
}

function getAlive(replay: any) {
  return replay.validate.alive;
}

function isContinuation(long: any, short: any): boolean {
  if (!long || !short) return false;
  if (long.seed !== short.seed) return false;
  if (getScore(long) < getScore(short)) return false;
  if (long.commands.length < short.commands.length) return false;
  return true;
}

export {
  execute,
  validate,
  record,
  getScore,
  getAlive,
  isContinuation
};
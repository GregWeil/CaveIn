/// wrapper.js
//Provide simple functions for game management

var storage = require('local-storage');

var Vector2 = require('engine/vector2');
var Game = require('game/game');
var Replay = require('replay');

//Player game state

var state = {
  game: null, //The active game
  save: undefined, //The player's save, undefined is unloaded
  best: undefined //The players's best replay, undefined is unloaded
};

//Saves for the current and best game

async function replayGet(name, validate) {
  if (state[name] !== undefined) {
    return state[name];
  }
  var nameDeferred = name + '_loader';
  if (!state[nameDeferred]) {
    //This is the first request, load and validate
    validate = validate || (replay => true);
    var replay = storage.get(name);
    state[nameDeferred] = Replay.validate(replay).then(
      valid => valid && validate(replay)
    ).then(valid => {
      //Make sure nothing touched it while we were working
      if (state[name] === undefined) {
        state[name] = valid ? replay : null;
        state[nameDeferred] = undefined;
      }
      return state[name];
    });
  }
  return await state[nameDeferred];
}

async function replayGetBest() {
  return await replayGet('best');
}

async function replayGetBestScore() {
  var replay = await replayGetBest();
  return replay ? Replay.getScore(replay) : null;
}

async function replayGetSave() {
  return await replayGet('save', replay => Replay.getAlive(replay));
}

function replayRemoveSave() {
  state.save = null;
}

//Record the player's current game

async function replayRecordSave(replay, game) {
  if (game !== state.game) return;
  if (!replay) return;
  if (Replay.getScore(replay) <= 0) return;

  storage.set('save', Replay.getAlive(replay) ? replay : null);
  state.save = storage.get('save');

  var best = await replayGetBest();
  var isBetterScore = best && (Replay.getScore(replay) > Replay.getScore(best));
  var isContinuation = Replay.isContinuation(replay, best);
  if (!best || isBetterScore || isContinuation) {
    storage.set('best', replay);
    state.best = storage.get('best');
  }
}

//Manipulate the player's game

function resize() {
  var pixel = window.devicePixelRatio;
  var canvas = document.querySelector('#game-page .area');
  canvas.style.transform = '';
  var sizeCanvas = new Vector2(canvas.offsetWidth, canvas.offsetHeight);
  var sizeWindow = new Vector2(window.innerWidth, window.innerHeight);
  var scaleAxes = sizeWindow.divide(sizeCanvas.divide(pixel));
  var scale = Math.min(scaleAxes.x, scaleAxes.y);
  if (scale > 1) {
    scale = Math.floor(scale);
  } else if (scale < 1) {
    scale = (1 / Math.ceil(1 / scale));
  }
  canvas.style.transform = ('scale(' + (scale / pixel) + ')');
}
window.addEventListener('resize', () => {
  if (state.game) resize();
});

var overlayCurrent = null;
var overlayAction = null;
function overlay(name, action) {
  document.querySelectorAll('#game-page .overlay')
    .forEach(e => e.classList.add('hidden'));
  if (name) {
    overlayCurrent = name;
    overlayAction = action;
    document.getElementById(name).classList.remove('hidden');
  } else {
    overlayCurrent = null;
    overlayAction = null;
  }
}

window.pause = function pause(evt) {
  var evtCanPause = !evt ||
    (evt.type.startsWith('key') && evt.key === 'Escape') ||
    (evt.type.startsWith('touch') && evt.target === document.body);
  var evtCanResume = !evt || evt.key === 'Escape';
  if (evtCanPause && !overlayCurrent) {
    overlay('game-pause');
  } else if (evtCanResume && overlayCurrent === 'game-pause') {
    overlay();
  }
};

async function createPlayable(config) {
  overlay();
  var save = await replayGetSave();
  var best = await replayGetBestScore();
  
  var game = new Game({
    canvas: document.getElementById('canvas'),
    seed: save ? save.seed : null,
    best: best, locked: true
  });
  state.game = game;
  resize();
  
  game.on('command-check', function (evt) {
    if (overlayCurrent) {
      evt.data.accept = false;
      if (overlayAction && evt.data.command === 'action') {
        overlayAction();
      }
    }
  }, undefined, Infinity);
  
  game.on('player-died', function() {
    window.setTimeout(function() {
      overlay('game-over', config.onRetry);
    }, 1000);
  });
  
  if (save) {
    game.silent = true;
    await Replay.execute(game, save.commands.slice(0, -100), 2500, 100);
    await Replay.execute(game, save.commands.slice(-100, -5), 500, 100);
    game.silent = false;
    await Replay.execute(game, save.commands.slice(-5, -1), 5);
    await Replay.execute(game, save.commands.slice(-1), 1.5);
  }
  
  Replay.record(game, replayRecordSave, save);
  window.addEventListener('keydown', window.pause);
  document.body.addEventListener('touchstart', window.pause);
  game.locked = false;
}

function destroyPlayable() {
  window.removeEventListener('keydown', window.pause);
  document.body.removeEventListener('touchstart', window.pause);
  state.game && state.game.destructor();
  state.game = null;
}

async function createWatchable(config) {
  overlay();
  var save = await replayGetBest();
  if (!save) {
    config.onComplete();
    return;
  }
  var score = Replay.getScore(save);
  
  var game = new Game({
    canvas: document.getElementById('canvas'),
    seed: save.seed, best: score,
    locked: true
  });
  state.game = game;
  resize();
  
  await Replay.execute(game, save.commands, 5);
  await new Promise((resolve, reject) => setTimeout(resolve, 3000));
  
  config.onComplete();
}

function destroyWatchable() {
  state.game && state.game.destructor();
  state.game = null;
}

module.exports = {
  playable: {
    create: createPlayable,
    destroy: destroyPlayable
  },
  watchable: {
    create: createWatchable,
    destroy: destroyWatchable
  },
  save: {
    get: replayGetSave,
    clear: replayRemoveSave
  },
  best: {
    get: replayGetBest,
    score: replayGetBestScore
  }
};
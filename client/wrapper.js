/// wrapper.js
//Provide simple functions for game management

var $ = require('jquery');
var storage = require('local-storage');

var Vector2 = require('vector2.js');
var Game = require('game.js');
var Replay = require('replay.js');

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
  var canvas = $('#game-page .area');
  canvas.css('transform', '');
  var sizeCanvas = new Vector2(canvas.width(), canvas.height());
  var sizeWindow = new Vector2(window.innerWidth, window.innerHeight);
  var scaleAxes = sizeWindow.divide(sizeCanvas.divide(pixel));
  var scale = Math.min(scaleAxes.x, scaleAxes.y);
  if (scale > 1) {
    scale = Math.floor(scale);
  } else if (scale < 1) {
    scale = (1 / Math.ceil(1 / scale));
  }
  canvas.css('transform', 'scale(' + (scale / pixel) + ')');
}

var overlayCurrent = null;
var overlayAction = null;
function overlay(name, action) {
  $('#game-page .overlay').hide();
  if (name) {
    overlayCurrent = name;
    overlayAction = action;
    $('#game-page #' + name + '.overlay').show();
  } else {
    overlayCurrent = null;
    overlayAction = null;
  }
}

window.pause = function pause(evt) {
  var evtCanPause = !evt ||
    (evt.type.indexOf('key') >= 0 && evt.key === 'Escape') ||
    (evt.type.indexOf('touch') >= 0 && evt.target === document.documentElement);
  var evtCanResume = !evt || evt.key === 'Escape';
  if (evtCanPause && !overlayCurrent) {
    overlay('game-pause');
  } else if (evtCanResume && overlayCurrent === 'game-pause') {
    overlay();
  }
};

async function createPlayable(config) {
  var save = await replayGetSave();
  var best = await replayGetBestScore();
  
  var game = new Game({
    canvas: document.getElementById('canvas'),
    seed: save ? save.seed : null,
    best: best, locked: true
  });
  state.game = game;
  
  $(window).on('resize', resize);
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
  $(window).on('keydown touchstart', window.pause);
  game.locked = false;
}

function destroyPlayable() {
  overlay();
  $(window).off('keydown touchstart', window.pause);
  $(window).off('resize', resize);
  state.game && state.game.destructor();
  state.game = null;
}

async function createWatchable(config) {
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
  
  $(window).on('resize', resize);
  resize();
  
  await Replay.execute(game, save.commands, 5);
  await new Promise((resolve, reject) => setTimeout(resolve, 3000));
  
  config.onComplete();
}

function destroyWatchable() {
  overlay();
  $(window).off('resize', resize);
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
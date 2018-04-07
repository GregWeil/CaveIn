/// wrapper.js
//Provide simple functions for game management

var Save = require('./save');
var Vector2 = require('../engine/vector2').default;
var Game = require('../game/game');
var Replay = require('../game/replay').default;

//Player game state

var game = null;

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
  if (game) resize();
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
  var save = await Save.getSave();
  var best = await Save.getBestScore();
  
  game = new Game({
    canvas: document.getElementById('canvas'),
    seed: save ? save.seed : null,
    best: best, locked: true
  });
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
    const executor = save.getExecutor(game);
    game.silent = true;
    await executor.execute(game, save.commands.slice(0, -100), 2500, 100);
    await Replay.execute(game, save.commands.slice(-100, -5), 500, 100);
    game.silent = false;
    await Replay.execute(game, save.commands.slice(-5, -1), 5);
    await Replay.execute(game, save.commands.slice(-1), 1.5);
  }
  
  Replay.record(game, (replay, replayGame) => {
    if (replayGame == game) {
      Save.saveReplay(replay);
    }
  }, save);
  window.addEventListener('keydown', window.pause);
  document.body.addEventListener('touchstart', window.pause);
  game.locked = false;
}

function destroyPlayable() {
  window.removeEventListener('keydown', window.pause);
  document.body.removeEventListener('touchstart', window.pause);
  game && game.destructor();
  game = null;
}

async function createWatchable(config) {
  overlay();
  var save = await Save.getBest();
  if (!save) {
    config.onComplete();
    return;
  }
  var score = Replay.getScore(save);
  
  game = new Game({
    canvas: document.getElementById('canvas'),
    seed: save.seed, best: score,
    locked: true
  });
  resize();
  
  await Replay.execute(game, save.commands, 5);
  await new Promise((resolve, reject) => setTimeout(resolve, 3000));
  
  config.onComplete();
}

function destroyWatchable() {
  game && game.destructor();
  game = null;
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
};
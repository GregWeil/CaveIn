/// wrapper.js
//Provide simple functions for game management

var $ = require('jquery');
var _ = require('underscore');
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

function replayGetBest() {
  if (_.isUndefined(state.best)) {
    var best = storage.get('best');
    state.best = Replay.validate(best) ? best : null;
  }
  return state.best;
}

function replayGetBestScore() {
  var best = replayGetBest();
  return best ? best.validate.score : null;
}

function replayRemoveSave() {
  state.save = null;
}

function replayGetSave() {
  if (_.isUndefined(state.save)) {
    var save = storage.get('save');
    state.save = (Replay.validate(save) && save.validate.alive) ? save : null;
  }
  return state.save;
}

//Record the player's current game

function replayRecordSave(replay, game) {
  if (game !== state.game) return;
  if (!replay) return;
  
  if (replay.validate.score > 0) {
    storage.set('save', replay);
    state.save = storage.get('save');
  }
  
  var best = replayGetBest();
  var isBetterScore = (best && (replay.validate.score > best.validate.score));
  var isContinuation = Replay.isContinuation(replay, best);
  if (!best || isBetterScore || isContinuation) {
    storage.set('best', replay);
    state.best = storage.get('best');
  }
}

//Manipulate the player's game

function resize() {
  var pixel = window.devicePixelRatio || 1;
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

function createPlayable(config) {
  var save = replayGetSave();
  var best = replayGetBestScore();
  
  var game = new Game({
    canvas: document.getElementById('canvas'),
    seed: save ? save.seed : null,
    best: best
  });
  state.game = game;
  
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
    game.headless = true;
    for (var i = 0; i < save.commands.length; ++i) {
      game.update(save.commands[i]);
    }
    game.headless = false;
  }
  Replay.record(game, replayRecordSave, save);
  
  $(window).on('keydown touchstart', window.pause);
  $(window).on('resize', resize);
  resize();
  
  //Fire it up
  game.render();
  
  return game;
}

function destroyPlayable() {
  overlay();
  $(window).off('keydown touchstart', window.pause);
  $(window).off('resize', resize);
  state.game.destructor();
  state.game = null;
}

module.exports = {
  playable: {
    create: createPlayable,
    destroy: destroyPlayable
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
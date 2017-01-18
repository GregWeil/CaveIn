/// wrapper.js
//Provide simple functions for game management

var $ = require('jquery');

var Vector2 = require('vector2.js');
var Game = require('game.js');

var game = null;
var replay = null;
var replayStorage = window.sessionStorage;
var replayStorageKey = 'save';

//Save a replay of the player's game

function replayRecordRetrieve() {
  if (!replayStorage.hasItem(replayStorageKey)) return null;
  return JSON.parse(replayStorage.getItem(replayStorageKey));
}

function replayRecordDelete() {
  if (replayStorage.hasItem(replayStorageKey)) {
    replayStorage.removeItem(replayStorageKey);
  }
}

function replayRecordSave() {
  replayStorage.setItem(replayStorageKey, JSON.stringify(replay));
}

function replayRecordStart() {
  replay = {
    commands: [],
    validate: {
      alive: true,
      score: 0,
      version: 1
    }
  };
  replayRecordSave();
  
  game.on('player-died', function(evt) {
    replay.validate.alive = false;
  }, undefined, Infinity);
  
  game.on('score', function(evt) {
    replay.validate.score = game.score;
  }, undefined, Infinity);
  
  game.on('update', function(evt) {
    replay.commands.push(evt.data.command);
    replayRecordSave();
  }, undefined, Infinity);
}

function replayRecordStop() {
  replayRecordSave();
  replay = null;
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
  game = new Game(document.getElementById('canvas'), config.best);
  
  game.on('score', function(evt) {
    if (game.score > game.best) {
      config.onScore(game.score);
    }
  }, undefined, 100);
  
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
  
  replayRecordStart();
  
  $(window).on('keydown touchstart', pause);
  $(window).on('resize', resize);
  resize();
  
  //Fire it up
  game.render();
  
  return game;
}

function destroyPlayable() {
  replayRecordStop();
  overlay();
  $(window).off('keydown touchstart', pause);
  $(window).off('resize', resize);
  game.destructor();
  game = null;
}

module.exports = {
  playable: {
    create: createPlayable,
    destroy: destroyPlayable,
    save: {
      get: replayRecordRetrieve,
      delete: replayRecordDelete
    }
  }
};
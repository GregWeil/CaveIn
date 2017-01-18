/// wrapper.js
//Provide simple functions for game management

var $ = require('jquery');

var Vector2 = require('vector2.js');
var Game = require('game.js');

var game = null;
var replay = null;

function replayRecordSave() {
  console.log(replay);
}

function replayRecordStart() {
  replay = {
    commands: []
  };
  replayRecordSave();
  game.on('update', function(evt) {
    replay.commands.push(evt.data.command);
    replayRecordSave();
  }, undefined, -Infinity);
}

function replayRecordStop() {
  replayRecordSave();
  replay = null;
}

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
  }, undefined, Infinity);
  
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
  
  replayRecordStart(game);
  
  $(window).on('keydown touchstart', pause);
  $(window).on('resize', resize);
  resize();
  
  //Fire it up
  game.render();
  
  return game;
}

function destroyPlayable(game) {
  replayRecordStop();
  overlay();
  $(window).off('keydown touchstart', pause);
  $(window).off('resize', resize);
  game.destructor();
}

module.exports = {
  playable: {
    create: createPlayable,
    destroy: destroyPlayable
  }
};
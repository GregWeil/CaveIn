/// wrapper.js
//Provide simple functions for game management

var $ = require('jquery');

var Vector2 = require('vector2.js');
var Game = require('game.js');

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
  var evtCanPause = !evt || !evt.key || evt.key === 'Escape';
  var evtCanResume = !evt || evt.key === 'Escape';
  if (evtCanPause && !overlayCurrent) {
    overlay('game-pause');
  } else if (evtCanResume && overlayCurrent === 'game-pause') {
    overlay();
  }
};

function createPlayable(config) {
  var game = new Game(document.getElementById('canvas'), config.best);
  
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
  
  $(window).on('keydown touchstart', pause);
  $(window).on('resize', resize);
  resize();
  
  //Fire it up
  game.render();
  
  return game;
}

function destroyPlayable(game) {
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
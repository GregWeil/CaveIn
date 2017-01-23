/// wrapper.js
//Provide simple functions for game management

var $ = require('jquery');
var storage = require('local-storage');

var Vector2 = require('vector2.js');
var Game = require('game.js');

var replayKey = 'save';

var state = {
  game: null,
  replay: null
};

//Replay validation

function replayValidate(replay) {
  if (!replay) return false;
  if (!replay.validate) return null;
  var game = new Game({
    headless: true,
    seed: replay.seed
  });
  
  var alive = true;
  var aborted = false;
  game.on('player-died', function(evt) {
    alive = false;
  });
  
  for (var i = 0; i < replay.commands.length; ++i) {
    if (!alive) {
      aborted = true;
      break;
    }
    game.update(replay.commands[i]);
  }
  
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
  
  game.destructor();
  
  if (invalid.length) {
    console.log(invalid.join('\n'));
  }
  
  return !invalid.length;
}

//Save a replay of the player's game

function replayRemoveSave() {
  storage.remove(replayKey);
}

function replayGetSave() {
  if (state.replay) { return state.replay; }
  
  var save = storage.get(replayKey);
  if (!save) { return null; }
  
  if (!replayValidate(save)) return null;
  if (!save.validate.alive) return null;
  
  return save;
}

function replayRecordSave() {
  var replay = state.replay;
  if (replay.commands.length > 0) {
    replay.validate.score = state.game.score;
    storage.set(replayKey, replay);
  }
}

function replayRecordStart(save) {
  var game = state.game;
  var replay = save || {
    seed: game.randomSeed,
    commands: [],
    validate: {
      alive: true,
      score: 0,
      version: 1
    }
  };
  state.replay = replay;
  replayRecordSave();
  
  game.on('player-died', function(evt) {
    state.replay.validate.alive = false;
  }, undefined, Infinity);
  
  game.on('update', function(evt) {
    replay.commands.push(evt.data.command);
  }, undefined, -Infinity);
  
  game.on('update', function(evt) {
    replayRecordSave();
  }, undefined, Infinity);
}

function replayRecordStop() {
  replayRecordSave();
  state.replay = null;
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
  
  var game = new Game({
    seed: save ? save.seed : null,
    canvas: document.getElementById('canvas'),
    best: config.best,
    headless: false
  });
  state.game = game;
  
  game.on('score', function(evt) {
    if (game.score > game.best) {
      replayRecordSave();
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
  
  if (save) {
    game.headless = true;
    for (var i = 0; i < save.commands.length; ++i) {
      game.update(save.commands[i]);
    }
    game.headless = false;
  }
  replayRecordStart(save);
  
  $(window).on('keydown touchstart', window.pause);
  $(window).on('resize', resize);
  resize();
  
  //Fire it up
  game.render();
  
  return game;
}

function destroyPlayable() {
  replayRecordStop();
  overlay();
  $(window).off('keydown touchstart', window.pause);
  $(window).off('resize', resize);
  state.game.destructor();
  state.game = null;
}

module.exports = {
  playable: {
    create: createPlayable,
    destroy: destroyPlayable,
    save: {
      get: replayGetSave,
      clear: replayRemoveSave
    }
  }
};
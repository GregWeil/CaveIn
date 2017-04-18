/// wrapper.js
//Provide simple functions for game management

var $ = require('jquery');
var _ = require('underscore');
var deferred = require('deferred');
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

function replayGet(name, validate) {
  if (state[name]) {
    return deferred(state[name]);
  }
  var nameDeferred = name + '_deferred';
  if (!state[nameDeferred]) {
    //This is the first request, load and validate
    validate = validate || _.constant(true);
    var replay = storage.get(name);
    state[nameDeferred] = (deferred(
        //Make sure the replay is legitimate
        Replay.validate(replay)
      ).then(function(valid) {
        //Check the caller's requirements
        return valid && validate(replay);
      }).then(function(valid) {
        //Make sure nothing saved over us
        if (_.isUndefined(state[name])) {
          state[name] = valid ? replay : null;
          state[nameDeferred] = undefined;
        }
        return state[name];
      })
    );
  }
  return state[nameDeferred];
}

function replayGetBest() {
  return replayGet('best');
}

function replayGetBestScore() {
  return replayGetBest().then(function(replay) {
    return replay ? Replay.getScore(replay) : null;
  });
}

function replayRemoveSave() {
  state.save = null;
}

function replayGetSave() {
  return replayGet('save', function(replay) {
    return Replay.getAlive(replay);
  });
}

//Record the player's current game

function replayRecordSave(replay, game) {
  if (game !== state.game) return;
  if (!replay) return;
  if (Replay.getScore(replay) <= 0) return;

  storage.set('save', Replay.getAlive(replay) ? replay : null);
  state.save = storage.get('save');

  replayGetBest().done(function(best) {
    var isBetterScore = best && (Replay.getScore(replay) > Replay.getScore(best));
    var isContinuation = Replay.isContinuation(replay, best);
    if (!best || isBetterScore || isContinuation) {
      storage.set('best', replay);
      state.best = storage.get('best');
    }
  });
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
  var game, save, best;
  deferred(
    replayGetSave(), replayGetBestScore()
  ).then(function(results) {
    save = results[0];
    best = results[1];
    
    game = new Game({
      canvas: document.getElementById('canvas'),
      seed: save ? save.seed : null,
      best: best
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
  }).then(function() {
    var def = deferred();
    _.delay(def.resolve);
    return def.promise;
  }).then(function() {
    if (save) {
      game.headless = true;
      return Replay.execute(game, save.commands.slice(0, -5), 500, 50
      ).then(function(success) {
        return success && Replay.execute(game, save.commands.slice(-5, -1), 5);
      }).then(function(success) {
        return success && Replay.execute(game, save.commands.slice(-1), 1.5);
      }).then(function(success) {
        game.headless = false;
      });
    }
  }).then(function() {
    Replay.record(game, replayRecordSave, save);
    $(window).on('keydown touchstart', window.pause);
  }).done();
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
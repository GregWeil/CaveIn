/// main.js
//Define the different pages and how they interact

var _ = require('underscore');
var $ = require('jquery');
var Howl = require('howler').Howl;
var storage = require('local-storage');

var Pages = require('pages.js');
var Game = require('wrapper.js');

Pages.home(new Pages.Page({
  name: 'title',
  selector: '#title-page',
  start: function(evt) {
    if (evt.key === ' ') {
      Pages.navigate('game');
    }
  },
  setup: function() {
    $(window).on('keydown', this.config.start);
    $('body').toggleClass('save-exists', !!Game.save.get());
  },
  teardown: function() {
    $(window).off('keydown', this.config.start);
  }
}));

Pages.add(new Pages.Page({
  name: 'tutorial',
  selector: '#tutorial-page'
}));

Pages.redirect('newgame', 'game', function() {
  Game.save.clear();
});

Pages.add(new Pages.Page({
  name: 'game',
  selector: '#game-page',
  setup: function() {
    window.game = Game.playable.create({
      best: window.localStorage.getItem('best-score'),
      onScore: function(newBest) {
        window.localStorage.setItem('best-score', newBest);
        window.localStorage.setItem('best-replay', JSON.stringify(Game.save.get()));
      },
      onRetry: function() {
        Pages.navigate('newgame');
      }
    });
  },
  teardown: function() {
    Game.playable.destroy();
  }
}));

$(document).ready(function() {
  Pages.setup();
});

var audioMusic = new Howl({ preload: false, src: ['https://cdn.gomix.com/e6f17913-09e8-449d-8798-e394b24f6eff%2Fcavein.wav'] });
var audioMusicId = undefined;

audioMusic.on('end', function() {
  audioMusicId = audioMusic.play();
}).on('play', function() {
  $('body').addClass('music-enabled');
}).on('pause', function() {
    $('body').removeClass('music-enabled');
});

$(window).on('visibilitychange', function() {
  window.music();
});

window.music = function(enable) {
  if (enable === undefined) {
    enable = !storage.get('no-music');
  } else if (enable) {
    storage.remove('no-music');
  } else {
    storage.set('no-music', true);
  }
  if (document.hidden) {
    enable = false;
  }
  if (enable && _.isUndefined(audioMusicId)) {
    audioMusicId = audioMusic.play();
  } else if (enable) {
    audioMusic.play(audioMusicId);
  } else {
    audioMusic.pause(audioMusicId);
  }
};

audioMusic.once('load', function() {
  $('body').addClass('music-loaded');
  window.music();
}).load();

window.fullscreenEnter = function() {
  var element = document.documentElement;
  var names = [
    'requestFullscreen',
    'webkitRequestFullscreen',
    'mozRequestFullScreen',
    'msRequestFullscreen',
    'webkitEnterFullscreen'
  ];
  for (var i = 0; i < names.length; ++i) {
    if (element[names[i]]) {
      element[names[i]]();
      break;
    }
  }
  screen.orientation.lock('landscape').catch(console.warn);
};

window.fullscreenExit = function() {
  var element = document;
  var names = [
    'exitFullscreen',
    'webkitExitFullscreen',
    'mozCancelFullScreen',
    'msExitFullscreen'
  ];
  for (var i = 0; i < names.length; ++i) {
    if (element[names[i]]) {
      element[names[i]]();
      break;
    }
  }
};
/// main.js
//Define the different pages and how they interact

var _ = require('underscore');
var $ = require('jquery');
var Howl = require('howler').Howl;

var Pages = require('pages.js');
var Game = require('wrapper.js');

Pages.home(new Pages.Page({
  name: 'title',
  selector: '#title-page',
  start: function(evt) {
    if (evt.key === ' ') {
      Pages.navigate('newgame');
    }
  },
  setup: function() {
    $(window).on('keydown', this.config.start);
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
  Game.playable.save.clear();
});

Pages.add(new Pages.Page({
  name: 'game',
  selector: '#game-page',
  setup: function() {
    window.game = Game.playable.create({
      best: window.localStorage.getItem('best-score'),
      onScore: function(newBest) {
        window.localStorage.setItem('best-score', newBest);
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
var audioMusicId = null;

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
    enable = !window.localStorage.getItem('no-music');
  } else if (enable) {
    window.localStorage.removeItem('no-music');
  } else {
    window.localStorage.setItem('no-music', 'yes');
  }
  if (document.hidden) {
    enable = false;
  }
  if (enable && !audioMusicId) {
    audioMusicId = audioMusic.play();
    audioMusic.seek(audioMusic.duration()-5, audioMusicId);
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
    'msRequestFullscreen'
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
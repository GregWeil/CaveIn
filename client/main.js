/// main.js
//Create the main game loop, delegate input events

var Random = require('random-js')();

var Vector2 = require('./vector2.js');
var Render = require('./render.js');
var Game = require('./game.js');

var Grid = require('./grid.js');
var Colors = require('./colors.js');
var Pathfind = require('./pathfind.js');
var Player = require('./player.js');
var Enemy = require('./enemy.js');
var Gem = require('./gem.js');

function getQueryParam(name) {
  var match = window.location.search.match(/[?&]music=([^&]+)/);
  return match && match[1];
}

window.addEventListener('load', function() {
  var music = getQueryParam('music');
  if (music) {
    window.sessionStorage.setItem('music', music);
  }
  if (window.sessionStorage.getItem('music') !== '0') {
    document.getElementById('music').play();
  }
  
  window.addEventListener('keypress', function(evt) {
    if (!started) {
      evt.preventDefault();
      startGame();
    }
  });
});

var started = false;
window.startGame = function startGame() {
  if (started) return;
  started = true;
  window.removeEventListener('keypress', startGame);
  document.getElementById('title').style.display = 'none';
  
  window.game = new Game(document.getElementById('canvas'), {
    'KeyW': 'up',
    'KeyA': 'left',
    'KeyS': 'down',
    'KeyD': 'right',
    
    'ArrowUp': 'up',
    'ArrowDown': 'down',
    'ArrowLeft': 'left',
    'ArrowRight': 'right',
    
    'Space': 'action'
  });
  window.grid = game.create(Grid);
  window.pathfind = game.create(Pathfind, grid);
  window.player = game.create(Player, grid, grid.gridSize.minus(1).multiply(0.5).round());
  
  //Fill in the grid
  for (let i = 0; i < grid.gridSize.x; ++i) {
    for (let j = 0; j < grid.gridSize.y; ++j) {
      grid.setBlock(new Vector2(i, j), true);
    }
  }
  
  //Clear some space around the player
  for (let i = -6; i <= 6; ++i) {
    for (let j = -4; j <= 4; ++j) {
      grid.setBlock(player.pos.plus(i, j), false);
    }
  }
  
  function enemyAI(pos) {
    if (player.active) {
      var choices = pathfind.getNextChoices(pos, player.pos);
      return Random.pick(choices).minus(pos);
    } else {
      return Random.pick([
        new Vector2(-1, 0), new Vector2(1, 0),
        new Vector2(0, -1), new Vector2(0, 1)
      ]);
    }
  }
  
  //Spawn an enemy when a block is destroyed
  game.on('grid-change', function(evt) {
    if (evt.from && !evt.to && evt.cause !== 'gem') {
      //if (evt.from !== 'gem') {
        Enemy.spawn(grid, player.pos, enemyAI);
      //}
    }
  });
  
  //Check if something should collapse
  game.on('update-last', function(evt) {
    var collisions = game.getCollisions();
    var distances = pathfind.generateDistanceField(player.pos);
    for (let i = 0; i < grid.gridSize.x; ++i) {
      for (let j = 0; j < grid.gridSize.y; ++j) {
        var pos = new Vector2(i, j);
        if (!grid.getBlock(pos) && !Number.isFinite(distances[i][j])) {
          if (collisions[pos.hash()]) {
            game.destroy(collisions[pos.hash()], 0.4);
          }
          grid.setBlock(pos, true, 0.4);
        }
      }
    }
  });
  
  //Prepare gems
  window.score = 0;
  window.best = window.localStorage.getItem('best-score');
  
  Gem.spawn(grid, player.pos);
  game.on('gem-collect', function(evt) {
    Gem.spawn(grid, player.pos);
    score += evt.score;
    
    if (score > best) {
      window.localStorage.setItem('best-score', score);
    }
  });
  
  game.on('render-last', function(evt) {
    Render.context = evt.context;
    Render.context.fillStyle = 'white';
    Render.context.textAlign = 'left';
    Render.context.textBaseline = 'middle';
    Render.context.font = '32px IdealGarbanzo';
    Render.context.textAlign = 'left';
    Render.context.fillText(score, 8, 12);
    if (best || score) {
      Render.context.textAlign = 'right';
      Render.context.fillText(best >= score ?
        'BEST: ' + best : 'NEW BEST',
        canvas.width - 8, 12);
    }
  });
  
  game.create(Colors, grid);
  
  game.on('player-died', function() {
    window.setTimeout(function() {
      document.getElementById('gameover').style.display = '';
      window.addEventListener('keypress', function(evt) {
        evt.preventDefault();
        window.location.reload();
      });
    }, 1000);
  });
  
  //Fire it up
  game.render();
};
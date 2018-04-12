/// game.js
//Wrap the engine and define game specific interactions

var Random = require('random-js');

var Vector2 = require('../engine/vector2').default;
var Engine = require('../engine/engine');
var Input = require('../engine/input');

var Grid = require('./grid');
var Collide = require('./collide');
var Colors = require('./colors').Screen;
var Pathfind = require('./pathfind');
var Player = require('./player');
var Enemy = require('./enemy');
var Gem = require('./gem');
var Score = require('./score');

module.exports = class Game extends Engine {
  constructor(config) {
    super(config);
    
    this.randomSeed = config.seed !== undefined ? config.seed
      : Random().integer(-Math.pow(2, 53), Math.pow(2, 53));
    this.randomEngine = Random.engines.mt19937().seed(this.randomSeed);
    this.random = new Random(this.randomEngine);
    
    this.input = new Input.InputQueued([
      new Input.InputKeyboard({
        'KeyW': 'up',
        'KeyA': 'left',
        'KeyS': 'down',
        'KeyD': 'right',
        
        'ArrowUp': 'up',
        'ArrowDown': 'down',
        'ArrowLeft': 'left',
        'ArrowRight': 'right',
        
        'Space': 'action'
      }),
      new Input.InputSwipe(this.canvas, [
        'right', null, 'down', null,
        'left', null, 'up', null
      ], 'action'),
    ]);
    this.input.on('command', function(evt) {
      if (this.commandCheck(evt.data.command) && !this.locked) {
        this.update(evt.data.command);
      }
    }.bind(this));
    
    this.animInterval = window.setInterval(function() {
      this.emit('anim-idle');
    }.bind(this), 1000);
    
    //Objects which exist for the life of the game
    
    this.collide = this.create(Collide);
    
    var grid = this.grid = this.create(Grid, {
      cellSize: new Vector2(16),
      gridSize: new Vector2(29, 18)
    });
    
    this.create(Colors, { grid: grid });
    this.create(Score, { grid: grid });
    
    //Create the player and fill in the grid
    
    var player = this.create(Player, {
      grid: grid, pos: grid.gridSize.minus(1).multiply(0.5).round()
    });
    
    for (let i = 0; i < grid.gridSize.x; ++i) {
      for (let j = 0; j < grid.gridSize.y; ++j) {
        grid.setBlock(new Vector2(i, j), true);
        
        if (Math.abs(i - player.pos.x) <= 6) {
          if (Math.abs(j - player.pos.y) <= 4) {
            grid.setBlock(new Vector2(i, j), false);
          }
        }
      }
    }
    
    //Enemy spawning and AI
    
    var pathfind = this.create(Pathfind, { grid: grid });
    
    function enemyAI(pos) {
      if (player.active) {
        var choices = pathfind.getNextChoices(pos, player.pos);
        return this.game.random.pick(choices).minus(pos);
      } else {
        return Random.pick([
          new Vector2(-1, 0), new Vector2(1, 0),
          new Vector2(0, -1), new Vector2(0, 1)
        ]);
      }
    }
    
    this.on('grid-change', function(evt) {
      if (evt.data.from && !evt.data.to && evt.data.cause !== 'gem') {
        Enemy.spawn(this, grid, player.pos, enemyAI);
      }
    }, this);
    
    //Check if something should collapse
    
    this.on('update', function(evt) {
      var distances = pathfind.generateDistanceField(player.pos);
      for (let i = 0; i < grid.gridSize.x; ++i) {
        for (let j = 0; j < grid.gridSize.y; ++j) {
          var pos = new Vector2(i, j);
          if (!grid.getBlock(pos) && !Number.isFinite(distances[i][j])) {
            var hit = this.collide.get(pos);
            if (hit && hit.hurt) {
              hit.hurt({
                pos: pos,
                cause: 'grid',
                delay: 0.4
              });
            }
            grid.setBlock(pos, true, 0.4);
          }
        }
      }
    }, this, 100);
    
    //Gem spawning
    
    this.on('gem-collect', function(evt) {
      Gem.spawn(this, grid, player.pos);
    }, this);
    
    Gem.spawn(this, grid, player.pos);
    
    //Scoring
    
    this.score = 0;
    this.best = config.best || 0;
    
    this.on('score', function(evt) {
      this.score += evt.data.score;
    }, this);
    
    this.on('render', function(evt) {
      evt.data.context.fillStyle = 'white';
      evt.data.context.textAlign = 'left';
      evt.data.context.textBaseline = 'middle';
      evt.data.context.font = '32px IdealGarbanzo';
      evt.data.context.textAlign = 'left';
      evt.data.context.fillText(this.score, 8, 12);
      if (this.best || this.score) {
        evt.data.context.textAlign = 'right';
        evt.data.context.fillText(
          this.best >= this.score ? 'BEST: ' + this.best : 'NEW BEST',
          this.canvas.width - 7, 12);
      }
    }, this, 900);
  }
  
  //Cleanup
  
  destructor() {
    this.input && this.input.destructor();
    clearInterval(this.animInterval);
    super.destructor();
  }
};
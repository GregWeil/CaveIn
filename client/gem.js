/// gem.js
//A pickup that gives a point

var Random = require('random-js')();

var Vector2 = require('./vector2.js');
var Render = require('./render.js');

var BaseObject = require('./object.js');

var dimensions = new Vector2(16);
var spritesheetOld = document.getElementById('spritesheet');
var spritesheet = document.getElementById('spritesheet-gems');

Render.addSprite('gem-a-a', spritesheetOld, dimensions.multiply(0, 1),
  dimensions, dimensions.multiply(0.5));
Render.addSprite('gem-a-b', spritesheetOld, dimensions.multiply(1, 1),
  dimensions, dimensions.multiply(0.5));

Render.addSprite('gem-b-a', spritesheet, dimensions.multiply(0, 0),
  dimensions, dimensions.multiply(0.5));
Render.addSprite('gem-b-b', spritesheet, dimensions.multiply(1, 0),
  dimensions, dimensions.multiply(0.5));

Render.addSprite('gem-c-a', spritesheet, dimensions.multiply(0, 1),
  dimensions, dimensions.multiply(0.5));
Render.addSprite('gem-c-b', spritesheet, dimensions.multiply(1, 1),
  dimensions, dimensions.multiply(0.5));

var audioGem = 'https://cdn.gomix.com/e6f17913-09e8-449d-8798-e394b24f6eff%2Fgem.wav';

var gemTiers = [
  {
    score: 1,
    rangeAxis: 1,
    rangeManhattan: 2,
    sprites: ['gem-a-a', 'gem-a-b']
  },
  {
    score: 3,
    rangeAxis: 1,
    rangeManhattan: 1,
    sprites: ['gem-b-a', 'gem-b-b']
  },
  {
    score: 5,
    rangeAxis: 0,
    rangeManhattan: 0,
    sprites: ['gem-c-a', 'gem-c-b']
  }
];

module.exports = class Gem extends BaseObject {
  static spawn(grid, avoid) {
    var collisions = game.getCollisions();
    var count = Object.keys(collisions).length;
    var tier = 0;
    if (count <= 264 ) {
      tier = 2;
    } else if (count <= 393) {
      tier = 1;
    }
    
    var position = new Vector2();
    var distance = Infinity;
    var iterations = 0;
    while (iterations < 5) {
      var pos = new Vector2(
        Random.integer(0, grid.gridSize.x-1),
        Random.integer(0, grid.gridSize.y-1)
      );
      if (!grid.getBlock(pos)) continue;
      var dist = Math.abs(pos.minus(avoid).manhattan() - 15);
      if (dist < distance) {
        position = pos;
        distance = dist;
      }
      iterations += 1;
    }
    
    return game.create(Gem, grid, position, tier);
  }
  
  constructor(grid, pos, tier) {
    super();
    
    this.grid = grid;
    this.pos = pos;
    
    var base = gemTiers[tier];
    this.score = base.score;
    this.rangeAxis = base.rangeAxis;
    this.rangeManhattan = base.rangeManhattan;
    this.sprites = base.sprites;
    
    this.sprite = Random.integer(0, this.sprites.length - 1);
    
    this.grid.setBlock(this.pos, 'gem');
    
    this.handle(game, 'grid-change', this.check);
    
    this.handle(game, 'anim-idle', this.anim);
    this.handle(game, 'render', this.render);
  }
  
  check(evt) {
    if (evt.pos.equals(this.pos) && !evt.to) {
      this.collect();
    }
  }
  
  collect() {
    var collisions = game.getCollisions();
    var ra = this.rangeAxis;
    var rm = this.rangeManhattan;
    for (let i = -ra; i <= ra; ++i) {
      for (let j = -ra; j <= ra; ++j) {
        if (i === 0 && j === 0) continue;
        var pos = this.pos.plus(i, j);
        if (Vector2.new(i, j).manhattan() > rm) {
          continue;
        }
        var col = collisions[pos.hash()];
        if (col && col === this.grid) {
          this.grid.setBlock(pos, false, 0.1, 'gem');
        } else if (col && col.hurt) {
          col.hurt({ pos: pos, cause: 'gem' });
        }
      }
    }
    
    game.emit('gem-collect', {
      score: this.score
    });
    
    var audio = new Audio(audioGem);
    audio.volume = 1;
    audio.play();
    
    game.destroy(this);
  }
  
  anim(evt) {
    this.sprite = (this.sprite + 1) % this.sprites.length;
  }
  
  render(evt) {
    Render.context = evt.context;
    Render.sprite(this.sprites[this.sprite], this.grid.getPos(this.pos));
  }
};
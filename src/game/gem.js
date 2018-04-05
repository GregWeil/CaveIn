/// gem.js
//A pickup that gives a point

var Howl = require('howler').Howl;

var Vector2 = require('../engine/vector2').default;
var Render = require('../engine/render');
var BaseObject = require('../engine/object');
var Grid = require('./grid');

var dimensions = new Vector2(16);
var spritesheet = document.getElementById('spritesheet');

Render.addSprite('gem-a-a', spritesheet, dimensions, new Vector2(0, 1));
Render.addSprite('gem-a-b', spritesheet, dimensions, new Vector2(1, 1));

Render.addSprite('gem-b-a', spritesheet, dimensions, new Vector2(0, 5));
Render.addSprite('gem-b-b', spritesheet, dimensions, new Vector2(1, 5));

Render.addSprite('gem-c-a', spritesheet, dimensions, new Vector2(0, 6));
Render.addSprite('gem-c-b', spritesheet, dimensions, new Vector2(1, 6));

var audioGem = new Howl({ src: ['/assets/gem.wav'] });

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
  static spawn(game, grid, avoid) {
    var count = game.collide.count();
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
        game.random.integer(0, grid.gridSize.x-1),
        game.random.integer(0, grid.gridSize.y-1)
      );
      if (!game.collide.get(pos, { type: Grid })) continue;
      if (game.collide.get(pos, { ignore: [grid] })) continue;
      var dist = Math.abs(pos.minus(avoid).manhattan() - 15);
      if (dist < distance) {
        position = pos;
        distance = dist;
      }
      iterations += 1;
    }
    
    return game.create(Gem, {
      grid: grid,
      pos: position,
      tier: tier
    });
  }
  
  constructor(config) {
    super(config);
    
    this.grid = config.grid;
    this.pos = config.pos;
    
    //this.game.collide.add(this.pos, this);
    
    var base = gemTiers[config.tier];
    this.score = base.score;
    this.rangeAxis = base.rangeAxis;
    this.rangeManhattan = base.rangeManhattan;
    this.sprites = base.sprites;
    
    this.sprite = this.game.random.integer(0, this.sprites.length - 1);
    
    this.grid.setBlock(this.pos, 'gem');
    
    this.handle(this.game, 'update', this.check, 90);
    
    this.handle(this.game, 'anim-idle', this.anim);
    this.handle(this.game, 'render', this.render);
  }
  
  destroy(displayTime) {
    //this.game.collide.remove(this.pos, this);
    super.destroy(displayTime);
  }
  
  check(evt) {
    if (!this.grid.getBlock(this.pos)) {
      this.collect();
    }
  }
  
  collect() {
    var ra = this.rangeAxis;
    var rm = this.rangeManhattan;
    for (let i = -ra; i <= ra; ++i) {
      for (let j = -ra; j <= ra; ++j) {
        if (i === 0 && j === 0) continue;
        var pos = this.pos.plus(i, j);
        if (Vector2.new(i, j).manhattan() > rm) {
          continue;
        }
        var col = this.game.collide.get(pos);
        if (col && col === this.grid) {
          this.grid.setBlock(pos, false, 0.1, 'gem');
        } else if (col && col.hurt) {
          col.hurt({ pos: pos, cause: 'gem' });
        }
      }
    }
    
    this.game.emit('gem-collect');
    this.game.emit('score', {
      score: this.score,
      pos: this.pos
    });
    
    this.game.sound(audioGem);
    
    this.game.destroy(this, 0);
  }
  
  anim(evt) {
    this.sprite = (this.sprite + 1) % this.sprites.length;
  }
  
  render(evt) {
    Render.sprite(this.sprites[this.sprite], this.grid.getPos(this.pos));
  }
};
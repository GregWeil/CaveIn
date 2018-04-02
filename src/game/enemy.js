/// enemy.js
//Move at the player, kill on contact

var Howl = require('howler').Howl;

var Vector2 = require('../engine/vector2');
var Render = require('../engine/render');
var BaseObject = require('../engine/object');

var dimensions = new Vector2(16);
var spritesheet = document.getElementById('spritesheet');

var sprites = [
  Render.addSprite('enemy-a', spritesheet, dimensions, new Vector2(0, 2)),
  Render.addSprite('enemy-b', spritesheet, dimensions, new Vector2(1, 2))
];

var ghostSprites = [
  Render.addSprite('enemy-ghost-a', spritesheet, dimensions, new Vector2(0, 8)),
  Render.addSprite('enemy-ghost-b', spritesheet, dimensions, new Vector2(1, 8))
];

var audioStep = new Howl({ src: ['/assets/enemy_move.wav'] });
var audioStepRequests = 0;

class EnemyGhost extends BaseObject {
  constructor(config) {
    super(config);
    
    this.grid = config.grid,
    this.pos = config.pos;
    this.sprite = config.sprite;
    
    this.grid.setBlock(this.pos, 'ghost');
    this.game.collide.add(this.pos, this);
    
    this.handle(this.game, 'anim-idle', this.anim);
    this.handle(this.game, 'render', this.render);
  }
  
  destroy(displayTime) {
    this.game.collide.remove(this.pos, this);
    super.destroy(displayTime);
  }
  
  hurt(data) {
    if (this.pos.equals(data.pos)) {
      this.game.destroy(this, data.delay);
      data.hit = true;
    }
  }
  
  anim(evt) {
    this.sprite = (this.sprite + 1) % ghostSprites.length;
  }
  
  render(evt) {
    Render.sprite(ghostSprites[this.sprite], this.grid.getPos(this.pos));
  }
}

module.exports = class Enemy extends BaseObject {
  static spawn(game, grid, avoid, ai) {
    //Take the farthest accessible point
    var locations = [];
    var distance = -Infinity;
    for (var i = 0; i < grid.gridSize.x; ++i) {
      for (var j = 0; j < grid.gridSize.y; ++j) {
        var pos = new Vector2(i, j);
        if (!!game.collide.get(pos)) continue;
        var dist = pos.minus(avoid).manhattan();
        if (dist > distance) {
          locations = [pos];
          distance = dist;
        } else if (dist === distance) {
          locations.push(pos);
        }
      }
    }
    return game.create(Enemy, {
      grid: grid,
      pos: game.random.pick(locations),
      pathfind: ai
    });
  }
  
  constructor(config) {
    super(config);
    
    this.grid = config.grid;
    this.pos = config.pos.copy();
    this.posLast = this.pos.copy();
    this.movement = new Vector2();
    this.moveTimer = 1;
    this.ai = config.pathfind;
    
    this.game.collide.add(this.pos, this);
    
    this.sprite = this.game.random.integer(0, sprites.length - 1);
    
    this.handle(this.game, 'update', this.pathfind, -100);
    this.handle(this.game, 'update', this.update);
    this.handle(this.game, 'update', this.audio, 100);
    
    this.handle(this.game, 'anim-idle', this.anim);
    this.handle(this.game, 'render', this.render);
  }
  
  destroy(displayTime) {
    this.game.collide.remove(this.pos, this);
    super.destroy(displayTime);
  }
  
  pathfind(evt) {
    this.movement = new Vector2();
    if (this.moveTimer < 1) {
      this.moveTimer = 2;
      this.movement = this.ai(this.pos);
      var newPos = this.pos.plus(this.movement);
      if (!this.grid.accessible(newPos)) {
        this.movement = new Vector2();
      }
    }
    this.moveTimer -= 1;
  }
  
  update(evt) {
    //Pick a random direction to go
    this.posLast = this.pos.copy();
    var newPos = this.pos.plus(this.movement);
    if (this.grid.accessible(newPos)) {
      if (!this.game.collide.get(newPos, { type: Enemy })) {
        this.pos = newPos;
        audioStepRequests += 1;
        this.game.collide.move(this.posLast, this.pos, this);
      }
    }
  }
  
  hurt(data) {
    if (this.pos.equals(data.pos)) {
      if (data.cause !== 'gem') {
        this.grid.setBlock(this.pos, true, 0.3);
      }
      if (data.cause === 'grid') {
        this.game.create(EnemyGhost, {
          grid: this.grid,
          pos: this.pos,
          sprite: this.sprite
        });
      }
      this.game.destroy(this, data.delay);
    }
  }
  
  anim(evt) {
    this.sprite = (this.sprite + 1) % sprites.length;
  }
  
  audio(evt) {
    if (audioStepRequests > 0) {
      this.game.sound(audioStep, {
        volume: (1 - (1 / (audioStepRequests * 0.5 + 1)))
      });
      audioStepRequests = 0;
    }
  }
  
  render(evt) {
    Render.context = evt.data.context;
    var displayPos = this.pos;
    if (evt.data.time < 0.05) {
      displayPos = this.pos.plus(this.posLast).multiply(0.5);
    }
    Render.sprite(sprites[this.sprite], this.grid.getPos(displayPos));
  }
};
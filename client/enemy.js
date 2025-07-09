/// enemy.js
//Move at the player, kill on contact

var Random = require('random-js')();

var Vector2 = require('./vector2.js');
var Render = require('./render.js');

var BaseObject = require('./object.js');

var dimensions = new Vector2(16);
var spritesheet = document.getElementById('spritesheet');

Render.addSprite('enemy-a', spritesheet, dimensions.multiply(0, 2),
  dimensions, dimensions.multiply(0.5));
Render.addSprite('enemy-b', spritesheet, dimensions.multiply(1, 2),
  dimensions, dimensions.multiply(0.5));
var sprites = ['enemy-a', 'enemy-b'];

var audioStep = 'assets/enemy_move.wav';
var audioStepPool = [];
for (let i = 0; i < 4; ++i) {
  var audio = new Audio(audioStep);
  audio.volume = 0.3;
  audioStepPool.push(audio);
}

module.exports = class Enemy extends BaseObject {
  static spawn(grid, avoid, ai) {
    var instances = game.getCollisions();
    //Take the farthest accessible point
    var locations = [];
    var distance = -Infinity;
    for (var i = 0; i < grid.gridSize.x; ++i) {
      for (var j = 0; j < grid.gridSize.y; ++j) {
        var pos = new Vector2(i, j);
        if (!!instances[pos.hash()]) continue;
        var dist = pos.minus(avoid).manhattan();
        if (dist > distance) {
          locations = [pos];
          distance = dist;
        } else if (dist === distance) {
          locations.push(pos);
        }
      }
    }
    return game.create(Enemy, grid, Random.pick(locations), ai);
  }
  
  constructor(grid, pos, pathfind) {
    super();
    
    this.grid = grid;
    this.pos = pos;
    this.posLast = pos.copy();
    this.movement = new Vector2();
    this.moveTimer = 1;
    this.ai = pathfind;
    
    this.sprite = Random.integer(0, sprites.length - 1);
    
    this.handle(game, 'collision-check', this.collide);
    this.handle(game, 'update-first', this.pathfind);
    this.handle(game, 'update', this.update);
    
    this.handle(game, 'anim-idle', this.anim);
    this.handle(game, 'render', this.render);
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
      var collision = game.collisionCheck(newPos);
      if (!(collision instanceof Enemy)) {
        this.pos = newPos;
        Random.pick(audioStepPool).play();
      }
    }
  }
  
  collide(evt) {
    evt.instances[this.pos.hash()] = this;
  }
  
  hurt(evt) {
    if (this.pos.equals(evt.pos)) {
      if (evt.cause === 'player') {
        this.grid.setBlock(this.pos, true, 0.3);
      }
      game.destroy(this);
      evt.hit = true;
    }
  }
  
  anim(evt) {
    this.sprite = (this.sprite + 1) % sprites.length;
  }
  
  render(evt) {
    Render.context = evt.context;
    var displayPos = this.pos;
    if (evt.time < 0.05) {
      displayPos = this.pos.plus(this.posLast).multiply(0.5);
    }
    Render.sprite(sprites[this.sprite], this.grid.getPos(displayPos));
  }
};

/// player.js
//Time to get some interactivity

var Random = require('random-js')();

var Vector2 = require('./vector2.js');
var Render = require('./render.js');

var BaseObject = require('./object.js');

var Enemy = require('./enemy.js');

var dimensions = new Vector2(16);
var spritesheet = document.getElementById('spritesheet');

Render.addSprite('player-up', spritesheet, dimensions.multiply(1, 4),
  dimensions, dimensions.multiply(0.5));
Render.addSprite('player-down', spritesheet, dimensions.multiply(0, 3),
  dimensions, dimensions.multiply(0.5));
Render.addSprite('player-left', spritesheet, dimensions.multiply(1, 3),
  dimensions, dimensions.multiply(0.5));
Render.addSprite('player-right', spritesheet, dimensions.multiply(0, 4),
  dimensions, dimensions.multiply(0.5));

Render.addSprite('pickaxe-hit', spritesheet, dimensions.multiply(1, 0),
  dimensions, dimensions.multiply(0.5));
Render.addSprite('pickaxe-swing', spritesheet, dimensions.multiply(0, 0),
  dimensions, dimensions.multiply(0.5));

var audioStep = 'assets/move.wav';
var audioHit = 'assets/attack.wav';
var audioDie = 'assets/die.wav';

module.exports = class Player extends BaseObject {
  constructor(grid, pos) {
    super();
    
    this.grid = grid;
    this.pos = pos;
    this.posLast = pos.copy();
    this.facing = 'down';
    
    this.attacking = false;
    this.attackHit = false;
    
    this.handle(game, 'command-check', this.acceptCommand);
    
    this.handle(game, 'update-early', this.updateEarly);
    this.handle(game, 'update', this.update);
    this.handle(game, 'update-late', this.updateLate);
    
    this.handle(game, 'collision-check', this.collide);
    
    this.handle(game, 'render', this.render);
  }
  
  getFacingDirection() {
    switch (this.facing) {
      case 'up':
        return new Vector2(0, -1);
      case 'down':
        return new Vector2(0, 1);
      case 'left':
        return new Vector2(-1, 0);
      case 'right':
        return new Vector2(1, 0);
    }
    return new Vector2();
  }
  
  attack() {
    var hitPos = this.pos.plus(this.getFacingDirection());
    var hit = game.collisionCheck(hitPos);
    if (hit) {
      hit.hurt({
        pos: hitPos,
        cause: 'player'
      });
      this.attackHit = true;
      var audio = new Audio(audioHit);
      audio.volume = Random.real(0.3, 0.5, true);
      audio.play();
    }
  }
  
  hurt(evt) {
    if (evt.cause !== 'gem') {
      var audio = new Audio(audioDie);
      audio.volume = 0.5;
      audio.play();
      game.emit('player-died');
      game.destroy(this);
    }
  }
  
  collide(evt) {
    if (evt.data.source === this) return;
    evt.instances[this.pos.hash()] = this;
  }
  
  acceptCommand(evt) {
    if (['up', 'down', 'left', 'right', 'action'].indexOf(evt.command) >= 0) {
      evt.accept = true;
    }
  }
  
  updateEarly(evt) {
    this.attackHit = false;
    if (evt.command === 'action') {
      this.attack();
    }
  }
  
  update(evt) {
    this.moving = false;
    this.attacking = false;
    this.posLast = this.pos.copy();
    switch (evt.command) {
      case 'up':
      case 'down':
      case 'left':
      case 'right':
        this.facing = evt.command;
        this.pos = this.pos.plus(this.getFacingDirection());
        this.moving = true;
        break;
      case 'action':
        this.attacking = true;
        break;
    }
    if (this.moving) {
      if (!this.grid.accessible(this.pos)) {
        this.pos = this.posLast;
      } else {
        var audio = new Audio(audioStep);
        audio.volume = 0.3;
        audio.play();
      }
    }
  }
  
  updateLate(evt) {
    //If something else is on this space, get hurt
    if (game.collisionCheck(this.pos, { source: this })) {
      this.hurt({ cause: 'collision' });
    } else if (evt.command === 'action' && !this.attackHit) {
      this.attack();
    }
  }
  
  render(evt) {
    Render.context = evt.context;
    var displayPos = this.pos;
    if (evt.time < 0.05) {
      displayPos = displayPos.plus(this.posLast).multiply(0.5);
    }
    Render.sprite('player-'+this.facing, this.grid.getPos(displayPos));
    if (this.attacking && (evt.time < 0.3)) {
      Render.sprite((this.attackHit && evt.time < 0.1) ? 'pickaxe-hit' : 'pickaxe-swing',
        this.grid.getPos(displayPos.plus(this.getFacingDirection())),
        this.getFacingDirection().angle() - (Math.PI / 2));
    }
  }
};

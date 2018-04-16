/// player.js
//Time to get some interactivity

var Howl = require('howler').Howl;

var Vector2 = require('../engine/vector2').default;
var Render = require('../engine/render');
var BaseObject = require('../engine/object').default;

var Enemy = require('./enemy');

var dimensions = new Vector2(16);
var spritesheet = document.getElementById('spritesheet');

Render.addSprite('player-up', spritesheet, dimensions, new Vector2(1, 4));
Render.addSprite('player-down', spritesheet, dimensions, new Vector2(0, 3));
Render.addSprite('player-left', spritesheet, dimensions, new Vector2(1, 3));
Render.addSprite('player-right', spritesheet, dimensions, new Vector2(0, 4));

Render.addSprite('pickaxe-hit', spritesheet, dimensions, new Vector2(1, 0));
Render.addSprite('pickaxe-swing', spritesheet, dimensions, new Vector2(0, 0));

Render.addSprite('pickaxe-dark-hit', spritesheet, dimensions, new Vector2(1, 7));
Render.addSprite('pickaxe-dark-swing', spritesheet, dimensions, new Vector2(0, 7));

var audioStep = new Howl({ src: ['/assets/move.wav'] });
var audioHit = new Howl({ src: ['/assets/attack.wav'] });
var audioDie = new Howl({ volume: 0.5, src: ['/assets/die.wav'] });

module.exports = class Player extends BaseObject {
  constructor(config) {
    super(config);
    
    this.grid = config.grid;
    this.pos = config.pos;
    this.posLast = this.pos.copy();
    this.facing = 'down';
    
    this.game.collide.add(this.pos, this);
    
    this.attacking = false;
    this.attackHit = false;
    
    this.handle(this.game, 'command-check', this.acceptCommand);
    
    this.handle(this.game, 'update', this.updateEarly, -10);
    this.handle(this.game, 'update', this.update);
    this.handle(this.game, 'update', this.updateLate, 10);
    
    this.handle(this.game, 'render', this.render);
  }
  
  destroy(displayTime) {
    this.game.collide.remove(this.pos, this);
    super.destroy(displayTime);
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
    var hit = this.game.collide.get(hitPos);
    if (hit) {
      hit.hurt({
        pos: hitPos,
        cause: 'player'
      });
      this.attackHit = true;
      this.game.sound(audioHit, { volume: this.game.random.real(0.3, 0.5, true) });
    }
  }
  
  hurt(evt) {
    if (evt.cause !== 'gem') {
      this.game.sound(audioDie);
      this.game.emit('player-died');
      this.game.destroy(this);
    }
  }
  
  acceptCommand(evt) {
    if (['up', 'down', 'left', 'right', 'action'].includes(evt.data.command)) {
      evt.data.accept = true;
    }
  }
  
  updateEarly(evt) {
    this.attackHit = false;
    if (evt.data.command === 'action') {
      this.attack();
    }
  }
  
  update(evt) {
    this.moving = false;
    this.attacking = false;
    this.posLast = this.pos.copy();
    switch (evt.data.command) {
      case 'up':
      case 'down':
      case 'left':
      case 'right':
        this.facing = evt.data.command;
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
        this.game.sound(audioStep, { volume: this.game.random.real(0.3, 0.4, true) });
      }
    }
    this.game.collide.move(this.posLast, this.pos, this);
  }
  
  updateLate(evt) {
    //If something else is on this space, get hurt
    if (this.game.collide.get(this.pos, { ignore: [this] })) {
      this.hurt({ cause: 'collision' });
    } else if (evt.data.command === 'action' && !this.attackHit) {
      this.attack();
    }
  }
  
  render(evt) {
    var displayPos = this.pos;
    if (evt.data.time < 0.05) {
      displayPos = displayPos.plus(this.posLast).multiply(0.5);
    }
    Render.sprite(evt.data.context, 'player-'+this.facing, this.grid.getPos(displayPos));
    if (this.attacking && (evt.data.time < 0.3)) {
      var axePos = this.pos.plus(this.getFacingDirection());
      var dark = this.grid.getBlockVisible(axePos, evt.data.time) ? '-dark' : '';
      var swing = (this.attackHit && evt.data.time < 0.1) ? '-hit' : '-swing';
      Render.sprite(evt.data.context, 'pickaxe' + dark + swing,
        this.grid.getPos(displayPos.plus(this.getFacingDirection())),
        this.getFacingDirection().angle() - (Math.PI / 2));
    }
  }
};
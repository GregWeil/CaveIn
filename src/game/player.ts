/// player.ts
//Time to get some interactivity

import { Howl } from 'howler';

import Vector2 from '../engine/vector2';
import * as Render from '../engine/render';
import BaseObject from '../engine/object';
import { Event } from '../engine/events';

import Grid from './grid';
import Collide from './collide';
import Game from './game';
const Enemy = require('./enemy');

const dimensions = new Vector2(16);
const spritesheet = document.getElementById('spritesheet') as HTMLImageElement;

Render.addSprite('player-up', spritesheet, dimensions, new Vector2(1, 4));
Render.addSprite('player-down', spritesheet, dimensions, new Vector2(0, 3));
Render.addSprite('player-left', spritesheet, dimensions, new Vector2(1, 3));
Render.addSprite('player-right', spritesheet, dimensions, new Vector2(0, 4));

Render.addSprite('pickaxe-hit', spritesheet, dimensions, new Vector2(1, 0));
Render.addSprite('pickaxe-swing', spritesheet, dimensions, new Vector2(0, 0));

Render.addSprite('pickaxe-dark-hit', spritesheet, dimensions, new Vector2(1, 7));
Render.addSprite('pickaxe-dark-swing', spritesheet, dimensions, new Vector2(0, 7));

const audioStep = new Howl({ src: ['/assets/move.wav'] });
const audioHit = new Howl({ src: ['/assets/attack.wav'] });
const audioDie = new Howl({ volume: 0.5, src: ['/assets/die.wav'] });

export default class Player extends BaseObject {
  private collide: Collide;
  private grid: Grid;
  
  pos: Vector2;
  posLast: Vector2;
  facing: 'up'|'down'|'left'|'right';
  attacking: boolean;
  attackHit: boolean;
  
  constructor(game: Game, pos: Vector2) {
    super(game);
    
    this.collide = game.collide;
    this.grid = game.grid;
    
    this.pos = pos;
    this.posLast = this.pos.copy();
    this.facing = 'down';
    
    this.collide.add(this.pos, this);
    
    this.attacking = false;
    this.attackHit = false;
    
    this.handle(this.game, 'command-check', this.acceptCommand);
    
    this.handle(this.game, 'update', this.updateEarly, -10);
    this.handle(this.game, 'update', this.update);
    this.handle(this.game, 'update', this.updateLate, 10);
    
    this.handle(this.game, 'render', this.render);
  }
  
  destroy(displayTime: number) {
    this.collide.remove(this.pos, this);
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
    const hitPos = this.pos.plus(this.getFacingDirection());
    const hit = this.collide.get(hitPos);
    if (hit) {
      hit.hurt({
        pos: hitPos,
        cause: 'player'
      });
      this.attackHit = true;
      this.game.sound(audioHit, { volume: this.game.random.real(0.3, 0.5, true) });
    }
  }
  
  hurt(evt: { cause: string }) {
    if (evt.cause !== 'gem') {
      this.game.sound(audioDie);
      this.game.emit('player-died');
      this.game.destroy(this);
    }
  }
  
  acceptCommand(evt: Event) {
    if (['up', 'down', 'left', 'right', 'action'].includes(evt.data.command)) {
      evt.data.accept = true;
    }
  }
  
  updateEarly(evt: Event) {
    this.attackHit = false;
    if (evt.data.command === 'action') {
      this.attack();
    }
  }
  
  update(evt: Event) {
    let moving = false;
    this.attacking = false;
    this.posLast = this.pos.copy();
    switch (evt.data.command) {
      case 'up':
      case 'down':
      case 'left':
      case 'right':
        this.facing = evt.data.command;
        this.pos = this.pos.plus(this.getFacingDirection());
        moving = true;
        break;
      case 'action':
        this.attacking = true;
        break;
    }
    if (moving) {
      if (!this.grid.accessible(this.pos)) {
        this.pos = this.posLast;
      } else {
        this.game.sound(audioStep, { volume: this.game.random.real(0.3, 0.4, true) });
      }
    }
    this.collide.move(this.posLast, this.pos, this);
  }
  
  updateLate(evt: Event) {
    //If something else is on this space, get hurt
    if (this.collide.get(this.pos, { ignore: [this] })) {
      this.hurt({ cause: 'collision' });
    } else if (evt.data.command === 'action' && !this.attackHit) {
      this.attack();
    }
  }
  
  render(evt: Event) {
    let displayPos = this.pos;
    if (evt.data.time < 0.05) {
      displayPos = displayPos.plus(this.posLast).multiply(0.5);
    }
    Render.sprite(evt.data.context, `player-${this.facing}`, this.grid.getPos(displayPos));
    if (this.attacking && (evt.data.time < 0.3)) {
      const axePos = this.pos.plus(this.getFacingDirection());
      const dark = this.grid.getBlockVisible(axePos, evt.data.time) ? '-dark' : '';
      const swing = (this.attackHit && evt.data.time < 0.1) ? '-hit' : '-swing';
      Render.sprite(evt.data.context, 'pickaxe' + dark + swing,
        this.grid.getPos(displayPos.plus(this.getFacingDirection())),
        this.getFacingDirection().angle() - (Math.PI / 2));
    }
  }
};
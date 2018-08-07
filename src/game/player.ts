/// player.ts
//Time to get some interactivity

import { Howl } from 'howler';

import Vector2 from '../engine/vector2';
import * as Render from '../engine/render';
import BaseObject from '../engine/object';

import Game from './game';

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

export default class Player extends BaseObject<Game> {
  pos: Vector2;
  posLast: Vector2;
  facing: 'up'|'down'|'left'|'right';
  attacking: boolean;
  attackHit: boolean;
  
  constructor(game: Game, pos: Vector2) {
    super(game);
    
    this.pos = pos;
    this.posLast = this.pos.copy();
    this.facing = 'down';
    
    this.game.collide.add(this.pos, this);
    
    this.attacking = false;
    this.attackHit = false;
    
    this.listen(this.game.onCommandCheck, evt => this.acceptCommand(evt.data));
    
    this.listen(this.game.onUpdate, evt => this.updateEarly(evt.data.command), -10);
    this.listen(this.game.onUpdate, evt => this.update(evt.data.command));
    this.listen(this.game.onUpdate, evt => this.updateLate(evt.data.command), 10);
    
    this.listen(this.game.onRender, evt => this.render(evt.data.context, evt.data.time));
  }
  
  destroy(displayTime: number) {
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
    const hitPos = this.pos.plus(this.getFacingDirection());
    const hit = this.game.collide.get(hitPos);
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
      this.game.onPlayerDied.emit(null);
      this.game.destroy(this);
    }
  }
  
  acceptCommand(data: { command: string, accept: boolean }) {
    if (['up', 'down', 'left', 'right', 'action'].includes(data.command)) {
      data.accept = true;
    }
  }
  
  updateEarly(command: string) {
    this.attackHit = false;
    if (command === 'action') {
      this.attack();
    }
  }
  
  update(command: string) {
    let moving = false;
    this.attacking = false;
    this.posLast = this.pos.copy();
    switch (command) {
      case 'up':
      case 'down':
      case 'left':
      case 'right':
        this.facing = command;
        this.pos = this.pos.plus(this.getFacingDirection());
        moving = true;
        break;
      case 'action':
        this.attacking = true;
        break;
    }
    if (moving) {
      if (!this.game.grid.accessible(this.pos)) {
        this.pos = this.posLast;
      } else {
        this.game.sound(audioStep, { volume: this.game.random.real(0.3, 0.4, true) });
      }
    }
    this.game.collide.move(this.posLast, this.pos, this);
  }
  
  updateLate(command: string) {
    //If something else is on this space, get hurt
    if (this.game.collide.get(this.pos, { ignore: [this] })) {
      this.hurt({ cause: 'collision' });
    } else if (command === 'action' && !this.attackHit) {
      this.attack();
    }
  }
  
  render(context: CanvasRenderingContext2D, time: number) {
    let displayPos = this.pos;
    if (time < 0.05) {
      displayPos = displayPos.plus(this.posLast).multiply(0.5);
    }
    Render.sprite(context, `player-${this.facing}`, this.game.grid.getPos(displayPos));
    if (this.attacking && (time < 0.3)) {
      const axePos = this.pos.plus(this.getFacingDirection());
      const dark = this.game.grid.getBlockVisible(axePos, time) ? '-dark' : '';
      const swing = (this.attackHit && time < 0.1) ? '-hit' : '-swing';
      Render.sprite(context, 'pickaxe' + dark + swing,
        this.game.grid.getPos(displayPos.plus(this.getFacingDirection())),
        this.getFacingDirection().angle() - (Math.PI / 2));
    }
  }
};
/// enemy.ts
//Move at the player, kill on contact

import { Howl } from 'howler';

import Vector2 from '../engine/vector2';
import * as Render from '../engine/render';
import BaseObject from '../engine/object';
import { Event } from '../engine/events';
import Game from './game';

const dimensions = new Vector2(16);
const spritesheet = document.getElementById('spritesheet') as HTMLImageElement;

const sprites = [
  Render.addSprite('enemy-a', spritesheet, dimensions, new Vector2(0, 2)),
  Render.addSprite('enemy-b', spritesheet, dimensions, new Vector2(1, 2))
];

const ghostSprites = [
  Render.addSprite('enemy-ghost-a', spritesheet, dimensions, new Vector2(0, 8)),
  Render.addSprite('enemy-ghost-b', spritesheet, dimensions, new Vector2(1, 8))
];

const audioStep = new Howl({ src: ['/assets/enemy_move.wav'] });
let audioStepRequests = 0;

class EnemyGhost extends BaseObject<Game> {
  private pos: Vector2;
  private sprite: number;
  
  constructor(game: Game, pos: Vector2, sprite: number) {
    super(game);
    
    this.pos = pos;
    this.sprite = sprite;
    
    this.game.grid.setBlock(this.pos, 'ghost');
    this.game.collide.add(this.pos, this);
    
    this.handle(this.game, 'anim-idle', this.anim);
    this.listen(this.game.onRender, evt => this.render(evt.data.context));
  }
  
  destroy(displayTime: number) {
    this.game.collide.remove(this.pos, this);
    super.destroy(displayTime);
  }
  
  hurt(data: { pos: Vector2, delay?: number, hit?: boolean }) {
    if (this.pos.equals(data.pos)) {
      this.game.destroy(this, data.delay||0);
      data.hit = true;
    }
  }
  
  anim(evt: Event) {
    this.sprite = (this.sprite + 1) % ghostSprites.length;
  }
  
  render(context: CanvasRenderingContext2D) {
    Render.sprite(context, ghostSprites[this.sprite], this.game.grid.getPos(this.pos));
  }
}

interface Pathfinder {
  (pos: Vector2): Vector2;
}

export default class Enemy extends BaseObject<Game> {
  static spawn(game: Game, avoid: Vector2, ai: Pathfinder) {
    //Take the farthest accessible point
    let locations: Vector2[] = [];
    let distance = -Infinity;
    for (let i = 0; i < game.grid.gridSize.x; ++i) {
      for (let j = 0; j < game.grid.gridSize.y; ++j) {
        const pos = new Vector2(i, j);
        if (!!game.collide.get(pos)) continue;
        const dist = pos.minus(avoid).manhattan();
        if (dist > distance) {
          locations = [pos];
          distance = dist;
        } else if (dist === distance) {
          locations.push(pos);
        }
      }
    }
    const pos = game.random.pick(locations);
    return game.create(Enemy, pos, ai);
  }
  
  private pos: Vector2;
  private posLast: Vector2;
  private movement: Vector2;
  private moveTimer: number;
  private ai: Pathfinder;
  
  private sprite: number;
  
  constructor(game: Game, pos: Vector2, pathfind: Pathfinder) {
    super(game);
    
    this.pos = pos.copy();
    this.posLast = this.pos.copy();
    this.movement = new Vector2();
    this.moveTimer = 1;
    this.ai = pathfind;
    
    this.game.collide.add(this.pos, this);
    
    this.sprite = this.game.random.integer(0, sprites.length - 1);
    
    this.listen(this.game.onUpdate, evt => this.pathfind(), -100);
    this.listen(this.game.onUpdate, evt => this.update());
    this.listen(this.game.onUpdate, evt => this.audio(), 100);
    
    this.handle(this.game, 'anim-idle', this.anim);
    this.listen(this.game.onRender, evt => this.render(evt.data.context, evt.data.time));
  }
  
  destroy(displayTime: number) {
    this.game.collide.remove(this.pos, this);
    super.destroy(displayTime);
  }
  
  pathfind() {
    this.movement = new Vector2();
    if (this.moveTimer < 1) {
      this.moveTimer = 2;
      this.movement = this.ai(this.pos);
      const newPos = this.pos.plus(this.movement);
      if (!this.game.grid.accessible(newPos)) {
        this.movement = new Vector2();
      }
    }
    this.moveTimer -= 1;
  }
  
  update() {
    //Pick a random direction to go
    this.posLast = this.pos.copy();
    const newPos = this.pos.plus(this.movement);
    if (this.game.grid.accessible(newPos)) {
      if (!this.game.collide.get(newPos, { type: Enemy })) {
        this.pos = newPos;
        audioStepRequests += 1;
        this.game.collide.move(this.posLast, this.pos, this);
      }
    }
  }
  
  hurt(data: { pos: Vector2, cause: string, delay?: number }) {
    if (this.pos.equals(data.pos)) {
      if (data.cause !== 'gem') {
        this.game.grid.setBlock(this.pos, true, 0.3);
      }
      if (data.cause === 'grid') {
        this.game.create(EnemyGhost, this.pos, this.sprite);
      }
      this.game.destroy(this, data.delay||0);
    }
  }
  
  anim(evt: Event) {
    this.sprite = (this.sprite + 1) % sprites.length;
  }
  
  audio() {
    if (audioStepRequests > 0) {
      this.game.sound(audioStep, {
        volume: (1 - (1 / (audioStepRequests * 0.5 + 1)))
      });
      audioStepRequests = 0;
    }
  }
  
  render(context: CanvasRenderingContext2D, time: number) {
    var displayPos = this.pos;
    if (time < 0.05) {
      displayPos = this.pos.plus(this.posLast).multiply(0.5);
    }
    Render.sprite(context, sprites[this.sprite], this.game.grid.getPos(displayPos));
  }
};
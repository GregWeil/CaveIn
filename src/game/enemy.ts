/// enemy.ts
//Move at the player, kill on contact

import { Howl } from 'howler';

import Vector2 from '../engine/vector2';
import * as Render from '../engine/render';
import BaseObject from '../engine/object';
import { Event } from '../engine/events';

import Game from './game';
import Grid from './grid';
import Collide from './collide';

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
  private grid: Grid;
  private collide: Collide;
  
  pos: Vector2;
  sprite: number;
  
  constructor(game: Game, pos: Vector2, sprite: number) {
    super(game);
    
    this.grid = game.grid;
    this.collide = game.collide;
    
    this.pos = pos;
    this.sprite = sprite;
    
    this.grid.setBlock(this.pos, 'ghost');
    this.collide.add(this.pos, this);
    
    this.handle(this.game, 'anim-idle', this.anim);
    this.handle(this.game, 'render', this.render);
  }
  
  destroy(displayTime: number) {
    this.collide.remove(this.pos, this);
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
  
  render(evt: Event) {
    Render.sprite(evt.data.context, ghostSprites[this.sprite], this.grid.getPos(this.pos));
  }
}

export default class Enemy extends BaseObject<Game> {
  static spawn(game: Game, avoid: Vector2, ai: any) {
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
  
  private storedGame: Game;
  private grid: Grid;
  private collide: Collide;
  
  pos: Vector2;
  posLast: Vector2;
  movement: Vector2;
  moveTimer: number;
  ai: any;
  
  sprite: number;
  
  constructor(game: Game, pos: Vector2, pathfind: any) {
    super(game);
    
    this.storedGame = game;
    this.grid = game.grid;
    this.collide = game.collide;
    
    this.pos = pos.copy();
    this.posLast = this.pos.copy();
    this.movement = new Vector2();
    this.moveTimer = 1;
    this.ai = pathfind;
    
    this.collide.add(this.pos, this);
    
    this.sprite = this.game.random.integer(0, sprites.length - 1);
    
    this.handle(this.game, 'update', this.pathfind, -100);
    this.handle(this.game, 'update', this.update);
    this.handle(this.game, 'update', this.audio, 100);
    
    this.handle(this.game, 'anim-idle', this.anim);
    this.handle(this.game, 'render', this.render);
  }
  
  destroy(displayTime: number) {
    this.collide.remove(this.pos, this);
    super.destroy(displayTime);
  }
  
  pathfind(evt: Event) {
    this.movement = new Vector2();
    if (this.moveTimer < 1) {
      this.moveTimer = 2;
      this.movement = this.ai(this.pos);
      const newPos = this.pos.plus(this.movement);
      if (!this.grid.accessible(newPos)) {
        this.movement = new Vector2();
      }
    }
    this.moveTimer -= 1;
  }
  
  update(evt: Event) {
    //Pick a random direction to go
    this.posLast = this.pos.copy();
    const newPos = this.pos.plus(this.movement);
    if (this.grid.accessible(newPos)) {
      if (!this.collide.get(newPos, { type: Enemy })) {
        this.pos = newPos;
        audioStepRequests += 1;
        this.collide.move(this.posLast, this.pos, this);
      }
    }
  }
  
  hurt(data: { pos: Vector2, cause: string, delay?: number }) {
    if (this.pos.equals(data.pos)) {
      if (data.cause !== 'gem') {
        this.grid.setBlock(this.pos, true, 0.3);
      }
      if (data.cause === 'grid') {
        this.storedGame.create(EnemyGhost, this.pos, this.sprite);
      }
      this.game.destroy(this, data.delay||0);
    }
  }
  
  anim(evt: Event) {
    this.sprite = (this.sprite + 1) % sprites.length;
  }
  
  audio(evt: Event) {
    if (audioStepRequests > 0) {
      this.game.sound(audioStep, {
        volume: (1 - (1 / (audioStepRequests * 0.5 + 1)))
      });
      audioStepRequests = 0;
    }
  }
  
  render(evt: Event) {
    var displayPos = this.pos;
    if (evt.data.time < 0.05) {
      displayPos = this.pos.plus(this.posLast).multiply(0.5);
    }
    Render.sprite(evt.data.context, sprites[this.sprite], this.grid.getPos(displayPos));
  }
};
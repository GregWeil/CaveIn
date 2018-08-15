/// gem.ts
//A pickup that gives a point

import { Howl } from 'howler';

import Vector2 from '../engine/vector2';
import * as Render from '../engine/render';
import BaseObject from '../engine/object';
import Grid from './grid';
import Game from './game';

const dimensions = new Vector2(16);
const spritesheet = document.getElementById('spritesheet') as HTMLImageElement;

Render.addSprite('gem-a-a', spritesheet, dimensions, new Vector2(0, 1));
Render.addSprite('gem-a-b', spritesheet, dimensions, new Vector2(1, 1));

Render.addSprite('gem-b-a', spritesheet, dimensions, new Vector2(0, 5));
Render.addSprite('gem-b-b', spritesheet, dimensions, new Vector2(1, 5));

Render.addSprite('gem-c-a', spritesheet, dimensions, new Vector2(0, 6));
Render.addSprite('gem-c-b', spritesheet, dimensions, new Vector2(1, 6));

const audioGem = new Howl({ src: ['/assets/gem.wav'] });

interface GemTier {
  score: number;
  rangeAxis: number;
  rangeManhattan: number;
  sprites: [string, string];
}

const gemTiers: GemTier[] = [
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

export default class Gem extends BaseObject<Game> {
  static spawn(game: Game, avoid: Vector2) {
    const count = game.collide.count();
    let tier = 0;
    if (count <= 264 ) {
      tier = 2;
    } else if (count <= 393) {
      tier = 1;
    }
    
    let position = new Vector2();
    let distance = Infinity;
    let iterations = 0;
    while (iterations < 5) {
      const pos = new Vector2(
        game.random.integer(0, game.grid.gridSize.x-1),
        game.random.integer(0, game.grid.gridSize.y-1)
      );
      if (!game.collide.get(pos, { type: Grid })) continue;
      if (game.collide.get(pos, { ignore: [game.grid] })) continue;
      const dist = Math.abs(pos.minus(avoid).manhattan() - 15);
      if (dist < distance) {
        position = pos;
        distance = dist;
      }
      iterations += 1;
    }
    
    return game.create(Gem, position, tier);
  }
  
  pos: Vector2;
  sprite: number;
  
  score: number;
  rangeAxis: number;
  rangeManhattan: number;
  sprites: [string, string];
  
  constructor(game: Game, pos: Vector2, tier: number) {
    super(game);
    
    this.pos = pos;
    
    const base = gemTiers[tier];
    this.score = base.score;
    this.rangeAxis = base.rangeAxis;
    this.rangeManhattan = base.rangeManhattan;
    this.sprites = base.sprites;
    
    this.sprite = this.game.random.integer(0, this.sprites.length - 1);
    
    this.game.grid.setBlock(this.pos, 'gem');
    
    this.listen(this.game.onUpdate, evt => this.check(), 90);
    
    this.listen(this.game.onAnimIdle, evt => this.anim());
    this.listen(this.game.onRender, evt => this.render(evt.data.context));
  }
  
  check() {
    if (!this.game.grid.getBlock(this.pos)) {
      this.collect();
    }
  }
  
  collect() {
    const ra = this.rangeAxis;
    const rm = this.rangeManhattan;
    for (let i = -ra; i <= ra; ++i) {
      for (let j = -ra; j <= ra; ++j) {
        if (i === 0 && j === 0) continue;
        const pos = this.pos.plus(i, j);
        if (Vector2.new(i, j).manhattan() > rm) {
          continue;
        }
        const col = this.game.collide.get(pos);
        if (col && col === this.game.grid) {
          this.game.grid.setBlock(pos, false, 0.1, 'gem');
        } else if (col && col.hurt) {
          col.hurt({ pos: pos, cause: 'gem' });
        }
      }
    }
    
    this.game.onGemCollect.emit(null);
    this.game.onScore.emit({
      score: this.score,
      pos: this.pos
    });
    
    this.game.sound(audioGem);
    
    this.game.destroy(this, 0);
  }
  
  anim() {
    this.sprite = (this.sprite + 1) % this.sprites.length;
  }
  
  render(context: CanvasRenderingContext2D) {
    Render.sprite(context, this.sprites[this.sprite], this.game.grid.getPos(this.pos));
  }
};
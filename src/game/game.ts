/// game.ts
//Wrap the engine and define game specific interactions

import Vector2 from '../engine/vector2';
import Engine from '../engine/engine';
import { Emitter } from '../engine/events';
import * as Input from '../engine/input';

import Grid from './grid';
import Collide from './collide';
import { ScreenColors } from './colors';
import Pathfind from './pathfind';
import Player from './player';
import Enemy from './enemy';
import Gem from './gem';
import Score from './score';

export default class Game extends Engine {
  score: number;
  best: number;
  
  collide: any;
  grid: any;
  
  private animInterval: number;
  
  onAnimIdle: Emitter<null>;
  onGridChange: Emitter<{pos: Vector2, from: any, to: any, cause: string}>;
  onGemCollect: Emitter<null>;
  onScore: Emitter<{score: number, pos: Vector2}>;
  onPlayerDied: Emitter<null>;
  
  constructor(config: any) {
    super(config);
    
    const random = this.random;
    
    this.onAnimIdle = new Emitter();
    this.onGridChange = new Emitter();
    this.onGemCollect = new Emitter();
    this.onScore = new Emitter();
    this.onPlayerDied = new Emitter();
    
    this.animInterval = window.setInterval(() => {
      this.onAnimIdle.emit(null);
    }, 1000);
    
    //Objects which exist for the life of the game
    
    this.collide = this.create(Collide);
    
    this.grid = this.create(Grid, new Vector2(16), new Vector2(29, 18), new Vector2(this.canvas.width, this.canvas.height));
    
    this.create(ScreenColors);
    this.create(Score);
    
    //Create the player and fill in the grid
    
    const player = this.create(Player,
      this.grid.gridSize.minus(1).multiply(0.5).round()
    ) as any;
    
    for (let i = 0; i < this.grid.gridSize.x; ++i) {
      for (let j = 0; j < this.grid.gridSize.y; ++j) {
        this.grid.setBlock(new Vector2(i, j), true);
        
        if (Math.abs(i - player.pos.x) <= 6) {
          if (Math.abs(j - player.pos.y) <= 4) {
            this.grid.setBlock(new Vector2(i, j), false);
          }
        }
      }
    }
    
    //Enemy spawning and AI
    
    const pathfind = this.create(Pathfind);
    
    function enemyAI(pos: Vector2) {
      if (player.active) {
        const choices = pathfind.getNextChoices(pos, player.pos);
        return random.pick(choices).minus(pos);
      } else {
        return random.pick([
          new Vector2(-1, 0), new Vector2(1, 0),
          new Vector2(0, -1), new Vector2(0, 1)
        ]);
      }
    }
    
    this.onGridChange.listen(evt => {
      if (evt.from && !evt.to && evt.cause !== 'gem') {
        Enemy.spawn(this, player.pos, enemyAI);
      }
    });
    
    //Check if something should collapse
    
    this.onUpdate.listen(evt => {
      const distances = pathfind.generateDistanceField(player.pos);
      for (let i = 0; i < this.grid.gridSize.x; ++i) {
        for (let j = 0; j < this.grid.gridSize.y; ++j) {
          const pos = new Vector2(i, j);
          if (!this.grid.getBlock(pos) && !Number.isFinite(distances[i][j])) {
            const hit = this.collide.get(pos);
            if (hit && hit.hurt) {
              hit.hurt({
                pos: pos,
                cause: 'grid',
                delay: 0.4
              });
            }
            this.grid.setBlock(pos, true, 0.4);
          }
        }
      }
    }, 100);
    
    //Gem spawning
    
    this.onGemCollect.listen(evt => {
      Gem.spawn(this, player.pos);
    });
    
    Gem.spawn(this, player.pos);
    
    //Scoring
    
    this.score = 0;
    this.best = config.best || 0;
    
    this.onScore.listen(evt => {
      this.score += evt.score;
    });
    
    this.onRender.listen(evt => {
      evt.context.fillStyle = 'white';
      evt.context.textAlign = 'left';
      evt.context.textBaseline = 'middle';
      evt.context.font = '32px IdealGarbanzo';
      evt.context.textAlign = 'left';
      evt.context.fillText(this.score.toString(), 8, 12);
      if (this.best || this.score) {
        evt.context.textAlign = 'right';
        evt.context.fillText(
          this.best >= this.score ? 'BEST: ' + this.best : 'NEW BEST',
          evt.context.canvas.width - 7, 12);
      }
    }, 900);
  }
  
  //Cleanup
  
  destructor() {
    clearInterval(this.animInterval);
    super.destructor();
  }
}
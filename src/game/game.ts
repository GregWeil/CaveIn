/// game.ts
//Wrap the engine and define game specific interactions

import Vector2 from '../engine/vector2';
import Engine from '../engine/engine';
import * as Input from '../engine/input';

const Grid = require('./grid');
import Collide from './collide';
import { ScreenColors } from './colors';
const Pathfind = require('./pathfind');
const Player = require('./player');
const Enemy = require('./enemy');
const Gem = require('./gem');
import Score from './score';

export default class Game extends Engine {
  score: number;
  best: number;
  
  collide: any;
  grid: any;
  
  private animInterval: number;
  
  constructor(config: any) {
    super(config);
    
    const random = this.random;
    
    this.animInterval = window.setInterval(() => {
      this.emit('anim-idle');
    }, 1000);
    
    //Objects which exist for the life of the game
    
    this.collide = this.create(Collide);
    
    this.grid = this.create(Grid, {
      collide: this.collide,
      cellSize: new Vector2(16),
      gridSize: new Vector2(29, 18)
    });
    
    this.create(ScreenColors);
    this.create(Score);
    
    //Create the player and fill in the grid
    
    const player = this.create(Player, {
      grid: this.grid, pos: this.grid.gridSize.minus(1).multiply(0.5).round()
    }) as any;
    
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
    
    const pathfind = this.create(Pathfind, { grid: this.grid }) as any;
    
    function enemyAI(pos: Vector2) {
      if (player.active) {
        const choices = pathfind.getNextChoices(pos, player.pos) as Vector2[];
        return random.pick(choices).minus(pos);
      } else {
        return random.pick([
          new Vector2(-1, 0), new Vector2(1, 0),
          new Vector2(0, -1), new Vector2(0, 1)
        ]);
      }
    }
    
    this.on('grid-change', evt => {
      if (evt.data.from && !evt.data.to && evt.data.cause !== 'gem') {
        Enemy.spawn(this, this.grid, player.pos, enemyAI);
      }
    });
    
    //Check if something should collapse
    
    this.on('update', evt => {
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
    }, this, 100);
    
    //Gem spawning
    
    this.on('gem-collect', evt => {
      Gem.spawn(this, this.grid, player.pos);
    });
    
    Gem.spawn(this, this.grid, player.pos);
    
    //Scoring
    
    this.score = 0;
    this.best = config.best || 0;
    
    this.on('score', evt => {
      this.score += evt.data.score;
    });
    
    this.on('render', evt => {
      evt.data.context.fillStyle = 'white';
      evt.data.context.textAlign = 'left';
      evt.data.context.textBaseline = 'middle';
      evt.data.context.font = '32px IdealGarbanzo';
      evt.data.context.textAlign = 'left';
      evt.data.context.fillText(this.score, 8, 12);
      if (this.best || this.score) {
        evt.data.context.textAlign = 'right';
        evt.data.context.fillText(
          this.best >= this.score ? 'BEST: ' + this.best : 'NEW BEST',
          this.canvas.width - 7, 12);
      }
    }, undefined, 900);
  }
  
  //Cleanup
  
  destructor() {
    clearInterval(this.animInterval);
    super.destructor();
  }
}
/// grid.ts
//Manage a play area grid, and track blocks

import Vector2 from '../engine/vector2';
import * as Render from '../engine/render';
import BaseObject from '../engine/object';
import Game from './game';

export default class Grid extends BaseObject<Game> {
  cellSize: Vector2;
  gridSize: Vector2;
  origin: Vector2;
  blocks: boolean[][];
  delayBlocks: { [key: number]: { [key: number]: number } };
  
  constructor(game: Game, cellSize: Vector2, gridSize: Vector2, canvasSize: Vector2) {
    super(game);
    
    this.cellSize = cellSize.copy();
    this.gridSize = gridSize.copy();
    
    //This centers it on the screen
    this.origin = canvasSize.minus(
      this.gridSize.minus(1).plus(0, -1).multiply(this.cellSize)
    ).multiply(0.5);
    
    this.blocks = [];
    for (let i = 0; i < this.gridSize.x; ++i) {
      this.blocks[i] = Array(this.gridSize.y).fill(false);
    }
    
    this.delayBlocks = {};
    
    this.listen(this.game.onUpdate, evt => this.clearDelayBlocks(), -Infinity);
    this.listen(this.game.onRender, evt => this.render(evt.context, evt.time), -100);
  }
  
  destroy(displayTime: number) {
    for (let i = 0; i < this.gridSize.x; ++i) {
      for (let j = 0; j < this.gridSize.y; ++j) {
        if (this.blocks[i][j]) {
          this.game.collide.remove(new Vector2(i, j), this);
        }
      }
    }
    super.destroy(displayTime);
  }
  
  inBounds(pos: Vector2) {
    if (pos.x < 0 || pos.x >= this.gridSize.x || pos.y < 0 || pos.y >= this.gridSize.y) {
      return false;
    }
    return true;
  }
  
  accessible(pos: Vector2) {
    if (!this.inBounds(pos)) {
      return false;
    } else if (!!this.getBlock(pos)) {
      return false;
    }
    return true;
  }
  
  getX(x: number): number {
    return (x * this.cellSize.x) + this.origin.x;
  }
  getY(y: number): number {
    return (y * this.cellSize.y) + this.origin.y;
  }
  getPos(a: Vector2): Vector2;
  getPos(a: number, b?: number): Vector2;
  getPos(a: Vector2|number, b?: number): Vector2 {
    if (a instanceof Vector2) {
      return this.cellSize.multiply(a).plus(this.origin);
    }
    return this.cellSize.multiply(a, b).plus(this.origin);
  }
  
  getBlock(pos: Vector2) {
    return this.inBounds(pos) ? this.blocks[pos.x][pos.y] : false;
  }
  setBlock(pos: Vector2, val: any, delay = 0, cause = '') {
    if (this.inBounds(pos)) {
      const newVal = (val || false);
      const oldVal = this.blocks[pos.x][pos.y];
      this.blocks[pos.x][pos.y] = newVal;
      
      if (newVal && !oldVal) {
        this.game.collide.add(pos, this, 1);
      } else if (oldVal && !newVal) {
        this.game.collide.remove(pos, this);
      }
      
      if (delay > 0) {
        if (!this.delayBlocks[pos.x]) {
          this.delayBlocks[pos.x] = {};
        }
        this.delayBlocks[pos.x][pos.y] = delay;
      }
      
      this.game.onGridChange.emit({
        cause: cause,
        pos: pos.copy(),
        from: oldVal,
        to: newVal
      });
    }
  }
  
  hurt(data: { pos: Vector2 }) {
    if (this.inBounds(data.pos)) {
      this.setBlock(data.pos, false, 0, 'hurt');
    }
  }
  
  clearDelayBlocks() {
    this.delayBlocks = {}
  }
  
  getBlockVisible(pos: Vector2, time: number) {
    let drawBlock = !!this.getBlock(pos);
    const delay = this.delayBlocks[pos.x] && this.delayBlocks[pos.x][pos.y];
    if (delay !== undefined && time < delay) {
      drawBlock = !drawBlock;
    }
    return drawBlock;
  }
  
  render(ctx: CanvasRenderingContext2D, time: number) {
    //Fill in background
    ctx.fillStyle = 'black';
    Render.rect(ctx, this.getPos(-0.5), this.gridSize.multiply(this.cellSize));
    
    //Fill in squares
    ctx.fillStyle = 'white';
    for (let i = 0; i < this.gridSize.x; ++i) {
      for (let j = 0; j < this.gridSize.y; ++j) {
        if (this.getBlockVisible(new Vector2(i, j), time)) {
          Render.rect(ctx, this.getPos(i, j).minus(this.cellSize.multiply(0.5)), this.cellSize);
        }
      }
    }
    
    if (false) {
      //Draw grid lines
      ctx.strokeStyle = '#eee';
      ctx.lineCap = 'square';
      ctx.lineWidth = 2;
      ctx.beginPath();
      
      for (let i = 1; i < this.gridSize.x; ++i) {
        Render.line(ctx, this.getPos(i-0.5, -0.5), this.getPos(i-0.5, this.gridSize.y-0.5));
      }
      
      for (let j = 1; j < this.gridSize.y; ++j) {
        Render.line(ctx, this.getPos(-0.5, j-0.5), this.getPos(this.gridSize.x-0.5, j-0.5));
      }
      
      ctx.stroke();
    }
  }
};
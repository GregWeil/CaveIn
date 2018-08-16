/// colors.ts
//Apply a color filter to the screen
//Either each cell is a color, or the whole screen is a color

import Vector2 from '../engine/vector2';
import * as Render from '../engine/render';
import BaseObject from '../engine/object';
import Game from './game';

const colors = [
  '#F00', '#0F0', '#06F', '#FF0', '#F0F', '#0FF',
  '#FFF', '#FFF', '#FFF', '#FFF', '#FFF', '#FFF'
];

export class GridColors extends BaseObject<Game> {
  private padding: number;
  private colors: string[][];
  
  constructor(game: Game) {
    super(game);
    
    this.padding = 2;
    
    this.colors = [];
    for (let i = -2 * this.padding; i < this.game.grid.gridSize.x; ++i) {
      const array = [];
      for (let j = -2 * this.padding; j < this.game.grid.gridSize.y; ++j) {
        array.push(this.game.random.pick(colors));
      }
      this.colors.push(array);
    }
    
    this.listen(this.game.onRender, evt => this.render(evt.context), 1000);
  }
  
  render(context: CanvasRenderingContext2D) {
    context.globalCompositeOperation = 'multiply';
    for (let i = -this.padding; i < this.game.grid.gridSize.x + this.padding; ++i) {
      for (let j = -this.padding; j < this.game.grid.gridSize.y + this.padding; ++j) {
        context.fillStyle = this.colors[i+this.padding][j+this.padding];
        const pos = this.game.grid.getPos(i, j).minus(this.game.grid.cellSize.multiply(0.5));
        Render.rect(context, pos, this.game.grid.cellSize);
      }
    }
    context.globalCompositeOperation = 'source-over';
  }
}

export class ScreenColors extends BaseObject<Game> {
  private color: string;
  
  constructor(game: Game) {
    super(game);
    
    this.color = this.game.random.pick(colors);
    
    this.listen(this.game.onRender, evt => this.render(evt.context), 1000);
  }
  
  render(context: CanvasRenderingContext2D) {
    context.globalCompositeOperation = 'multiply';
    context.fillStyle = this.color;
    Render.rect(context, new Vector2(),
      new Vector2(context.canvas.width, context.canvas.height)
    );
    context.globalCompositeOperation = 'source-over';
  }
}
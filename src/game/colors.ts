/// colors.ts
//Apply a color filter to the screen
//Either each cell is a color, or the whole screen is a color

import Vector2 from '../engine/vector2';
import * as Render from '../engine/render';
import BaseObject from '../engine/object';
import { Event } from '../engine/events';

const colors = [
  '#F00', '#0F0', '#06F', '#FF0', '#F0F', '#0FF',
  '#FFF', '#FFF', '#FFF', '#FFF', '#FFF', '#FFF'
];

export class GridColors extends BaseObject<any> {
  private grid: any;
  private padding: number;
  private colors: string[][];
  
  constructor(config: any) {
    super(config.game);
    
    this.grid = config.grid;
    
    this.padding = 2;
    
    this.colors = [];
    for (let i = -2 * this.padding; i < this.grid.gridSize.x; ++i) {
      var array = [];
      for (let j = -2 * this.padding; j < this.grid.gridSize.y; ++j) {
        array.push(this.game.random.pick(colors));
      }
      this.colors.push(array);
    }
    
    this.handle(this.game, 'render', this.render, 1000);
  }
  
  render(evt: Event) {
    evt.data.context.globalCompositeOperation = 'multiply';
    for (let i = -this.padding; i < this.grid.gridSize.x + this.padding; ++i) {
      for (let j = -this.padding; j < this.grid.gridSize.y + this.padding; ++j) {
        evt.data.context.fillStyle = this.colors[i+this.padding][j+this.padding];
        Render.rect(evt.data.context, this.grid.getPos(i, j).minus(this.grid.cellSize.multiply(0.5)), this.grid.cellSize);
      }
    }
    evt.data.context.globalCompositeOperation = 'source-over';
  }
}

export class ScreenColors extends BaseObject<any> {
  private color: string;
  
  constructor(config: any) {
    super(config.game);
    
    this.color = this.game.random.pick(colors);
    
    this.handle(this.game, 'render', this.render, 1000);
  }
  
  render(evt: Event) {
    evt.data.context.globalCompositeOperation = 'multiply';
    evt.data.context.fillStyle = this.color;
    Render.rect(evt.data.context, new Vector2(),
      new Vector2(evt.data.context.canvas.width, evt.data.context.canvas.height));
    evt.data.context.globalCompositeOperation = 'source-over';
  }
}
/// colors.js
//Make each grid cell a slightly different color

var Random = require('random-js')();

var Vector2 = require('./vector2.js');
var Render = require('./render.js');

var BaseObject = require('./object.js');

var colors = [
  '#F00', '#0F0', '#06F', '#FF0', '#F0F', '#0FF',
  '#FFF', '#FFF', '#FFF', '#FFF', '#FFF', '#FFF'
];

class GridColors extends BaseObject {
  constructor(grid) {
    super();
    
    this.grid = grid;
    
    this.padding = 2;
    
    this.colors = [];
    for (let i = -2 * this.padding; i < this.grid.gridSize.x; ++i) {
      var array = [];
      for (let j = -2 * this.padding; j < this.grid.gridSize.y; ++j) {
        array.push(Random.pick(colors));
      }
      this.colors.push(array);
    }
    
    this.handle(game, 'render-last', this.render);
  }
  
  render(evt) {
    Render.context = evt.context;
    Render.context.globalCompositeOperation = 'multiply';
    for (let i = -this.padding; i < this.grid.gridSize.x + this.padding; ++i) {
      for (let j = -this.padding; j < this.grid.gridSize.y + this.padding; ++j) {
        Render.context.fillStyle = this.colors[i+this.padding][j+this.padding];
        Render.rect(this.grid.getPos(i, j).minus(this.grid.cellSize.multiply(0.5)), this.grid.cellSize);
      }
    }
    Render.context.globalCompositeOperation = 'source-over';
  }
}

class ScreenColors extends BaseObject {
  constructor(grid) {
    super();
    
    this.color = Random.pick(colors);
    
    this.handle(game, 'render-last', this.render);
  }
  
  render(evt) {
    Render.context = evt.context;
    Render.context.globalCompositeOperation = 'multiply';
    Render.context.fillStyle = this.color;
    Render.rect(new Vector2(0, 0), new Vector2(
      Render.context.canvas.width, Render.context.canvas.height));
    Render.context.globalCompositeOperation = 'source-over';
  }
}

module.exports = ScreenColors;
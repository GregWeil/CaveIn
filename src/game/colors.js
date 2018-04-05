/// colors.js
//Apply a color filter to the screen
//Either each cell is a color, or the whole screen is a color

var Vector2 = require('../engine/vector2').default;
var Render = require('../engine/render');
var BaseObject = require('../engine/object');

var colors = [
  '#F00', '#0F0', '#06F', '#FF0', '#F0F', '#0FF',
  '#FFF', '#FFF', '#FFF', '#FFF', '#FFF', '#FFF'
];

class GridColors extends BaseObject {
  constructor(config) {
    super(config);
    
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
  
  render(evt) {
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
  constructor(config) {
    super(config);
    
    this.color = this.game.random.pick(colors);
    
    this.handle(this.game, 'render', this.render, 1000);
  }
  
  render(evt) {
    Render.context.globalCompositeOperation = 'multiply';
    Render.context.fillStyle = this.color;
    Render.rect(new Vector2(0, 0), new Vector2(
      Render.context.canvas.width, Render.context.canvas.height));
    Render.context.globalCompositeOperation = 'source-over';
  }
}

module.exports = {
  Grid: GridColors,
  Screen: ScreenColors
};
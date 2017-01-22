/// grid.js
//Grid utility functions

var _ = require('underscore');

var Vector2 = require('vector2.js');
var Render = require('render.js');
var BaseObject = require('object.js');

module.exports = class Grid extends BaseObject {
  constructor(config) {
    super(config);
    
    this.cellSize = config.cellSize.copy();
    this.gridSize = config.gridSize.copy();
    
    //This centers it on the screen
    this.origin = Vector2.new(this.game.canvas.width, this.game.canvas.height)
      .minus(this.gridSize.minus(1).plus(0, -1).multiply(this.cellSize)).multiply(0.5);
    
    this.blocks = [];
    for (let i = 0; i < this.gridSize.x; ++i) {
      this.blocks[i] = Array(this.gridSize.y).fill(false);
    }
    this.hashBlocks = {};
    
    this.delayBlocks = {};
    
    this.handle(this.game, 'collision-check', this.collide, -10);
    this.handle(this.game, 'update', this.update, -Infinity);
    this.handle(this.game, 'render', this.render, -100);
  }
  
  inBounds(pos) {
    if (pos.x < 0 || pos.x >= this.gridSize.x || pos.y < 0 || pos.y >= this.gridSize.y) {
      return false;
    }
    return true;
  }
  
  accessible(pos) {
    if (!this.inBounds(pos)) {
      return false;
    } else if (!!this.getBlock(pos)) {
      return false;
    }
    return true;
  }
  
  getX(x) {
    return (x * this.cellSize.x) + this.origin.x;
  }
  getY(y) {
    return (y * this.cellSize.y) + this.origin.y;
  }
  getPos(a, b) {
    return this.cellSize.multiply(a, b).plus(this.origin);
  }
  
  getBlock(pos) {
    return this.inBounds(pos) ? this.blocks[pos.x][pos.y] : false;
  }
  setBlock(pos, val, delay, cause) {
    if (this.inBounds(pos)) {
      var oldVal = this.blocks[pos.x][pos.y];
      this.blocks[pos.x][pos.y] = (val || false);
      if (this.blocks[pos.x][pos.y]) {
        this.hashBlocks[pos.hash()] = this;
      } else {
        delete this.hashBlocks[pos.hash()];
      }
      this.delayBlocks[pos.hash()] = delay;
      this.game.emit('grid-change', {
        source: this,
        cause: cause,
        pos: pos.copy(),
        from: oldVal,
        to: this.blocks[pos.x][pos.y]
      });
    }
  }
  
  hurt(data) {
    if (this.inBounds(data.pos)) {
      this.setBlock(data.pos, false, 0, 'hurt');
    }
  }
  
  collide(evt) {
    _.defaults(evt.data.instances, this.hashBlocks);
  }
  
  update(evt) {
    this.delayBlocks = {};
  }
  
  getBlockVisible(pos, time) {
    var drawBlock = !!this.getBlock(pos);
    if (time < this.delayBlocks[pos.hash()]) {
      drawBlock = !drawBlock;
    }
    return drawBlock;
  }
  
  render(evt) {
    //Fill in background
    Render.context.fillStyle = 'black';
    Render.rect(this.getPos(-0.5), this.gridSize.multiply(this.cellSize));
    
    //Fill in squares
    Render.context.fillStyle = 'white';
    for (let i = 0; i < this.gridSize.x; ++i) {
      for (let j = 0; j < this.gridSize.y; ++j) {
        if (this.getBlockVisible(new Vector2(i, j), evt.data.time)) {
          Render.rect(this.getPos(i, j).minus(this.cellSize.multiply(0.5)), this.cellSize);
        }
      }
    }
    
    if (false) {
      //Draw grid lines
      Render.context.strokeStyle = '#eee';
      Render.context.lineCap = 'square';
      Render.context.lineWidth = 2;
      Render.context.beginPath();
      
      for (let i = 1; i < this.gridSize.x; ++i) {
        Render.line(this.getPos(i-0.5, -0.5), this.getPos(i-0.5, this.gridSize.y-0.5));
      }
      
      for (let j = 1; j < this.gridSize.y; ++j) {
        Render.line(this.getPos(-0.5, j-0.5), this.getPos(this.gridSize.x-0.5, j-0.5));
      }
      
      Render.context.stroke();
    }
  }
};
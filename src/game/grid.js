/// grid.js
//Grid utility functions

var Vector2 = require('../engine/vector2').default;
var Render = require('../engine/render');
var BaseObject = require('../engine/object').default;

module.exports = class Grid extends BaseObject {
  constructor(config) {
    super(config.game);
    
    this.cellSize = config.cellSize.copy();
    this.gridSize = config.gridSize.copy();
    
    //This centers it on the screen
    this.origin = Vector2.new(this.game.canvas.width, this.game.canvas.height)
      .minus(this.gridSize.minus(1).plus(0, -1).multiply(this.cellSize)).multiply(0.5);
    
    this.blocks = [];
    for (let i = 0; i < this.gridSize.x; ++i) {
      this.blocks[i] = Array(this.gridSize.y).fill(false);
    }
    
    this.delayBlocks = {};
    
    this.handle(this.game, 'update', this.update, -Infinity);
    this.handle(this.game, 'render', this.render, -100);
  }
  
  destroy(displayTime) {
    for (let i = 0; i < this.gridSize.x; ++i) {
      for (let j = 0; j < this.gridSize.y; ++j) {
        if (this.blocks[i][j]) {
          this.game.collide.remove(new Vector2(i, j), this);
        }
      }
    }
    super.destroy(displayTime);
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
      var newVal = (val || false);
      var oldVal = this.blocks[pos.x][pos.y];
      this.blocks[pos.x][pos.y] = newVal;
      
      if (newVal && !oldVal) {
        this.game.collide.add(pos, this, 1);
      } else if (oldVal && !newVal) {
        this.game.collide.remove(pos, this);
      }
      
      this.delayBlocks[pos.hash()] = delay;
      this.game.emit('grid-change', {
        source: this,
        cause: cause,
        pos: pos.copy(),
        from: oldVal,
        to: newVal
      });
    }
  }
  
  hurt(data) {
    if (this.inBounds(data.pos)) {
      this.setBlock(data.pos, false, 0, 'hurt');
    }
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
    evt.data.context.fillStyle = 'black';
    Render.rect(evt.data.context, this.getPos(-0.5), this.gridSize.multiply(this.cellSize));
    
    //Fill in squares
    evt.data.context.fillStyle = 'white';
    for (let i = 0; i < this.gridSize.x; ++i) {
      for (let j = 0; j < this.gridSize.y; ++j) {
        if (this.getBlockVisible(new Vector2(i, j), evt.data.time)) {
          Render.rect(evt.data.context, this.getPos(i, j).minus(this.cellSize.multiply(0.5)), this.cellSize);
        }
      }
    }
    
    if (false) {
      //Draw grid lines
      evt.data.context.strokeStyle = '#eee';
      evt.data.context.lineCap = 'square';
      evt.data.context.lineWidth = 2;
      evt.data.context.beginPath();
      
      for (let i = 1; i < this.gridSize.x; ++i) {
        Render.line(evt.data.context, this.getPos(i-0.5, -0.5), this.getPos(i-0.5, this.gridSize.y-0.5));
      }
      
      for (let j = 1; j < this.gridSize.y; ++j) {
        Render.line(evt.data.context, this.getPos(-0.5, j-0.5), this.getPos(this.gridSize.x-0.5, j-0.5));
      }
      
      evt.data.context.stroke();
    }
  }
};
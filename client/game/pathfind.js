/// pathfind.js
//Construct a grid where each cell has its distance to the player

var Vector2 = require('vector2.js');
var Render = require('render.js');
var BaseObject = require('object.js');

function getAdjacent(pos) {
  return [
    pos.plus(-1, 0), pos.plus(1, 0),
    pos.plus(0, -1), pos.plus(0, 1)
  ];
}

function getDistance(grid, distances, from) {
  if (!grid.inBounds(from)) {
    return Infinity;
  }
  return distances[from.x][from.y];
}

module.exports = class Pathfind extends BaseObject {
  constructor(config) {
    super(config);
    
    this.grid = config.grid;
    this.paths = {};
    
    this.handle(this.game, 'update', this.invalidate, -Infinity);
    //this.handle(this.game, 'render', this.render, 5000);
  }
  
  getNextStep(pos, goal) {
    return this.getNextChoices(pos, goal)[0];
  }
  
  getNextChoices(pos, goal) {
    var distances = this.getDistanceField(goal);
    var adjacent = getAdjacent(pos);
    var distance = Infinity;
    var choices = [];
    for (let i = 0; i < adjacent.length; ++i) {
      var dist = this.getDistance(adjacent[i], goal);
      if (dist === distance) {
        choices.push(adjacent[i]);
      } else if (dist < distance) {
        choices = [adjacent[i]];
        distance = dist;
      }
    }
    return choices;
  }
  
  getDistance(pos, goal) {
    return getDistance(this.grid, this.getDistanceField(goal), pos);
  }
  
  getDistanceField(goal) {
    if (!this.paths[goal.hash()]) {
      this.paths[goal.hash()] = this.generateDistanceField(goal);
    }
    return this.paths[goal.hash()];
  }
  
  generateDistanceField(goal) {
    var distance = [];
    for (let i = 0; i < this.grid.gridSize.x; ++i) {
      distance[i] = Array(this.grid.gridSize.y).fill(Infinity);
    }
    
    if (this.grid.inBounds(goal)) {
      distance[goal.x][goal.y] = 1;
      var queue = getAdjacent(goal);
      
      while (queue.length) {
        var pos = queue.shift();
        if (!this.grid.accessible(pos)) continue;
        var adjacent = getAdjacent(pos);
        
        var newDist = distance[pos.x][pos.y];
        for (let i = 0; i < adjacent.length; ++i) {
          newDist = Math.min(getDistance(this.grid, distance, adjacent[i])+1, newDist);
        }
        
        if (newDist < distance[pos.x][pos.y]) {
          distance[pos.x][pos.y] = newDist;
          queue.push.apply(queue, adjacent);
        }
      }
    }
    
    return distance;
  }
  
  invalidate() {
    this.paths = {};
  }
  
  render(evt) {
    var targets = Object.keys(this.paths);
    for (let index = 0; index < targets.length; ++index) {
      var distance = this.paths[targets[index]];
      Render.context.fillStyle = 'red';
      Render.context.textAlign = 'center';
      Render.context.textBaseline = 'middle';
      for (let i = 0; i < this.grid.gridSize.x; ++i) {
        for (let j = 0; j < this.grid.gridSize.y; ++j) {
          var display = distance[i][j] < Infinity ? distance[i][j] : '∞';
          Render.context.fillText(display, this.grid.getX(i), this.grid.getY(j));
        }
      }
    }
  }
};
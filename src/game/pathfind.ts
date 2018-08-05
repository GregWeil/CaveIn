/// pathfind.ts
//Construct a grid where each cell has its distance to the player

import Vector2 from '../engine/vector2';
import * as Render from '../engine/render';
import BaseObject from '../engine/object';

import Game from './game';
import Grid from './grid';

function getAdjacent(pos: Vector2) {
  return [
    pos.plus(-1, 0), pos.plus(1, 0),
    pos.plus(0, -1), pos.plus(0, 1)
  ];
}

function getDistance(grid: Grid, distances: number[][], from: Vector2) {
  if (!grid.inBounds(from)) {
    return Infinity;
  }
  return distances[from.x][from.y];
}

export default class Pathfind extends BaseObject<Game> {
  paths: { [key: string]: number };
  
  constructor(game: Game) {
    super(game);
    
    this.paths = {};
    
    this.handle(this.game, 'update', this.invalidate, -Infinity);
    //this.handle(this.game, 'render', this.render, 5000);
  }
  
  getNextStep(pos: Vector2, goal: Vector2) {
    return this.getNextChoices(pos, goal)[0];
  }
  
  getNextChoices(pos: Vector2, goal: Vector2) {
    const distances = this.getDistanceField(goal);
    const adjacent = getAdjacent(pos);
    let distance = Infinity;
    let choices = [];
    for (let i = 0; i < adjacent.length; ++i) {
      const dist = this.getDistance(adjacent[i], goal);
      if (dist === distance) {
        choices.push(adjacent[i]);
      } else if (dist < distance) {
        choices = [adjacent[i]];
        distance = dist;
      }
    }
    return choices;
  }
  
  getDistance(pos: Vector2, goal: Vector2) {
    return getDistance(this.grid, this.getDistanceField(goal), pos);
  }
  
  getDistanceField(goal: Vector2) {
    const hash = goal.hash();
    if (!this.paths[hash]) {
      this.paths[hash] = this.generateDistanceField(goal);
    }
    return this.paths[hash];
  }
  
  generateDistanceField(goal: Vector2) {
    var distance = Array(this.grid.gridSize.x);
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
      evt.data.context.fillStyle = 'red';
      evt.data.context.textAlign = 'center';
      evt.data.context.textBaseline = 'middle';
      for (let i = 0; i < this.grid.gridSize.x; ++i) {
        for (let j = 0; j < this.grid.gridSize.y; ++j) {
          var display = distance[i][j] < Infinity ? distance[i][j] : '∞';
          Render.text(evt.data.context, display, this.grid.getX(i), this.grid.getY(j));
        }
      }
    }
  }
};
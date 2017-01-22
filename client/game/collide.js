/// collide.js
//General grid-based collision checking

var _ = require('underscore');

var Vector2 = require('vector2.js');
var Render = require('render.js');

var BaseObject = require('object.js');

module.exports = class Collide extends BaseObject {
  constructor(config) {
    super(config);
    
    this.collisions = {};
    
    this.handle(this.game, 'render', this.render, Infinity);
  }
  
  render(evt) {
    Render.context.fillStyle = 'red';
    Render.context.textAlign = 'center';
    Render.context.textBaseline = 'middle';
    var grid = this.game.grid;
    for (let i = 0; i < grid.gridSize.x; ++i) {
      for (let j = 0; j < grid.gridSize.y; ++j) {
        var data = this.getData(new Vector2(i, j));
        if (data.length) {
          Render.context.fillText(data[0].priority, grid.getX(i), grid.getY(j));
        }
      }
    }
  }
  
  getData(pos) {
    return this.collisions[pos.hash()] || [];
  }
  
  setData(pos, data) {
    this.collisions[pos.hash()] = data;
  }
  
  add(pos, instance, priority) {
    var data = this.getData(pos);
    
    var index;
    for (index = 0; index < data.length; ++index) {
      if (data.priority > priority) break;
    }
    
    data.splice(index, 0, {
      instance: instance,
      priority: priority || 0
    });
    
    this.setData(pos, data);
  }
  
  remove(pos, instance) {
    var data = this.getData(pos);
    data = _.reject(data, _.matcher({ instance: instance }));
    this.setData(pos, data);
  }
  
  move(from, to, instance) {
    this.remove(from, instance);
    this.add(to, instance);
  }
  
  get(pos) {
    var data = this.getData(pos);
    return data.length ? data[0].instance : null;
  }
};
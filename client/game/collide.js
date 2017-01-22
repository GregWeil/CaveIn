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
    
    //this.handle(this.game, 'render', this.render, Infinity);
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
    priority = priority || 0;
    var data = this.getData(pos);
    
    var index;
    for (index = 0; index < data.length; ++index) {
      if (data[index].priority > priority) break;
    }
    
    data.splice(index, 0, {
      instance: instance,
      priority: priority
    });
    
    this.setData(pos, data);
    return data[index];
  }
  
  remove(pos, instance) {
    var data = this.getData(pos);
    var removed = _.findWhere(data, { instance: instance });
    this.setData(pos, _.without(data, removed));
    return removed;
  }
  
  move(from, to, instance) {
    var removed = this.remove(from, instance);
    if (removed) {
      return this.add(to, instance);
    }
    return null;
  }
  
  get(pos, config) {
    config = _.extend({ ignore: [] }, config);
    var data = this.getData(pos);
    var item = _.find(data, function(item) {
      if (_.contains(config.ignore, item.instance)) return false;
      return true;
    });
    return item ? item.instance : null;
  }
};
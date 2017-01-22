/// collide.js
//General grid-based collision checking

var _ = require('underscore');

var Vector2 = require('vector2.js');

var BaseObject = require('object.js');

module.exports = class Collide extends BaseObject {
  constructor(config) {
    super(config);
    
    this.collisions = {};
    
    this.handle(this.game, 'render', this.render, Infinity);
  }
  
  render(evt) {
    _.each(this.collisions, function(key, data) {
      console.log(key, data);
    });
  }
  
  getData(pos) {
    return this.collisions[pos.hash()] || [];
  }
  
  setData(pos, data) {
    this.collisions[pos.hash()] = data;
  }
  
  add(pos, inst, priority) {
    var data = this.getData(pos);
    
    var index;
    for (index = 0; index < data.length; ++index) {
      if (data.priority > priority) break;
    }
    
    data.splice(index, 0, {
      instance: inst,
      priority: priority || 0
    });
    
    this.setData(pos, data);
  }
};
/// collide.js
//General grid-based collision checking

var Vector2 = require('vector2.js');

var BaseObject = require('object.js');

module.exports = class Collide extends BaseObject {
  constructor(config) {
    super(config);
    
    this.collisions = {};
  }
  
  add(pos, inst, priority) {
    
  }
};
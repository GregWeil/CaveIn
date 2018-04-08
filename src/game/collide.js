/// collide.js
//General grid-based collision checking

var Vector2 = require('../engine/vector2').default;
var renderText = require('../engine/render').text;
var BaseObject = require('../engine/object');

module.exports = class Collide extends BaseObject {
  constructor(config) {
    super(config);
    
    this.collisions = {};
    
    //this.handle(this.game, 'render', this.render, Infinity);
  }
  
  render(evt) {
    evt.data.context.fillStyle = 'red';
    evt.data.context.textAlign = 'center';
    evt.data.context.textBaseline = 'middle';
    var grid = this.game.grid;
    for (let i = 0; i < grid.gridSize.x; ++i) {
      for (let j = 0; j < grid.gridSize.y; ++j) {
        var data = this.getData(Vector2.new(i, j).hash());
        if (data.length) {
          renderText(evt.data.context, data[0].priority, grid.getPos(i, j));
        }
      }
    }
  }
  
  getData(hash) {
    return this.collisions[hash] || [];
  }
  
  setData(hash, data) {
    this.collisions[hash] = data;
  }
  
  add(pos, instance, priority) {
    var hash = pos.hash();
    priority = priority || 0;
    var data = this.getData(hash);
    
    var index;
    for (index = 0; index < data.length; ++index) {
      if (data[index].priority > priority) break;
    }
    
    data.splice(index, 0, {
      instance: instance,
      priority: priority
    });
    
    this.setData(hash, data);
    return data[index];
  }
  
  remove(pos, instance) {
    var hash = pos.hash();
    var data = this.getData(hash);
    var index = data.findIndex(item => item.instance === instance);
    if (index < 0) return null;
    var removed = data[index];
    data.splice(index, 1);
    this.setData(hash, data);
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
    config = Object.assign({ ignore: [] }, config);
    var data = this.getData(pos.hash());
    var item = data.find(item => {
      if (config.ignore.includes(item.instance)) return false;
      if (config.type && !(item.instance instanceof config.type)) return false;
      return true;
    });
    return item ? item.instance : null;
  }
  
  count() {
    return Object.values(this.collisions).filter(data => data.length).length;
  }
};
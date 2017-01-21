/// engine.js
//Main engine loop

var _ = require('underscore');

var EventEmitter = require('events.js');
var Render = require('render.js');

module.exports = class Engine extends EventEmitter {
  constructor(canvas) {
    super();
    
    this.active = true;
    
    this.canvas = canvas || document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d');
    
    this.objects = [];
    
    if (this.canvas && this.ctx) {
      this.render();
    }
  }
  
  destructor() {
    while (this.objects.length) {
      this.destroy(this.objects[0]);
    }
    this.active = false;
  }
  
  update(command) {
    var dt = (performance.now() - this.updateTime) / 1000;
    
    this.emit('update', {
      command: command,
      time: dt
    });
    
    this.updateTime = performance.now();
  }
  
  commandCheck(command) {
    return this.emit('command-check', {
      command: command,
      accept: false
    }).data.accept;
  }
  
  render() {
    Render.context = this.ctx;
    
    //Clear the canvas
    Render.context.fillStyle = 'black';
    Render.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    //Draw everything
    this.emit('render', {
      context: Render.context,
      time: (performance.now() - this.updateTime) / 1000
    });
    
    //Queue up the next render
    if (this.active) {
      window.requestAnimationFrame(this.render.bind(this));
    }
  }
  
  create(Obj, config) {
    config = _.extend({ game: this }, (config || {}));
    var inst = new Obj(config);
    this.objects.push(inst);
    return inst;
  }
  
  destroy(inst, displayTime) {
    inst.destroy(displayTime);
    this.objects.splice(this.objects.indexOf(inst), 1);
  }
  
  getCollisions(data) {
    var event = {
      instances: {},
      data: data || {}
    };
    this.emit('collision-check', event);
    return event.instances;
  }
  
  collisionCheck(pos, data) {
    return this.getCollisions(data)[pos.hash()];
  }
};
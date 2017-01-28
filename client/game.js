/// game.js
//Main engine loop

var EventEmitter = require('events');

var Vector2 = require('./vector2.js');

module.exports = class Game extends EventEmitter {
  constructor(canvas, commands) {
    super();
    this.setMaxListeners(Infinity);
    
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    
    this.objects = [];
    
    this.updateTime = performance.now();
    
    this.keys = {};
    this.keyLast = '';
    window.addEventListener('keydown', this.inputKeydown.bind(this), true);
    window.addEventListener('keyup', this.inputKeyup.bind(this), true);
    
    window.setInterval(function() {
      this.emit('anim-idle');
    }.bind(this), 1000);
    
    this.commands = (commands || {});
    
    this.render();
  }
  
  update(command) {
    if (!command && this.keys[this.keyLast]) {
      command = this.getCommand(this.keyLast);
    }
    
    var event = {
      command: command
    };
    this.emit('update-cleanup', event);
    this.emit('update-first', event);
    this.emit('update-early', event);
    this.emit('update', event);
    this.emit('update-late', event);
    this.emit('update-last', event);
    
    this.updateTime = performance.now();
  }
  
  render() {
    //Scale canvas to fit the screen
    for (var scale = 1; scale < 1000; ++scale) {
      var width = scale * this.canvas.width;
      var height = scale * this.canvas.height;
      if (width > window.innerWidth || height > window.innerHeight) {
        break;
      }
      this.canvas.style.width = width + 'px';
      this.canvas.style.height = height + 'px';
    }
    
    //Clear the canvas
    this.ctx.fillStyle = 'black';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    //Draw everything
    var event = {
      context: this.ctx,
      time: (performance.now() - this.updateTime) / 1000
    };
    this.emit('render-first', event);
    this.emit('render-early', event);
    this.emit('render', event);
    this.emit('render-late', event);
    this.emit('render-last', event);
    
    //Queue up the next render
    window.requestAnimationFrame(this.render.bind(this));
  }
  
  getCommand(code) {
    return (this.commands[code] || '');
  }
  
  inputKeydown(evt) {
    this.keyLast = evt.code;
    if (this.keys[evt.code]) {
      return;
    }
    this.keys[evt.code] = true;
    
    var command = this.getCommand(evt.code);
    if (command && (performance.now() - this.updateTime > 150)) {
      //Only update if min time and something will use it
      var data = {
        command: command,
        accept: false
      };
      this.emit('command-check', data);
      if (data.accept) {
        this.update(command);
        evt.preventDefault();
      }
    }
  }
  
  inputKeyup(evt) {
    this.keys[evt.code] = false;
  }
  
  create(obj) {
    var inst = new (obj.bind.apply(obj, arguments))();
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
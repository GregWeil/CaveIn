(function(){function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s}return e})()({1:[function(require,module,exports){
/// engine.js
//Main engine loop

var EventEmitter = require('events.js');
var Render = require('render.js');

module.exports = class Engine extends EventEmitter {
  constructor(config) {
    super();
    
    this.active = true;
    this.headless = !config.canvas;
    this.locked = config.locked || this.headless;
    this.silent = config.silent || this.headless;
    
    this.canvas = config.canvas || document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d');
    
    this.objects = [];
    
    if (!this.headless) {
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
  
  sound(asset, config) {
    if (this.silent) {
      return null;
    }
    var audio = asset.play();
    if (config) {
      if ('volume' in config) {
        asset.volume(config.volume, audio);
      }
    }
    return audio;
  }
  
  create(Obj, config) {
    config = Object.assign({ game: this }, (config || {}));
    var inst = new Obj(config);
    this.objects.push(inst);
    return inst;
  }
  
  destroy(inst, displayTime) {
    var index = this.objects.indexOf(inst);
    if (index >= 0) {
      inst.destroy(displayTime);
      this.objects.splice(index, 1);
    }
  }
};
},{"events.js":2,"render.js":5}],2:[function(require,module,exports){
/// events.js
//A pretty standard event system

//Key features
//Prioritized handlers, lower numbers first
//Unbind handlers by setting hander.active = false

class Event {
  constructor(data) {
    this.source = data.source;
    this.type = data.type;
    this.data = data.data;
  }
}

class Handler {
  constructor(data) {
    this.active = true;
    
    this.type = data.type;
    this.func = data.as ? data.func.bind(data.as) : data.func;
    this.priority = data.priority || 0;
    
    this.funcName = data.func.name;
    this.as = data.as;
  }
  
  handle(event) {
    this.func(event);
  }
}

module.exports = class EventEmitter {
  constructor() {
    this.handlers = {};
  }
  
  emit(type, data) {
    var event = new Event({
      source: this,
      type: type,
      data: data || {}
    });
    
    var handlers = this.handlers[type] || [];
    handlers = handlers.filter(handler => handler.active);
    this.handlers[type] = handlers;
    
    for (let i = 0; i < handlers.length; ++i) {
      handlers[i].handle(event);
    }
    
    return event;
  }
  
  on(type, func, as, priority) {
    var handler = new Handler({
      type: type,
      func: func,
      priority: priority,
      as: as
    });
    var handlers = this.handlers[handler.type] || [];
    
    var index;
    for (index = 0; index < handlers.length; ++index) {
      if (handlers[index].priority > handler.priority) break;
    }
    handlers.splice(index, 0, handler);
    
    this.handlers[handler.type] = handlers;
    return handler;
  }
};
},{}],3:[function(require,module,exports){
/// input.js
//Take player input and send it to the game

var Vector2 = require('vector2.js');

class Input {
  constructor(config) {
    this.game = config.game;
    this.emit = config.emit;
  }
  
  destructor() {
    //Other inputs can override this
  }
  
  command(cmd) {
    this.emit(cmd);
  }
}

class InputWrapper extends Input {
  constructor(config, inputs) {
    super(config);
    
    this.inputs = inputs.map(InputType =>
      new InputType(Object.assign({
        emit: this.handler.bind(this)
      }, config))
    );
  }
  
  destructor() {
    this.inputs.forEach(input => input.destructor());
    super.destructor();
  }
  
  handler(cmd) {
    this.command(cmd);
  }
}

class InputThrottled extends InputWrapper {
  constructor(config, inputs) {
    super(config, inputs);
    
    this.time = -Infinity;
  }
  
  command(cmd) {
    super.command(cmd);
    this.time = performance.now() + 150;
  }
  
  handler(cmd) {
    if (performance.now() > this.time) {
      this.command(cmd);
    }
  }
}

class InputQueued extends InputWrapper {
  constructor(config, inputs) {
    super(config, inputs);
    
    this.callback = null;
    this.queued = null;
  }
  
  destructor() {
    if (this.callback !== null) {
      window.clearTimeout(this.callback);
      this.callback = null;
    }
    super.destructor();
  }
  
  command(cmd) {
    super.command(cmd);
    
    this.queued = null;
    if (this.callback) {
      window.clearTimeout(this.callback);
    }
    
    this.callback = window.setTimeout(() => {
      this.callback = null;
      if (this.queued) {
        this.command(this.queued);
      }
    }, 150);
  }
  
  handler(cmd) {
    if (this.callback === null) {
      this.command(cmd);
    } else {
      this.queued = cmd;
    }
  }
}

class InputKeyboard extends Input {
  constructor(config) {
    super(config);
    
    this.keyCommands = config.keys;
    
    this.boundKeyDown = this.keyDown.bind(this);
    this.boundKeyUp = this.keyUp.bind(this);
    
    window.addEventListener('keydown', this.boundKeyDown, true);
    window.addEventListener('keyup', this.boundKeyUp, true);
    
    this.keyLast = null;
  }
  
  destructor() {
    window.removeEventListener('keydown', this.boundKeyDown, true);
    window.removeEventListener('keyup', this.boundKeyUp, true);
    super.destructor();
  }
  
  tryCommandForKey(code) {
    var cmd = this.keyCommands[code];
    if (cmd) {
      return this.command(cmd);
    }
    return false;
  }
  
  keyDown(evt) {
    if (this.keyLast === evt.code) {
      return;
    }
    this.keyLast = evt.code;
    var result = this.tryCommandForKey(evt.code);
    if (result) {
      evt.preventDefault();
      evt.stopPropagation();
    }
  }
  
  keyUp(evt) {
    if (this.keyLast === evt.code) {
      this.keyLast = null;
    }
  }
}

class InputSwipe extends Input {
  constructor(config) {
    super(config);
    
    this.target = this.game.canvas;
    this.moveThreshold = 10;
    
    this.tapCommand = config.tap;
    this.swipeCommands = config.swipes;
    
    this.touches = {};
    
    this.boundTouchStart = this.touchStart.bind(this);
    this.boundTouchMove = this.touchMove.bind(this);
    this.boundTouchEnd = this.touchEnd.bind(this);
    
    this.target.addEventListener('touchstart', this.boundTouchStart, true);
    this.target.addEventListener('touchmove', this.boundTouchMove, true);
    this.target.addEventListener('touchend', this.boundTouchEnd, true);
  }
  
  destructor() {
    this.target.removeEventListener('touchstart', this.boundTouchStart, true);
    this.target.removeEventListener('touchmove', this.boundTouchMove, true);
    this.target.removeEventListener('touchend', this.boundTouchEnd, true);
    super.destructor();
  }
  
  touchUpdate(evtTouch, timeStamp) {
    var id = evtTouch.identifier;
    if (this.touches[id] && timeStamp > this.touches[id].lastTime) {
      var rect = this.game.canvas.getBoundingClientRect();
      var pos = new Vector2(evtTouch.clientX, evtTouch.clientY);
      pos = pos.minus(rect.left, rect.top).divide(rect.width, rect.height);
      pos = pos.multiply(this.game.canvas.width, this.game.canvas.height);
      this.touches[id].lastPos = pos;
      this.touches[id].lastTime = timeStamp;
    }
  }
  
  touchCommand(id) {
    var touch = this.touches[id];
    if (touch) {
      var offset = touch.lastPos.minus(touch.firstPos);
      if (offset.length() < this.moveThreshold) {
        return this.tapCommand || '';
      } else {
        var increments = this.swipeCommands.length;
        var segment = Math.round(offset.angle() * (increments / 2) / Math.PI);
        var direction = ((segment + increments) % increments);
        return this.swipeCommands[direction] || '';
      }
    }
    return '';
  }
  
  touchExecute(id) {
    var touch = this.touches[id];
    if (touch) {
      var command = this.touchCommand(touch.id);
      if (command) {
        this.command(command);
      }
      
      delete this.touches[touch.id];
    }
  }
  
  touchStart(evt) {
    evt.preventDefault();
    evt.stopPropagation();
    for (var i = 0; i < evt.changedTouches.length; ++i) {
      var touch = evt.changedTouches[i];
      var id = touch.identifier;
      this.touches[id] = { id: id, lastTime: -Infinity };
      this.touchUpdate(touch, evt.timeStamp);
      this.touches[id].firstPos = this.touches[id].lastPos;
      this.touches[id].firstTime = this.touches[id].lastTime;
    }
  }
  
  touchMove(evt) {
    evt.preventDefault();
    evt.stopPropagation();
    for (var i = 0; i < evt.changedTouches.length; ++i) {
      this.touchUpdate(evt.changedTouches[i], evt.timeStamp);
      
      var touch = this.touches[evt.changedTouches[i].identifier];
      if (touch) {
        var command = this.touchCommand(touch.id);
        if (command && command != this.tapCommand) {
          this.touchExecute(touch.id);
        }
      }
    }
  }
  
  touchEnd(evt) {
    evt.preventDefault();
    evt.stopPropagation();
    for (var i = 0; i < evt.changedTouches.length; ++i) {
      this.touchUpdate(evt.changedTouches[i], evt.timeStamp);
      
      var id = evt.changedTouches[i].identifier;
      var touch = this.touches[id];
      if (touch) {
        if (touch.lastTime - touch.firstTime < 1000) {
          this.touchExecute(id);
        }
        
        delete this.touches[id];
      }
    }
  }
}

module.exports = {
  Throttled: InputThrottled,
  Queued: InputQueued,
  
  Keyboard: InputKeyboard,
  Swipe: InputSwipe
};
},{"vector2.js":6}],4:[function(require,module,exports){
/// object.js
//Base game object that things inherit from

module.exports = class BaseObject {
  constructor(config) {
    this.game = config.game;
    this.handlers = [];
    this.active = true;
  }
  
  destroy(displayTime) {
    this.active = false;
    var handlers = Array.from(this.handlers);
    for (let i = 0; i < handlers.length; ++i) {
      var data = handlers[i];
      //Things render for a little after they die
      //It looks better when you move into an attack
      if (data.type !== 'render') {
        this.unhandle(data);
      }
    }
    window.setTimeout(() => {
      var handlers = Array.from(this.handlers);
      for (let i = 0; i < handlers.length; ++i) {
        this.unhandle(handlers[i]);
      }
    }, displayTime !== undefined ? displayTime*1000 : 30);
  }
  
  storeHandler(handler) {
    this.handlers.push(handler);
  }
  
  dropHandler(handler) {
    var index = this.handlers.indexOf(handler);
    this.handlers.splice(index, 1);
  }
  
  handle(obj, type, func, priority) {
    this.storeHandler(obj.on(type, func, this, priority));
  }
  
  unhandle(handler) {
    this.dropHandler(handler);
    handler.active = false;
  }
};
},{}],5:[function(require,module,exports){
/// render.js
//A bunch of utility functions for drawing things

var Vector2 = require('vector2.js');

var ctx = null;

var sprites = {};

function line(from, to) {
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x, to.y);
}

function rect(pos, size) {
  ctx.fillRect(pos.x, pos.y, size.x, size.y);
}

function text(text, pos) {
  ctx.fillText(text, pos.x, pos.y);
}

function addSprite(name, img, size, offset, center) {
  sprites[name] = {
    image: img,
    size: size.copy(),
    offset: size.multiply(offset || new Vector2()),
    center: center ? center.copy() : size.multiply(0.5)
  };
  return name;
}

function drawSprite(name, pos, angle) {
  ctx.translate(pos.x, pos.y);
  ctx.rotate(angle || 0);
  
  var spr = sprites[name];
  ctx.drawImage(spr.image, spr.offset.x, spr.offset.y, spr.size.x, spr.size.y,
    -spr.center.x, -spr.center.y, spr.size.x, spr.size.y);
  
  ctx.rotate(-angle || 0);
  ctx.translate(-pos.x, -pos.y);
}

module.exports = {
  set context(val) { ctx = val; },
  get context() { return ctx; },
  line: line,
  rect: rect,
  text: text,
  addSprite: addSprite,
  sprite: drawSprite
};
},{"vector2.js":6}],6:[function(require,module,exports){
/// vector2.js
//A point class

module.exports = class Vector2 {
  constructor(x, y) {
    this.x = x || 0;
    this.y = y !== undefined ? y : this.x;
  }
  
  static new(x, y) {
    return new Vector2(x, y);
  }
  
  copy() {
    return new Vector2(this.x, this.y);
  }
  
  plus(a, b) {
    if (a instanceof Vector2) {
      return new Vector2((this.x + a.x), (this.y + a.y));
    } else {
      return this.plus(new Vector2(a, b));
    }
  }
  minus(a, b) {
    if (a instanceof Vector2) {
      return this.plus(a.multiply(-1));
    } else {
      return this.minus(new Vector2(a, b));
    }
  }
  multiply(a, b) {
    if (a instanceof Vector2) {
      return new Vector2(this.x * a.x, this.y * a.y);
    } else {
      return this.multiply(new Vector2(a, b));
    }
  }
  divide(a, b) {
    if (a instanceof Vector2) {
      return new Vector2(this.x / a.x, this.y / a.y);
    } else {
      return this.divide(new Vector2(a, b));
    }
  }
  
  equals(a, b) {
    if (a instanceof Vector2) {
      return (this.x == a.x && this.y == a.y);
    } else {
      return this.equals(new Vector2(a, b));
    }
  }
  
  round() {
    return new Vector2(Math.round(this.x), Math.round(this.y));
  }
  
  manhattan() {
    return (Math.abs(this.x) + Math.abs(this.y));
  }
  
  length() {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }
  
  angle() {
    return Math.atan2(this.y, this.x);
  }
  
  hash() {
    return (this.x + ',' + this.y)
  }
};
},{}],7:[function(require,module,exports){
/// collide.js
//General grid-based collision checking

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
        var data = this.getData(Vector2.new(i, j).hash());
        if (data.length) {
          Render.context.fillText(data[0].priority, grid.getX(i), grid.getY(j));
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
},{"object.js":4,"render.js":5,"vector2.js":6}],8:[function(require,module,exports){
/// colors.js
//Apply a color filter to the screen
//Either each cell is a color, or the whole screen is a color

var Vector2 = require('vector2.js');
var Render = require('render.js');
var BaseObject = require('object.js');

var colors = [
  '#F00', '#0F0', '#06F', '#FF0', '#F0F', '#0FF',
  '#FFF', '#FFF', '#FFF', '#FFF', '#FFF', '#FFF'
];

class GridColors extends BaseObject {
  constructor(config) {
    super(config);
    
    this.grid = config.grid;
    
    this.padding = 2;
    
    this.colors = [];
    for (let i = -2 * this.padding; i < this.grid.gridSize.x; ++i) {
      var array = [];
      for (let j = -2 * this.padding; j < this.grid.gridSize.y; ++j) {
        array.push(this.game.random.pick(colors));
      }
      this.colors.push(array);
    }
    
    this.handle(this.game, 'render', this.render, 1000);
  }
  
  render(evt) {
    Render.context.globalCompositeOperation = 'multiply';
    for (let i = -this.padding; i < this.grid.gridSize.x + this.padding; ++i) {
      for (let j = -this.padding; j < this.grid.gridSize.y + this.padding; ++j) {
        Render.context.fillStyle = this.colors[i+this.padding][j+this.padding];
        Render.rect(this.grid.getPos(i, j).minus(this.grid.cellSize.multiply(0.5)), this.grid.cellSize);
      }
    }
    Render.context.globalCompositeOperation = 'source-over';
  }
}

class ScreenColors extends BaseObject {
  constructor(config) {
    super(config);
    
    this.color = this.game.random.pick(colors);
    
    this.handle(this.game, 'render', this.render, 1000);
  }
  
  render(evt) {
    Render.context.globalCompositeOperation = 'multiply';
    Render.context.fillStyle = this.color;
    Render.rect(new Vector2(0, 0), new Vector2(
      Render.context.canvas.width, Render.context.canvas.height));
    Render.context.globalCompositeOperation = 'source-over';
  }
}

module.exports = {
  Grid: GridColors,
  Screen: ScreenColors
};
},{"object.js":4,"render.js":5,"vector2.js":6}],9:[function(require,module,exports){
/// enemy.js
//Move at the player, kill on contact

var Howl = require('howler').Howl;

var Vector2 = require('vector2.js');
var Render = require('render.js');
var BaseObject = require('object.js');

var dimensions = new Vector2(16);
var spritesheet = document.getElementById('spritesheet');

var sprites = [
  Render.addSprite('enemy-a', spritesheet, dimensions, new Vector2(0, 2)),
  Render.addSprite('enemy-b', spritesheet, dimensions, new Vector2(1, 2))
];

var ghostSprites = [
  Render.addSprite('enemy-ghost-a', spritesheet, dimensions, new Vector2(0, 8)),
  Render.addSprite('enemy-ghost-b', spritesheet, dimensions, new Vector2(1, 8))
];

var audioStep = new Howl({ src: ['/assets/enemy_move.wav'] });
var audioStepRequests = 0;

class EnemyGhost extends BaseObject {
  constructor(config) {
    super(config);
    
    this.grid = config.grid,
    this.pos = config.pos;
    this.sprite = config.sprite;
    
    this.grid.setBlock(this.pos, 'ghost');
    this.game.collide.add(this.pos, this);
    
    this.handle(this.game, 'anim-idle', this.anim);
    this.handle(this.game, 'render', this.render);
  }
  
  destroy(displayTime) {
    this.game.collide.remove(this.pos, this);
    super.destroy(displayTime);
  }
  
  hurt(data) {
    if (this.pos.equals(data.pos)) {
      this.game.destroy(this, data.delay);
      data.hit = true;
    }
  }
  
  anim(evt) {
    this.sprite = (this.sprite + 1) % ghostSprites.length;
  }
  
  render(evt) {
    Render.sprite(ghostSprites[this.sprite], this.grid.getPos(this.pos));
  }
}

module.exports = class Enemy extends BaseObject {
  static spawn(game, grid, avoid, ai) {
    //Take the farthest accessible point
    var locations = [];
    var distance = -Infinity;
    for (var i = 0; i < grid.gridSize.x; ++i) {
      for (var j = 0; j < grid.gridSize.y; ++j) {
        var pos = new Vector2(i, j);
        if (!!game.collide.get(pos)) continue;
        var dist = pos.minus(avoid).manhattan();
        if (dist > distance) {
          locations = [pos];
          distance = dist;
        } else if (dist === distance) {
          locations.push(pos);
        }
      }
    }
    return game.create(Enemy, {
      grid: grid,
      pos: game.random.pick(locations),
      pathfind: ai
    });
  }
  
  constructor(config) {
    super(config);
    
    this.grid = config.grid;
    this.pos = config.pos.copy();
    this.posLast = this.pos.copy();
    this.movement = new Vector2();
    this.moveTimer = 1;
    this.ai = config.pathfind;
    
    this.game.collide.add(this.pos, this);
    
    this.sprite = this.game.random.integer(0, sprites.length - 1);
    
    this.handle(this.game, 'update', this.pathfind, -100);
    this.handle(this.game, 'update', this.update);
    this.handle(this.game, 'update', this.audio, 100);
    
    this.handle(this.game, 'anim-idle', this.anim);
    this.handle(this.game, 'render', this.render);
  }
  
  destroy(displayTime) {
    this.game.collide.remove(this.pos, this);
    super.destroy(displayTime);
  }
  
  pathfind(evt) {
    this.movement = new Vector2();
    if (this.moveTimer < 1) {
      this.moveTimer = 2;
      this.movement = this.ai(this.pos);
      var newPos = this.pos.plus(this.movement);
      if (!this.grid.accessible(newPos)) {
        this.movement = new Vector2();
      }
    }
    this.moveTimer -= 1;
  }
  
  update(evt) {
    //Pick a random direction to go
    this.posLast = this.pos.copy();
    var newPos = this.pos.plus(this.movement);
    if (this.grid.accessible(newPos)) {
      if (!this.game.collide.get(newPos, { type: Enemy })) {
        this.pos = newPos;
        audioStepRequests += 1;
        this.game.collide.move(this.posLast, this.pos, this);
      }
    }
  }
  
  hurt(data) {
    if (this.pos.equals(data.pos)) {
      if (data.cause !== 'gem') {
        this.grid.setBlock(this.pos, true, 0.3);
      }
      if (data.cause === 'grid') {
        this.game.create(EnemyGhost, {
          grid: this.grid,
          pos: this.pos,
          sprite: this.sprite
        });
      }
      this.game.destroy(this, data.delay);
    }
  }
  
  anim(evt) {
    this.sprite = (this.sprite + 1) % sprites.length;
  }
  
  audio(evt) {
    if (audioStepRequests > 0) {
      this.game.sound(audioStep, {
        volume: (1 - (1 / (audioStepRequests * 0.5 + 1)))
      });
      audioStepRequests = 0;
    }
  }
  
  render(evt) {
    Render.context = evt.data.context;
    var displayPos = this.pos;
    if (evt.data.time < 0.05) {
      displayPos = this.pos.plus(this.posLast).multiply(0.5);
    }
    Render.sprite(sprites[this.sprite], this.grid.getPos(displayPos));
  }
};
},{"howler":20,"object.js":4,"render.js":5,"vector2.js":6}],10:[function(require,module,exports){
/// game.js
//Wrap the engine and define game specific interactions

var Random = require('random-js');

var Vector2 = require('vector2.js');
var Render = require('render.js');
var Engine = require('engine.js');
var Input = require('input.js');

var Grid = require('grid.js');
var Collide = require('collide.js');
var Colors = require('colors.js').Screen;
var Pathfind = require('pathfind.js');
var Player = require('player.js');
var Enemy = require('enemy.js');
var Gem = require('gem.js');
var Score = require('score.js');

module.exports = class Game extends Engine {
  constructor(config) {
    super(config);
    
    this.randomSeed = config.seed !== undefined ? config.seed
      : Random().integer(-Math.pow(2, 53), Math.pow(2, 53));
    this.randomEngine = Random.engines.mt19937().seed(this.randomSeed);
    this.random = new Random(this.randomEngine);
    
    this.input = new Input.Queued({
      game: this,
      emit: (function(command) {
        if (this.commandCheck(command) && !this.locked) {
          this.update(command);
        }
      }).bind(this),
      keys: {
        'KeyW': 'up',
        'KeyA': 'left',
        'KeyS': 'down',
        'KeyD': 'right',
        
        'ArrowUp': 'up',
        'ArrowDown': 'down',
        'ArrowLeft': 'left',
        'ArrowRight': 'right',
        
        'Space': 'action'
      },
      swipes: [
        'right', null, 'down', null,
        'left', null, 'up', null
      ],
      tap: 'action'
    }, [Input.Keyboard, Input.Swipe]);
    
    this.animInterval = window.setInterval(function() {
      this.emit('anim-idle');
    }.bind(this), 1000);
    
    //Objects which exist for the life of the game
    
    this.collide = this.create(Collide);
    
    var grid = this.grid = this.create(Grid, {
      cellSize: new Vector2(16),
      gridSize: new Vector2(29, 18)
    });
    
    this.create(Colors, { grid: grid });
    this.create(Score, { grid: grid });
    
    //Create the player and fill in the grid
    
    var player = this.create(Player, {
      grid: grid, pos: grid.gridSize.minus(1).multiply(0.5).round()
    });
    
    for (let i = 0; i < grid.gridSize.x; ++i) {
      for (let j = 0; j < grid.gridSize.y; ++j) {
        grid.setBlock(new Vector2(i, j), true);
        
        if (Math.abs(i - player.pos.x) <= 6) {
          if (Math.abs(j - player.pos.y) <= 4) {
            grid.setBlock(new Vector2(i, j), false);
          }
        }
      }
    }
    
    //Enemy spawning and AI
    
    var pathfind = this.create(Pathfind, { grid: grid });
    
    function enemyAI(pos) {
      if (player.active) {
        var choices = pathfind.getNextChoices(pos, player.pos);
        return this.game.random.pick(choices).minus(pos);
      } else {
        return Random.pick([
          new Vector2(-1, 0), new Vector2(1, 0),
          new Vector2(0, -1), new Vector2(0, 1)
        ]);
      }
    }
    
    this.on('grid-change', function(evt) {
      if (evt.data.from && !evt.data.to && evt.data.cause !== 'gem') {
        Enemy.spawn(this, grid, player.pos, enemyAI);
      }
    }, this);
    
    //Check if something should collapse
    
    this.on('update', function(evt) {
      var distances = pathfind.generateDistanceField(player.pos);
      for (let i = 0; i < grid.gridSize.x; ++i) {
        for (let j = 0; j < grid.gridSize.y; ++j) {
          var pos = new Vector2(i, j);
          if (!grid.getBlock(pos) && !Number.isFinite(distances[i][j])) {
            var hit = this.collide.get(pos);
            if (hit && hit.hurt) {
              hit.hurt({
                pos: pos,
                cause: 'grid',
                delay: 0.4
              });
            }
            grid.setBlock(pos, true, 0.4);
          }
        }
      }
    }, this, 100);
    
    //Gem spawning
    
    this.on('gem-collect', function(evt) {
      Gem.spawn(this, grid, player.pos);
    }, this);
    
    Gem.spawn(this, grid, player.pos);
    
    //Scoring
    
    this.score = 0;
    this.best = config.best || 0;
    
    this.on('score', function(evt) {
      this.score += evt.data.score;
    }, this);
    
    this.on('render', function(evt) {
      Render.context.fillStyle = 'white';
      Render.context.textAlign = 'left';
      Render.context.textBaseline = 'middle';
      Render.context.font = '32px IdealGarbanzo';
      Render.context.textAlign = 'left';
      Render.context.fillText(this.score, 8, 12);
      if (this.best || this.score) {
        Render.context.textAlign = 'right';
        Render.context.fillText(this.best >= this.score ?
          'BEST: ' + this.best : 'NEW BEST',
          this.canvas.width - 7, 12);
      }
    }, this, 900);
  }
  
  //Cleanup
  
  destructor() {
    this.input && this.input.destructor();
    window.clearInterval(this.animInterval);
    super.destructor();
  }
};
},{"collide.js":7,"colors.js":8,"enemy.js":9,"engine.js":1,"gem.js":11,"grid.js":12,"input.js":3,"pathfind.js":13,"player.js":14,"random-js":24,"render.js":5,"score.js":15,"vector2.js":6}],11:[function(require,module,exports){
/// gem.js
//A pickup that gives a point

var Howl = require('howler').Howl;

var Vector2 = require('vector2.js');
var Render = require('render.js');
var BaseObject = require('object.js');
var Grid = require('grid.js');

var dimensions = new Vector2(16);
var spritesheet = document.getElementById('spritesheet');

Render.addSprite('gem-a-a', spritesheet, dimensions, new Vector2(0, 1));
Render.addSprite('gem-a-b', spritesheet, dimensions, new Vector2(1, 1));

Render.addSprite('gem-b-a', spritesheet, dimensions, new Vector2(0, 5));
Render.addSprite('gem-b-b', spritesheet, dimensions, new Vector2(1, 5));

Render.addSprite('gem-c-a', spritesheet, dimensions, new Vector2(0, 6));
Render.addSprite('gem-c-b', spritesheet, dimensions, new Vector2(1, 6));

var audioGem = new Howl({ src: ['/assets/gem.wav'] });

var gemTiers = [
  {
    score: 1,
    rangeAxis: 1,
    rangeManhattan: 2,
    sprites: ['gem-a-a', 'gem-a-b']
  },
  {
    score: 3,
    rangeAxis: 1,
    rangeManhattan: 1,
    sprites: ['gem-b-a', 'gem-b-b']
  },
  {
    score: 5,
    rangeAxis: 0,
    rangeManhattan: 0,
    sprites: ['gem-c-a', 'gem-c-b']
  }
];

module.exports = class Gem extends BaseObject {
  static spawn(game, grid, avoid) {
    var count = game.collide.count();
    var tier = 0;
    if (count <= 264 ) {
      tier = 2;
    } else if (count <= 393) {
      tier = 1;
    }
    
    var position = new Vector2();
    var distance = Infinity;
    var iterations = 0;
    while (iterations < 5) {
      var pos = new Vector2(
        game.random.integer(0, grid.gridSize.x-1),
        game.random.integer(0, grid.gridSize.y-1)
      );
      if (!game.collide.get(pos, { type: Grid })) continue;
      if (game.collide.get(pos, { ignore: [grid] })) continue;
      var dist = Math.abs(pos.minus(avoid).manhattan() - 15);
      if (dist < distance) {
        position = pos;
        distance = dist;
      }
      iterations += 1;
    }
    
    return game.create(Gem, {
      grid: grid,
      pos: position,
      tier: tier
    });
  }
  
  constructor(config) {
    super(config);
    
    this.grid = config.grid;
    this.pos = config.pos;
    
    //this.game.collide.add(this.pos, this);
    
    var base = gemTiers[config.tier];
    this.score = base.score;
    this.rangeAxis = base.rangeAxis;
    this.rangeManhattan = base.rangeManhattan;
    this.sprites = base.sprites;
    
    this.sprite = this.game.random.integer(0, this.sprites.length - 1);
    
    this.grid.setBlock(this.pos, 'gem');
    
    this.handle(this.game, 'update', this.check, 90);
    
    this.handle(this.game, 'anim-idle', this.anim);
    this.handle(this.game, 'render', this.render);
  }
  
  destroy(displayTime) {
    //this.game.collide.remove(this.pos, this);
    super.destroy(displayTime);
  }
  
  check(evt) {
    if (!this.grid.getBlock(this.pos)) {
      this.collect();
    }
  }
  
  collect() {
    var ra = this.rangeAxis;
    var rm = this.rangeManhattan;
    for (let i = -ra; i <= ra; ++i) {
      for (let j = -ra; j <= ra; ++j) {
        if (i === 0 && j === 0) continue;
        var pos = this.pos.plus(i, j);
        if (Vector2.new(i, j).manhattan() > rm) {
          continue;
        }
        var col = this.game.collide.get(pos);
        if (col && col === this.grid) {
          this.grid.setBlock(pos, false, 0.1, 'gem');
        } else if (col && col.hurt) {
          col.hurt({ pos: pos, cause: 'gem' });
        }
      }
    }
    
    this.game.emit('gem-collect');
    this.game.emit('score', {
      score: this.score,
      pos: this.pos
    });
    
    this.game.sound(audioGem);
    
    this.game.destroy(this, 0);
  }
  
  anim(evt) {
    this.sprite = (this.sprite + 1) % this.sprites.length;
  }
  
  render(evt) {
    Render.sprite(this.sprites[this.sprite], this.grid.getPos(this.pos));
  }
};
},{"grid.js":12,"howler":20,"object.js":4,"render.js":5,"vector2.js":6}],12:[function(require,module,exports){
/// grid.js
//Grid utility functions

var Vector2 = require('vector2.js');
var Render = require('render.js');
var BaseObject = require('object.js');

module.exports = class Grid extends BaseObject {
  constructor(config) {
    super(config);
    
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
    Render.context.fillStyle = 'black';
    Render.rect(this.getPos(-0.5), this.gridSize.multiply(this.cellSize));
    
    //Fill in squares
    Render.context.fillStyle = 'white';
    for (let i = 0; i < this.gridSize.x; ++i) {
      for (let j = 0; j < this.gridSize.y; ++j) {
        if (this.getBlockVisible(new Vector2(i, j), evt.data.time)) {
          Render.rect(this.getPos(i, j).minus(this.cellSize.multiply(0.5)), this.cellSize);
        }
      }
    }
    
    if (false) {
      //Draw grid lines
      Render.context.strokeStyle = '#eee';
      Render.context.lineCap = 'square';
      Render.context.lineWidth = 2;
      Render.context.beginPath();
      
      for (let i = 1; i < this.gridSize.x; ++i) {
        Render.line(this.getPos(i-0.5, -0.5), this.getPos(i-0.5, this.gridSize.y-0.5));
      }
      
      for (let j = 1; j < this.gridSize.y; ++j) {
        Render.line(this.getPos(-0.5, j-0.5), this.getPos(this.gridSize.x-0.5, j-0.5));
      }
      
      Render.context.stroke();
    }
  }
};
},{"object.js":4,"render.js":5,"vector2.js":6}],13:[function(require,module,exports){
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
    var hash = goal.hash();
    if (!this.paths[hash]) {
      this.paths[hash] = this.generateDistanceField(goal);
    }
    return this.paths[hash];
  }
  
  generateDistanceField(goal) {
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
},{"object.js":4,"render.js":5,"vector2.js":6}],14:[function(require,module,exports){
/// player.js
//Time to get some interactivity

var Howl = require('howler').Howl;

var Vector2 = require('vector2.js');
var Render = require('render.js');
var BaseObject = require('object.js');

var Enemy = require('enemy.js');

var dimensions = new Vector2(16);
var spritesheet = document.getElementById('spritesheet');

Render.addSprite('player-up', spritesheet, dimensions, new Vector2(1, 4));
Render.addSprite('player-down', spritesheet, dimensions, new Vector2(0, 3));
Render.addSprite('player-left', spritesheet, dimensions, new Vector2(1, 3));
Render.addSprite('player-right', spritesheet, dimensions, new Vector2(0, 4));

Render.addSprite('pickaxe-hit', spritesheet, dimensions, new Vector2(1, 0));
Render.addSprite('pickaxe-swing', spritesheet, dimensions, new Vector2(0, 0));

Render.addSprite('pickaxe-dark-hit', spritesheet, dimensions, new Vector2(1, 7));
Render.addSprite('pickaxe-dark-swing', spritesheet, dimensions, new Vector2(0, 7));

var audioStep = new Howl({ src: ['/assets/move.wav'] });
var audioHit = new Howl({ src: ['/assets/attack.wav'] });
var audioDie = new Howl({ volume: 0.5, src: ['/assets/die.wav'] });

module.exports = class Player extends BaseObject {
  constructor(config) {
    super(config);
    
    this.grid = config.grid;
    this.pos = config.pos;
    this.posLast = this.pos.copy();
    this.facing = 'down';
    
    this.game.collide.add(this.pos, this);
    
    this.attacking = false;
    this.attackHit = false;
    
    this.handle(this.game, 'command-check', this.acceptCommand);
    
    this.handle(this.game, 'update', this.updateEarly, -10);
    this.handle(this.game, 'update', this.update);
    this.handle(this.game, 'update', this.updateLate, 10);
    
    this.handle(this.game, 'render', this.render);
  }
  
  destroy(displayTime) {
    this.game.collide.remove(this.pos, this);
    super.destroy(displayTime);
  }
  
  getFacingDirection() {
    switch (this.facing) {
      case 'up':
        return new Vector2(0, -1);
      case 'down':
        return new Vector2(0, 1);
      case 'left':
        return new Vector2(-1, 0);
      case 'right':
        return new Vector2(1, 0);
    }
    return new Vector2();
  }
  
  attack() {
    var hitPos = this.pos.plus(this.getFacingDirection());
    var hit = this.game.collide.get(hitPos);
    if (hit) {
      hit.hurt({
        pos: hitPos,
        cause: 'player'
      });
      this.attackHit = true;
      this.game.sound(audioHit, { volume: this.game.random.real(0.3, 0.5, true) });
    }
  }
  
  hurt(evt) {
    if (evt.cause !== 'gem') {
      this.game.sound(audioDie);
      this.game.emit('player-died');
      this.game.destroy(this);
    }
  }
  
  acceptCommand(evt) {
    if (['up', 'down', 'left', 'right', 'action'].includes(evt.data.command)) {
      evt.data.accept = true;
    }
  }
  
  updateEarly(evt) {
    this.attackHit = false;
    if (evt.data.command === 'action') {
      this.attack();
    }
  }
  
  update(evt) {
    this.moving = false;
    this.attacking = false;
    this.posLast = this.pos.copy();
    switch (evt.data.command) {
      case 'up':
      case 'down':
      case 'left':
      case 'right':
        this.facing = evt.data.command;
        this.pos = this.pos.plus(this.getFacingDirection());
        this.moving = true;
        break;
      case 'action':
        this.attacking = true;
        break;
    }
    if (this.moving) {
      if (!this.grid.accessible(this.pos)) {
        this.pos = this.posLast;
      } else {
        this.game.sound(audioStep, { volume: this.game.random.real(0.3, 0.4, true) });
      }
    }
    this.game.collide.move(this.posLast, this.pos, this);
  }
  
  updateLate(evt) {
    //If something else is on this space, get hurt
    if (this.game.collide.get(this.pos, { ignore: [this] })) {
      this.hurt({ cause: 'collision' });
    } else if (evt.data.command === 'action' && !this.attackHit) {
      this.attack();
    }
  }
  
  render(evt) {
    var displayPos = this.pos;
    if (evt.data.time < 0.05) {
      displayPos = displayPos.plus(this.posLast).multiply(0.5);
    }
    Render.sprite('player-'+this.facing, this.grid.getPos(displayPos));
    if (this.attacking && (evt.data.time < 0.3)) {
      var axePos = this.pos.plus(this.getFacingDirection());
      var dark = this.grid.getBlockVisible(axePos, evt.data.time) ? '-dark' : '';
      var swing = (this.attackHit && evt.data.time < 0.1) ? '-hit' : '-swing';
      Render.sprite('pickaxe' + dark + swing,
        this.grid.getPos(displayPos.plus(this.getFacingDirection())),
        this.getFacingDirection().angle() - (Math.PI / 2));
    }
  }
};
},{"enemy.js":9,"howler":20,"object.js":4,"render.js":5,"vector2.js":6}],15:[function(require,module,exports){
/// score.js
//Show a popup when the player gets any points

var Render = require('render.js');
var BaseObject = require('object.js');

module.exports = class Score extends BaseObject {
  constructor(config) {
    super(config);
    
    this.grid = config.grid;
    
    this.popups = [];
    
    this.handle(this.game, 'update', this.update, -Infinity);
    this.handle(this.game, 'score', this.score);
    this.handle(this.game, 'render', this.render, 900);
  }
  
  update(evt) {
    if (this.popups.length) {
      var kept = [];
      for (var i = 0; i < this.popups.length; ++i) {
        var popup = this.popups[i];
        popup.time -= evt.data.time;
        popup.delay = 0;
        if (popup.time >= Math.max(popup.delay, 0)) {
          kept.push(popup);
        }
      }
      if (!this.headless) {
        this.popups = kept;
      }
    }
  }
  
  score(evt) {
    if (evt.data.pos) {
      this.popups.push({
        score: evt.data.score,
        pos: evt.data.pos,
        time: 1.2, delay: 0.5
      });
    }
  }
  
  render(evt) {
    Render.context.fillStyle = 'white';
    Render.context.textAlign = 'center';
    Render.context.textBaseline = 'middle';
    Render.context.font = '16px IdealGarbanzo';
    for (var i = 0; i < this.popups.length; ++i) {
      var popup = this.popups[i];
      if (evt.data.time < popup.delay || evt.data.time > popup.time) continue;
      if (this.game.collide.get(popup.pos)) continue;
      Render.text('+' + popup.score, this.grid.getPos(popup.pos));
    }
  }
};
},{"object.js":4,"render.js":5}],16:[function(require,module,exports){
/// main.js
//Define the different pages and how they interact

var { Howler, Howl } = require('howler');
var storage = require('local-storage');

var Pages = require('pages.js');
var Game = require('wrapper.js');

function showSingle(select, except) {
  document.querySelectorAll(select).forEach(e => {
    if (e.matches(except)) {
      e.classList.remove('hidden');
    } else {
      e.classList.add('hidden');
    }
  });
}

Pages.home(new Pages.Page({
  name: 'title',
  selector: '#title-page',
  start: function(evt) {
    if (evt.key === ' ') {
      Pages.navigate('game');
    }
  },
  setup: function() {
    window.addEventListener('keydown', this.config.start);
    
    showSingle(this.selector + ' .save', '.loading');
    Game.save.get().then(save => {
      showSingle(this.selector + ' .save', save ? '.exists' : '.missing');
    });
    
    showSingle(this.selector + ' .best', '.loading');
    Game.best.score().then(score => {
      showSingle(this.selector + ' .best', score > 0 ? '.exists' : '.missing');
      if (score > 0) {
        document.querySelector(this.selector + ' .best.exists .score').textContent = score;
      }
    });
  },
  teardown: function() {
    window.removeEventListener('keydown', this.config.start);
  }
}));

Pages.add(new Pages.Page({
  name: 'tutorial',
  selector: '#tutorial-page'
}));

Pages.redirect('newgame', 'game', function() {
  Game.save.clear();
});

Pages.add(new Pages.Page({
  name: 'game',
  selector: '#game-page',
  setup: function() {
    Game.playable.create({
      onRetry: function() {
        Pages.navigate('newgame');
      }
    });
  },
  teardown: function() {
    Game.playable.destroy();
  }
}));

Pages.add(new Pages.Page({
  name: 'replay',
  selector: '#game-page',
  setup: function() {
    Game.watchable.create({
      onComplete: function() {
        Pages.navigate('title');
      }
    });
  },
  teardown: function() {
    Game.watchable.destroy();
  }
}));

Pages.setup();

var audioMusic = new Howl({ preload: false, src: ['/assets/cavein.wav'] });
var audioMusicId = null;

audioMusic.on('end', function() {
  audioMusicId = audioMusic.play();
}).on('play', function() {
  document.body.classList.add('music-enabled');
}).on('pause', function() {
  document.body.classList.remove('music-enabled');
});

window.addEventListener('visibilitychange', () => {
  Howler.mute(document.hidden);
  window.music();
});

window.music = function(enable) {
  if (enable === undefined) {
    enable = !storage.get('no-music');
  } else if (enable) {
    storage.remove('no-music');
  } else {
    storage.set('no-music', true);
  }
  
  //Make sure the page is visible
  if (document.hidden) {
    enable = false;
  }
  
  if (enable && audioMusicId === null) {
    audioMusicId = audioMusic.play();
  } else if (enable) {
    audioMusic.play(audioMusicId);
  } else {
    audioMusic.pause(audioMusicId);
  }
};

audioMusic.once('load', function() {
  document.body.classList.add('music-loaded');
  window.music();
}).load();

window.fullscreenEnter = function() {
  var element = document.documentElement;
  var names = [
    'requestFullscreen',
    'webkitRequestFullscreen',
    'mozRequestFullScreen',
    'msRequestFullscreen'
  ];
  for (var i = 0; i < names.length; ++i) {
    if (element[names[i]]) {
      element[names[i]]();
      break;
    }
  }
  screen.orientation.lock('landscape');
};

window.fullscreenExit = function() {
  var element = document;
  var names = [
    'exitFullscreen',
    'webkitExitFullscreen',
    'mozCancelFullScreen',
    'msExitFullscreen'
  ];
  for (var i = 0; i < names.length; ++i) {
    if (element[names[i]]) {
      element[names[i]]();
      break;
    }
  }
};
},{"howler":20,"local-storage":21,"pages.js":17,"wrapper.js":19}],17:[function(require,module,exports){
/// pages.js
//A really basic single page app system

class Page {
  constructor(config) {
    this.config = config;
    this.name = config.name;
    this.selector = config.selector;
    this.funcSetup = config.setup || (() => {});
    this.funcTeardown = config.teardown || (() => {});
    this.active = false;
  }
  
  setup() {
    if (this.selector) {
      document.querySelector(this.selector).classList.remove('hidden');
    }
    this.funcSetup();
    this.active = true;
  }
  
  teardown() {
    if (this.selector) {
      document.querySelector(this.selector).classList.add('hidden')
    }
    this.funcTeardown();
    this.active = false;
  }
}

var pages = {};
var home = null;

var current = null;

function registerPage(page) {
  pages[page.name] = page;
}

function registerHome(page) {
  registerPage(page);
  home = page;
}

function registerRedirect(from, to, func) {
  registerPage(new Page({
    name: from,
    setup: function() {
      setTimeout(() => { window.location.replace('#' + to); }, 0);
      func();
    }
  }))
}

function getPage(name) {
  if (pages[name]) {
    return pages[name];
  }
  return home;
}

function setPage(page) {
  if (page !== undefined) {
    page = getPage(page);
  }
  if (current) {
    current.teardown();
  }
  current = page || home;
  if (current) {
    current.setup();
  }
}

function getCurrentHash() {
  return window.location.hash.slice(1);
}

function navigate(name) {
  var newHash = (getPage(name) !== home) ? name : '';
  if (getCurrentHash() === newHash) {
    setPage(name);
  } else {
    window.location.assign('#' + newHash);
  }
}

function initialize() {
  document.querySelectorAll('.page').forEach(pg => pg.classList.add('hidden'));
  window.addEventListener('hashchange', evt => setPage(getCurrentHash()));
  setPage(getCurrentHash());
  document.body.addEventListener('click', evt => {
    var link = evt.target.closest('a[href^="#"]');
    if (link) {
      navigate(link.attr('href').slice(1));
      evt.preventDefault();
    }
  });
}

module.exports = {
  Page: Page,
  add: registerPage,
  home: registerHome,
  redirect: registerRedirect,
  navigate: navigate,
  setup: initialize
};
},{}],18:[function(require,module,exports){
/// replays.js
//Replay validation and recording

var Game = require('game.js');

function execute(game, commands, rate, limit) {
  return new Promise((resolve, reject) => {
    var start = performance.now() - 1;

    rate = rate || Infinity;
    limit = limit || Infinity;

    function step(index) {
      var target = Math.round((performance.now() - start) * (rate / 1000));
      target = Math.min(target, (index + limit), commands.length);

      for (var i = index; i < target; ++i) {
        if (!game.commandCheck(commands[i])) {
          reject();
          return;
        }
        game.update(commands[i]);
      }

      if (target < commands.length) {
        setTimeout(step, 0, target);
      } else {
        resolve();
      }
    }

    setTimeout(step, 0, 0);
  });
}

async function validate(replay) {
  if (!replay) return false;
  if (!replay.validate) return false;
  
  var game = new Game({
    seed: replay.seed
  });
  
  var alive = true;
  game.on('player-died', function(evt) {
    alive = false;
  });
  
  var invalid = [];
  
  try {
    await execute(game, replay.commands, Infinity, 500);
  } catch (e) {
    invalid.push('invalid inputs');
  }
  if (alive && !replay.validate.alive) {
    invalid.push('player should have died');
  }
  if (!alive && replay.validate.alive) {
    invalid.push('player should have lived');
  }
  if (game.score !== replay.validate.score) {
    invalid.push('score mismatch');
  }
  game.destructor();
  
  if (invalid.length) {
    console.log(invalid.join('\n'));
  }
  
  return !invalid.length;
}

function record(game, callback, replay) {
  replay = replay || {
    seed: game.randomSeed,
    commands: [],
    validate: {
      alive: true,
      score: 0,
      version: 1
    }
  };

  callback(replay, game);

  game.on('update', function(evt) {
    replay.commands.push(evt.data.command);
  }, undefined, -Infinity);

  game.on('score', function(evt) {
    replay.validate.score = game.score;
  }, undefined, Infinity);

  game.on('player-died', function(evt) {
    replay.validate.alive = false;
  }, undefined, Infinity);

  game.on('update', function(evt) {
    callback(replay, game);
  }, undefined, Infinity);
}

function getScore(replay) {
  return replay.validate.score;
}

function getAlive(replay) {
  return replay.validate.alive;
}

function isContinuation(long, short) {
  if (!long || !short) return false;
  if (long.seed !== short.seed) return false;
  if (getScore(long) < getScore(short)) return false;
  if (long.commands.length < short.commands.length) return false;
  return true;
}

module.exports = {
  execute: execute,
  validate: validate,
  record: record,
  getScore: getScore,
  getAlive: getAlive,
  isContinuation: isContinuation
};
},{"game.js":10}],19:[function(require,module,exports){
/// wrapper.js
//Provide simple functions for game management

var storage = require('local-storage');

var Vector2 = require('vector2.js');
var Game = require('game.js');
var Replay = require('replay.js');

//Player game state

var state = {
  game: null, //The active game
  save: undefined, //The player's save, undefined is unloaded
  best: undefined //The players's best replay, undefined is unloaded
};

//Saves for the current and best game

async function replayGet(name, validate) {
  if (state[name] !== undefined) {
    return state[name];
  }
  var nameDeferred = name + '_loader';
  if (!state[nameDeferred]) {
    //This is the first request, load and validate
    validate = validate || (replay => true);
    var replay = storage.get(name);
    state[nameDeferred] = Replay.validate(replay).then(
      valid => valid && validate(replay)
    ).then(valid => {
      //Make sure nothing touched it while we were working
      if (state[name] === undefined) {
        state[name] = valid ? replay : null;
        state[nameDeferred] = undefined;
      }
      return state[name];
    });
  }
  return await state[nameDeferred];
}

async function replayGetBest() {
  return await replayGet('best');
}

async function replayGetBestScore() {
  var replay = await replayGetBest();
  return replay ? Replay.getScore(replay) : null;
}

async function replayGetSave() {
  return await replayGet('save', replay => Replay.getAlive(replay));
}

function replayRemoveSave() {
  state.save = null;
}

//Record the player's current game

async function replayRecordSave(replay, game) {
  if (game !== state.game) return;
  if (!replay) return;
  if (Replay.getScore(replay) <= 0) return;

  storage.set('save', Replay.getAlive(replay) ? replay : null);
  state.save = storage.get('save');

  var best = await replayGetBest();
  var isBetterScore = best && (Replay.getScore(replay) > Replay.getScore(best));
  var isContinuation = Replay.isContinuation(replay, best);
  if (!best || isBetterScore || isContinuation) {
    storage.set('best', replay);
    state.best = storage.get('best');
  }
}

//Manipulate the player's game

function resize() {
  var pixel = window.devicePixelRatio;
  var canvas = document.querySelector('#game-page .area');
  canvas.style.transform = '';
  var sizeCanvas = new Vector2(canvas.offsetWidth, canvas.offsetHeight);
  var sizeWindow = new Vector2(window.innerWidth, window.innerHeight);
  var scaleAxes = sizeWindow.divide(sizeCanvas.divide(pixel));
  var scale = Math.min(scaleAxes.x, scaleAxes.y);
  if (scale > 1) {
    scale = Math.floor(scale);
  } else if (scale < 1) {
    scale = (1 / Math.ceil(1 / scale));
  }
  canvas.style.transform = ('scale(' + (scale / pixel) + ')');
}
window.addEventListener('resize', () => {
  if (state.game) resize();
});

var overlayCurrent = null;
var overlayAction = null;
function overlay(name, action) {
  document.querySelectorAll('#game-page .overlay')
    .forEach(e => e.classList.add('hidden'));
  if (name) {
    overlayCurrent = name;
    overlayAction = action;
    document.getElementById(name).classList.remove('hidden');
  } else {
    overlayCurrent = null;
    overlayAction = null;
  }
}

window.pause = function pause(evt) {
  var evtCanPause = !evt ||
    (evt.type.startsWith('key') && evt.key === 'Escape') ||
    (evt.type.startsWith('touch') && evt.target === document.body);
  var evtCanResume = !evt || evt.key === 'Escape';
  if (evtCanPause && !overlayCurrent) {
    overlay('game-pause');
  } else if (evtCanResume && overlayCurrent === 'game-pause') {
    overlay();
  }
};

async function createPlayable(config) {
  overlay();
  var save = await replayGetSave();
  var best = await replayGetBestScore();
  
  var game = new Game({
    canvas: document.getElementById('canvas'),
    seed: save ? save.seed : null,
    best: best, locked: true
  });
  state.game = game;
  resize();
  
  game.on('command-check', function (evt) {
    if (overlayCurrent) {
      evt.data.accept = false;
      if (overlayAction && evt.data.command === 'action') {
        overlayAction();
      }
    }
  }, undefined, Infinity);
  
  game.on('player-died', function() {
    window.setTimeout(function() {
      overlay('game-over', config.onRetry);
    }, 1000);
  });
  
  if (save) {
    game.silent = true;
    await Replay.execute(game, save.commands.slice(0, -100), 2500, 100);
    await Replay.execute(game, save.commands.slice(-100, -5), 500, 100);
    game.silent = false;
    await Replay.execute(game, save.commands.slice(-5, -1), 5);
    await Replay.execute(game, save.commands.slice(-1), 1.5);
  }
  
  Replay.record(game, replayRecordSave, save);
  window.addEventListener('keydown', window.pause);
  document.body.addEventListener('touchstart', window.pause);
  game.locked = false;
}

function destroyPlayable() {
  window.removeEventListener('keydown', window.pause);
  document.body.removeEventListener('touchstart', window.pause);
  state.game && state.game.destructor();
  state.game = null;
}

async function createWatchable(config) {
  overlay();
  var save = await replayGetBest();
  if (!save) {
    config.onComplete();
    return;
  }
  var score = Replay.getScore(save);
  
  var game = new Game({
    canvas: document.getElementById('canvas'),
    seed: save.seed, best: score,
    locked: true
  });
  state.game = game;
  resize();
  
  await Replay.execute(game, save.commands, 5);
  await new Promise((resolve, reject) => setTimeout(resolve, 3000));
  
  config.onComplete();
}

function destroyWatchable() {
  state.game && state.game.destructor();
  state.game = null;
}

module.exports = {
  playable: {
    create: createPlayable,
    destroy: destroyPlayable
  },
  watchable: {
    create: createWatchable,
    destroy: destroyWatchable
  },
  save: {
    get: replayGetSave,
    clear: replayRemoveSave
  },
  best: {
    get: replayGetBest,
    score: replayGetBestScore
  }
};
},{"game.js":10,"local-storage":21,"replay.js":18,"vector2.js":6}],20:[function(require,module,exports){
(function (global){
/*!
 *  howler.js v2.0.9
 *  howlerjs.com
 *
 *  (c) 2013-2018, James Simpson of GoldFire Studios
 *  goldfirestudios.com
 *
 *  MIT License
 */

(function() {

  'use strict';

  /** Global Methods **/
  /***************************************************************************/

  /**
   * Create the global controller. All contained methods and properties apply
   * to all sounds that are currently playing or will be in the future.
   */
  var HowlerGlobal = function() {
    this.init();
  };
  HowlerGlobal.prototype = {
    /**
     * Initialize the global Howler object.
     * @return {Howler}
     */
    init: function() {
      var self = this || Howler;

      // Create a global ID counter.
      self._counter = 1000;

      // Internal properties.
      self._codecs = {};
      self._howls = [];
      self._muted = false;
      self._volume = 1;
      self._canPlayEvent = 'canplaythrough';
      self._navigator = (typeof window !== 'undefined' && window.navigator) ? window.navigator : null;

      // Public properties.
      self.masterGain = null;
      self.noAudio = false;
      self.usingWebAudio = true;
      self.autoSuspend = true;
      self.ctx = null;

      // Set to false to disable the auto iOS enabler.
      self.mobileAutoEnable = true;

      // Setup the various state values for global tracking.
      self._setup();

      return self;
    },

    /**
     * Get/set the global volume for all sounds.
     * @param  {Float} vol Volume from 0.0 to 1.0.
     * @return {Howler/Float}     Returns self or current volume.
     */
    volume: function(vol) {
      var self = this || Howler;
      vol = parseFloat(vol);

      // If we don't have an AudioContext created yet, run the setup.
      if (!self.ctx) {
        setupAudioContext();
      }

      if (typeof vol !== 'undefined' && vol >= 0 && vol <= 1) {
        self._volume = vol;

        // Don't update any of the nodes if we are muted.
        if (self._muted) {
          return self;
        }

        // When using Web Audio, we just need to adjust the master gain.
        if (self.usingWebAudio) {
          self.masterGain.gain.setValueAtTime(vol, Howler.ctx.currentTime);
        }

        // Loop through and change volume for all HTML5 audio nodes.
        for (var i=0; i<self._howls.length; i++) {
          if (!self._howls[i]._webAudio) {
            // Get all of the sounds in this Howl group.
            var ids = self._howls[i]._getSoundIds();

            // Loop through all sounds and change the volumes.
            for (var j=0; j<ids.length; j++) {
              var sound = self._howls[i]._soundById(ids[j]);

              if (sound && sound._node) {
                sound._node.volume = sound._volume * vol;
              }
            }
          }
        }

        return self;
      }

      return self._volume;
    },

    /**
     * Handle muting and unmuting globally.
     * @param  {Boolean} muted Is muted or not.
     */
    mute: function(muted) {
      var self = this || Howler;

      // If we don't have an AudioContext created yet, run the setup.
      if (!self.ctx) {
        setupAudioContext();
      }

      self._muted = muted;

      // With Web Audio, we just need to mute the master gain.
      if (self.usingWebAudio) {
        self.masterGain.gain.setValueAtTime(muted ? 0 : self._volume, Howler.ctx.currentTime);
      }

      // Loop through and mute all HTML5 Audio nodes.
      for (var i=0; i<self._howls.length; i++) {
        if (!self._howls[i]._webAudio) {
          // Get all of the sounds in this Howl group.
          var ids = self._howls[i]._getSoundIds();

          // Loop through all sounds and mark the audio node as muted.
          for (var j=0; j<ids.length; j++) {
            var sound = self._howls[i]._soundById(ids[j]);

            if (sound && sound._node) {
              sound._node.muted = (muted) ? true : sound._muted;
            }
          }
        }
      }

      return self;
    },

    /**
     * Unload and destroy all currently loaded Howl objects.
     * @return {Howler}
     */
    unload: function() {
      var self = this || Howler;

      for (var i=self._howls.length-1; i>=0; i--) {
        self._howls[i].unload();
      }

      // Create a new AudioContext to make sure it is fully reset.
      if (self.usingWebAudio && self.ctx && typeof self.ctx.close !== 'undefined') {
        self.ctx.close();
        self.ctx = null;
        setupAudioContext();
      }

      return self;
    },

    /**
     * Check for codec support of specific extension.
     * @param  {String} ext Audio file extention.
     * @return {Boolean}
     */
    codecs: function(ext) {
      return (this || Howler)._codecs[ext.replace(/^x-/, '')];
    },

    /**
     * Setup various state values for global tracking.
     * @return {Howler}
     */
    _setup: function() {
      var self = this || Howler;

      // Keeps track of the suspend/resume state of the AudioContext.
      self.state = self.ctx ? self.ctx.state || 'running' : 'running';

      // Automatically begin the 30-second suspend process
      self._autoSuspend();

      // Check if audio is available.
      if (!self.usingWebAudio) {
        // No audio is available on this system if noAudio is set to true.
        if (typeof Audio !== 'undefined') {
          try {
            var test = new Audio();

            // Check if the canplaythrough event is available.
            if (typeof test.oncanplaythrough === 'undefined') {
              self._canPlayEvent = 'canplay';
            }
          } catch(e) {
            self.noAudio = true;
          }
        } else {
          self.noAudio = true;
        }
      }

      // Test to make sure audio isn't disabled in Internet Explorer.
      try {
        var test = new Audio();
        if (test.muted) {
          self.noAudio = true;
        }
      } catch (e) {}

      // Check for supported codecs.
      if (!self.noAudio) {
        self._setupCodecs();
      }

      return self;
    },

    /**
     * Check for browser support for various codecs and cache the results.
     * @return {Howler}
     */
    _setupCodecs: function() {
      var self = this || Howler;
      var audioTest = null;

      // Must wrap in a try/catch because IE11 in server mode throws an error.
      try {
        audioTest = (typeof Audio !== 'undefined') ? new Audio() : null;
      } catch (err) {
        return self;
      }

      if (!audioTest || typeof audioTest.canPlayType !== 'function') {
        return self;
      }

      var mpegTest = audioTest.canPlayType('audio/mpeg;').replace(/^no$/, '');

      // Opera version <33 has mixed MP3 support, so we need to check for and block it.
      var checkOpera = self._navigator && self._navigator.userAgent.match(/OPR\/([0-6].)/g);
      var isOldOpera = (checkOpera && parseInt(checkOpera[0].split('/')[1], 10) < 33);

      self._codecs = {
        mp3: !!(!isOldOpera && (mpegTest || audioTest.canPlayType('audio/mp3;').replace(/^no$/, ''))),
        mpeg: !!mpegTest,
        opus: !!audioTest.canPlayType('audio/ogg; codecs="opus"').replace(/^no$/, ''),
        ogg: !!audioTest.canPlayType('audio/ogg; codecs="vorbis"').replace(/^no$/, ''),
        oga: !!audioTest.canPlayType('audio/ogg; codecs="vorbis"').replace(/^no$/, ''),
        wav: !!audioTest.canPlayType('audio/wav; codecs="1"').replace(/^no$/, ''),
        aac: !!audioTest.canPlayType('audio/aac;').replace(/^no$/, ''),
        caf: !!audioTest.canPlayType('audio/x-caf;').replace(/^no$/, ''),
        m4a: !!(audioTest.canPlayType('audio/x-m4a;') || audioTest.canPlayType('audio/m4a;') || audioTest.canPlayType('audio/aac;')).replace(/^no$/, ''),
        mp4: !!(audioTest.canPlayType('audio/x-mp4;') || audioTest.canPlayType('audio/mp4;') || audioTest.canPlayType('audio/aac;')).replace(/^no$/, ''),
        weba: !!audioTest.canPlayType('audio/webm; codecs="vorbis"').replace(/^no$/, ''),
        webm: !!audioTest.canPlayType('audio/webm; codecs="vorbis"').replace(/^no$/, ''),
        dolby: !!audioTest.canPlayType('audio/mp4; codecs="ec-3"').replace(/^no$/, ''),
        flac: !!(audioTest.canPlayType('audio/x-flac;') || audioTest.canPlayType('audio/flac;')).replace(/^no$/, '')
      };

      return self;
    },

    /**
     * Mobile browsers will only allow audio to be played after a user interaction.
     * Attempt to automatically unlock audio on the first user interaction.
     * Concept from: http://paulbakaus.com/tutorials/html5/web-audio-on-ios/
     * @return {Howler}
     */
    _enableMobileAudio: function() {
      var self = this || Howler;

      // Only run this on mobile devices if audio isn't already eanbled.
      var isMobile = /iPhone|iPad|iPod|Android|BlackBerry|BB10|Silk|Mobi/i.test(self._navigator && self._navigator.userAgent);
      var isTouch = !!(('ontouchend' in window) || (self._navigator && self._navigator.maxTouchPoints > 0) || (self._navigator && self._navigator.msMaxTouchPoints > 0));
      if (self._mobileEnabled || !self.ctx || (!isMobile && !isTouch)) {
        return;
      }

      self._mobileEnabled = false;

      // Some mobile devices/platforms have distortion issues when opening/closing tabs and/or web views.
      // Bugs in the browser (especially Mobile Safari) can cause the sampleRate to change from 44100 to 48000.
      // By calling Howler.unload(), we create a new AudioContext with the correct sampleRate.
      if (!self._mobileUnloaded && self.ctx.sampleRate !== 44100) {
        self._mobileUnloaded = true;
        self.unload();
      }

      // Scratch buffer for enabling iOS to dispose of web audio buffers correctly, as per:
      // http://stackoverflow.com/questions/24119684
      self._scratchBuffer = self.ctx.createBuffer(1, 1, 22050);

      // Call this method on touch start to create and play a buffer,
      // then check if the audio actually played to determine if
      // audio has now been unlocked on iOS, Android, etc.
      var unlock = function() {
        // Fix Android can not play in suspend state.
        Howler._autoResume();

        // Create an empty buffer.
        var source = self.ctx.createBufferSource();
        source.buffer = self._scratchBuffer;
        source.connect(self.ctx.destination);

        // Play the empty buffer.
        if (typeof source.start === 'undefined') {
          source.noteOn(0);
        } else {
          source.start(0);
        }

        // Calling resume() on a stack initiated by user gesture is what actually unlocks the audio on Android Chrome >= 55.
        if (typeof self.ctx.resume === 'function') {
          self.ctx.resume();
        }

        // Setup a timeout to check that we are unlocked on the next event loop.
        source.onended = function() {
          source.disconnect(0);

          // Update the unlocked state and prevent this check from happening again.
          self._mobileEnabled = true;
          self.mobileAutoEnable = false;

          // Remove the touch start listener.
          document.removeEventListener('touchstart', unlock, true);
          document.removeEventListener('touchend', unlock, true);
        };
      };

      // Setup a touch start listener to attempt an unlock in.
      document.addEventListener('touchstart', unlock, true);
      document.addEventListener('touchend', unlock, true);

      return self;
    },

    /**
     * Automatically suspend the Web Audio AudioContext after no sound has played for 30 seconds.
     * This saves processing/energy and fixes various browser-specific bugs with audio getting stuck.
     * @return {Howler}
     */
    _autoSuspend: function() {
      var self = this;

      if (!self.autoSuspend || !self.ctx || typeof self.ctx.suspend === 'undefined' || !Howler.usingWebAudio) {
        return;
      }

      // Check if any sounds are playing.
      for (var i=0; i<self._howls.length; i++) {
        if (self._howls[i]._webAudio) {
          for (var j=0; j<self._howls[i]._sounds.length; j++) {
            if (!self._howls[i]._sounds[j]._paused) {
              return self;
            }
          }
        }
      }

      if (self._suspendTimer) {
        clearTimeout(self._suspendTimer);
      }

      // If no sound has played after 30 seconds, suspend the context.
      self._suspendTimer = setTimeout(function() {
        if (!self.autoSuspend) {
          return;
        }

        self._suspendTimer = null;
        self.state = 'suspending';
        self.ctx.suspend().then(function() {
          self.state = 'suspended';

          if (self._resumeAfterSuspend) {
            delete self._resumeAfterSuspend;
            self._autoResume();
          }
        });
      }, 30000);

      return self;
    },

    /**
     * Automatically resume the Web Audio AudioContext when a new sound is played.
     * @return {Howler}
     */
    _autoResume: function() {
      var self = this;

      if (!self.ctx || typeof self.ctx.resume === 'undefined' || !Howler.usingWebAudio) {
        return;
      }

      if (self.state === 'running' && self._suspendTimer) {
        clearTimeout(self._suspendTimer);
        self._suspendTimer = null;
      } else if (self.state === 'suspended') {
        self.ctx.resume().then(function() {
          self.state = 'running';

          // Emit to all Howls that the audio has resumed.
          for (var i=0; i<self._howls.length; i++) {
            self._howls[i]._emit('resume');
          }
        });

        if (self._suspendTimer) {
          clearTimeout(self._suspendTimer);
          self._suspendTimer = null;
        }
      } else if (self.state === 'suspending') {
        self._resumeAfterSuspend = true;
      }

      return self;
    }
  };

  // Setup the global audio controller.
  var Howler = new HowlerGlobal();

  /** Group Methods **/
  /***************************************************************************/

  /**
   * Create an audio group controller.
   * @param {Object} o Passed in properties for this group.
   */
  var Howl = function(o) {
    var self = this;

    // Throw an error if no source is provided.
    if (!o.src || o.src.length === 0) {
      console.error('An array of source files must be passed with any new Howl.');
      return;
    }

    self.init(o);
  };
  Howl.prototype = {
    /**
     * Initialize a new Howl group object.
     * @param  {Object} o Passed in properties for this group.
     * @return {Howl}
     */
    init: function(o) {
      var self = this;

      // If we don't have an AudioContext created yet, run the setup.
      if (!Howler.ctx) {
        setupAudioContext();
      }

      // Setup user-defined default properties.
      self._autoplay = o.autoplay || false;
      self._format = (typeof o.format !== 'string') ? o.format : [o.format];
      self._html5 = o.html5 || false;
      self._muted = o.mute || false;
      self._loop = o.loop || false;
      self._pool = o.pool || 5;
      self._preload = (typeof o.preload === 'boolean') ? o.preload : true;
      self._rate = o.rate || 1;
      self._sprite = o.sprite || {};
      self._src = (typeof o.src !== 'string') ? o.src : [o.src];
      self._volume = o.volume !== undefined ? o.volume : 1;
      self._xhrWithCredentials = o.xhrWithCredentials || false;

      // Setup all other default properties.
      self._duration = 0;
      self._state = 'unloaded';
      self._sounds = [];
      self._endTimers = {};
      self._queue = [];
      self._playLock = false;

      // Setup event listeners.
      self._onend = o.onend ? [{fn: o.onend}] : [];
      self._onfade = o.onfade ? [{fn: o.onfade}] : [];
      self._onload = o.onload ? [{fn: o.onload}] : [];
      self._onloaderror = o.onloaderror ? [{fn: o.onloaderror}] : [];
      self._onplayerror = o.onplayerror ? [{fn: o.onplayerror}] : [];
      self._onpause = o.onpause ? [{fn: o.onpause}] : [];
      self._onplay = o.onplay ? [{fn: o.onplay}] : [];
      self._onstop = o.onstop ? [{fn: o.onstop}] : [];
      self._onmute = o.onmute ? [{fn: o.onmute}] : [];
      self._onvolume = o.onvolume ? [{fn: o.onvolume}] : [];
      self._onrate = o.onrate ? [{fn: o.onrate}] : [];
      self._onseek = o.onseek ? [{fn: o.onseek}] : [];
      self._onresume = [];

      // Web Audio or HTML5 Audio?
      self._webAudio = Howler.usingWebAudio && !self._html5;

      // Automatically try to enable audio on iOS.
      if (typeof Howler.ctx !== 'undefined' && Howler.ctx && Howler.mobileAutoEnable) {
        Howler._enableMobileAudio();
      }

      // Keep track of this Howl group in the global controller.
      Howler._howls.push(self);

      // If they selected autoplay, add a play event to the load queue.
      if (self._autoplay) {
        self._queue.push({
          event: 'play',
          action: function() {
            self.play();
          }
        });
      }

      // Load the source file unless otherwise specified.
      if (self._preload) {
        self.load();
      }

      return self;
    },

    /**
     * Load the audio file.
     * @return {Howler}
     */
    load: function() {
      var self = this;
      var url = null;

      // If no audio is available, quit immediately.
      if (Howler.noAudio) {
        self._emit('loaderror', null, 'No audio support.');
        return;
      }

      // Make sure our source is in an array.
      if (typeof self._src === 'string') {
        self._src = [self._src];
      }

      // Loop through the sources and pick the first one that is compatible.
      for (var i=0; i<self._src.length; i++) {
        var ext, str;

        if (self._format && self._format[i]) {
          // If an extension was specified, use that instead.
          ext = self._format[i];
        } else {
          // Make sure the source is a string.
          str = self._src[i];
          if (typeof str !== 'string') {
            self._emit('loaderror', null, 'Non-string found in selected audio sources - ignoring.');
            continue;
          }

          // Extract the file extension from the URL or base64 data URI.
          ext = /^data:audio\/([^;,]+);/i.exec(str);
          if (!ext) {
            ext = /\.([^.]+)$/.exec(str.split('?', 1)[0]);
          }

          if (ext) {
            ext = ext[1].toLowerCase();
          }
        }

        // Log a warning if no extension was found.
        if (!ext) {
          console.warn('No file extension was found. Consider using the "format" property or specify an extension.');
        }

        // Check if this extension is available.
        if (ext && Howler.codecs(ext)) {
          url = self._src[i];
          break;
        }
      }

      if (!url) {
        self._emit('loaderror', null, 'No codec support for selected audio sources.');
        return;
      }

      self._src = url;
      self._state = 'loading';

      // If the hosting page is HTTPS and the source isn't,
      // drop down to HTML5 Audio to avoid Mixed Content errors.
      if (window.location.protocol === 'https:' && url.slice(0, 5) === 'http:') {
        self._html5 = true;
        self._webAudio = false;
      }

      // Create a new sound object and add it to the pool.
      new Sound(self);

      // Load and decode the audio data for playback.
      if (self._webAudio) {
        loadBuffer(self);
      }

      return self;
    },

    /**
     * Play a sound or resume previous playback.
     * @param  {String/Number} sprite   Sprite name for sprite playback or sound id to continue previous.
     * @param  {Boolean} internal Internal Use: true prevents event firing.
     * @return {Number}          Sound ID.
     */
    play: function(sprite, internal) {
      var self = this;
      var id = null;

      // Determine if a sprite, sound id or nothing was passed
      if (typeof sprite === 'number') {
        id = sprite;
        sprite = null;
      } else if (typeof sprite === 'string' && self._state === 'loaded' && !self._sprite[sprite]) {
        // If the passed sprite doesn't exist, do nothing.
        return null;
      } else if (typeof sprite === 'undefined') {
        // Use the default sound sprite (plays the full audio length).
        sprite = '__default';

        // Check if there is a single paused sound that isn't ended.
        // If there is, play that sound. If not, continue as usual.
        var num = 0;
        for (var i=0; i<self._sounds.length; i++) {
          if (self._sounds[i]._paused && !self._sounds[i]._ended) {
            num++;
            id = self._sounds[i]._id;
          }
        }

        if (num === 1) {
          sprite = null;
        } else {
          id = null;
        }
      }

      // Get the selected node, or get one from the pool.
      var sound = id ? self._soundById(id) : self._inactiveSound();

      // If the sound doesn't exist, do nothing.
      if (!sound) {
        return null;
      }

      // Select the sprite definition.
      if (id && !sprite) {
        sprite = sound._sprite || '__default';
      }

      // If the sound hasn't loaded, we must wait to get the audio's duration.
      // We also need to wait to make sure we don't run into race conditions with
      // the order of function calls.
      if (self._state !== 'loaded') {
        // Set the sprite value on this sound.
        sound._sprite = sprite;

        // Makr this sounded as not ended in case another sound is played before this one loads.
        sound._ended = false;

        // Add the sound to the queue to be played on load.
        var soundId = sound._id;
        self._queue.push({
          event: 'play',
          action: function() {
            self.play(soundId);
          }
        });

        return soundId;
      }

      // Don't play the sound if an id was passed and it is already playing.
      if (id && !sound._paused) {
        // Trigger the play event, in order to keep iterating through queue.
        if (!internal) {
          self._loadQueue('play');
        }

        return sound._id;
      }

      // Make sure the AudioContext isn't suspended, and resume it if it is.
      if (self._webAudio) {
        Howler._autoResume();
      }

      // Determine how long to play for and where to start playing.
      var seek = Math.max(0, sound._seek > 0 ? sound._seek : self._sprite[sprite][0] / 1000);
      var duration = Math.max(0, ((self._sprite[sprite][0] + self._sprite[sprite][1]) / 1000) - seek);
      var timeout = (duration * 1000) / Math.abs(sound._rate);

      // Update the parameters of the sound
      sound._paused = false;
      sound._ended = false;
      sound._sprite = sprite;
      sound._seek = seek;
      sound._start = self._sprite[sprite][0] / 1000;
      sound._stop = (self._sprite[sprite][0] + self._sprite[sprite][1]) / 1000;
      sound._loop = !!(sound._loop || self._sprite[sprite][2]);

      // Begin the actual playback.
      var node = sound._node;
      if (self._webAudio) {
        // Fire this when the sound is ready to play to begin Web Audio playback.
        var playWebAudio = function() {
          self._refreshBuffer(sound);

          // Setup the playback params.
          var vol = (sound._muted || self._muted) ? 0 : sound._volume;
          node.gain.setValueAtTime(vol, Howler.ctx.currentTime);
          sound._playStart = Howler.ctx.currentTime;

          // Play the sound using the supported method.
          if (typeof node.bufferSource.start === 'undefined') {
            sound._loop ? node.bufferSource.noteGrainOn(0, seek, 86400) : node.bufferSource.noteGrainOn(0, seek, duration);
          } else {
            sound._loop ? node.bufferSource.start(0, seek, 86400) : node.bufferSource.start(0, seek, duration);
          }

          // Start a new timer if none is present.
          if (timeout !== Infinity) {
            self._endTimers[sound._id] = setTimeout(self._ended.bind(self, sound), timeout);
          }

          if (!internal) {
            setTimeout(function() {
              self._emit('play', sound._id);
            }, 0);
          }
        };

        if (Howler.state === 'running') {
          playWebAudio();
        } else {
          self.once('resume', playWebAudio);

          // Cancel the end timer.
          self._clearTimer(sound._id);
        }
      } else {
        // Fire this when the sound is ready to play to begin HTML5 Audio playback.
        var playHtml5 = function() {
          node.currentTime = seek;
          node.muted = sound._muted || self._muted || Howler._muted || node.muted;
          node.volume = sound._volume * Howler.volume();
          node.playbackRate = sound._rate;

          // Mobile browsers will throw an error if this is called without user interaction.
          try {
            var play = node.play();

            // Support older browsers that don't support promises, and thus don't have this issue.
            if (typeof Promise !== 'undefined' && play instanceof Promise) {
              // Implements a lock to prevent DOMException: The play() request was interrupted by a call to pause().
              self._playLock = true;

              // Releases the lock and executes queued actions.
              var runLoadQueue = function() {
                self._playLock = false;
                if (!internal) {
                  self._emit('play', sound._id);
                }
              };
              play.then(runLoadQueue, runLoadQueue);
            } else if (!internal) {
              self._emit('play', sound._id);
            }

            // If the node is still paused, then we can assume there was a playback issue.
            if (node.paused) {
              self._emit('playerror', sound._id, 'Playback was unable to start. This is most commonly an issue ' +
                'on mobile devices where playback was not within a user interaction.');
              return;
            }

            // Setup the end timer on sprites or listen for the ended event.
            if (sprite !== '__default') {
              self._endTimers[sound._id] = setTimeout(self._ended.bind(self, sound), timeout);
            } else {
              self._endTimers[sound._id] = function() {
                // Fire ended on this audio node.
                self._ended(sound);

                // Clear this listener.
                node.removeEventListener('ended', self._endTimers[sound._id], false);
              };
              node.addEventListener('ended', self._endTimers[sound._id], false);
            }
          } catch (err) {
            self._emit('playerror', sound._id, err);
          }
        };

        // Play immediately if ready, or wait for the 'canplaythrough'e vent.
        var loadedNoReadyState = (window && window.ejecta) || (!node.readyState && Howler._navigator.isCocoonJS);
        if (node.readyState >= 3 || loadedNoReadyState) {
          playHtml5();
        } else {
          var listener = function() {
            // Begin playback.
            playHtml5();

            // Clear this listener.
            node.removeEventListener(Howler._canPlayEvent, listener, false);
          };
          node.addEventListener(Howler._canPlayEvent, listener, false);

          // Cancel the end timer.
          self._clearTimer(sound._id);
        }
      }

      return sound._id;
    },

    /**
     * Pause playback and save current position.
     * @param  {Number} id The sound ID (empty to pause all in group).
     * @return {Howl}
     */
    pause: function(id) {
      var self = this;

      // If the sound hasn't loaded or a play() promise is pending, add it to the load queue to pause when capable.
      if (self._state !== 'loaded' || self._playLock) {
        self._queue.push({
          event: 'pause',
          action: function() {
            self.pause(id);
          }
        });

        return self;
      }

      // If no id is passed, get all ID's to be paused.
      var ids = self._getSoundIds(id);

      for (var i=0; i<ids.length; i++) {
        // Clear the end timer.
        self._clearTimer(ids[i]);

        // Get the sound.
        var sound = self._soundById(ids[i]);

        if (sound && !sound._paused) {
          // Reset the seek position.
          sound._seek = self.seek(ids[i]);
          sound._rateSeek = 0;
          sound._paused = true;

          // Stop currently running fades.
          self._stopFade(ids[i]);

          if (sound._node) {
            if (self._webAudio) {
              // Make sure the sound has been created.
              if (!sound._node.bufferSource) {
                continue;
              }

              if (typeof sound._node.bufferSource.stop === 'undefined') {
                sound._node.bufferSource.noteOff(0);
              } else {
                sound._node.bufferSource.stop(0);
              }

              // Clean up the buffer source.
              self._cleanBuffer(sound._node);
            } else if (!isNaN(sound._node.duration) || sound._node.duration === Infinity) {
              sound._node.pause();
            }
          }
        }

        // Fire the pause event, unless `true` is passed as the 2nd argument.
        if (!arguments[1]) {
          self._emit('pause', sound ? sound._id : null);
        }
      }

      return self;
    },

    /**
     * Stop playback and reset to start.
     * @param  {Number} id The sound ID (empty to stop all in group).
     * @param  {Boolean} internal Internal Use: true prevents event firing.
     * @return {Howl}
     */
    stop: function(id, internal) {
      var self = this;

      // If the sound hasn't loaded, add it to the load queue to stop when capable.
      if (self._state !== 'loaded') {
        self._queue.push({
          event: 'stop',
          action: function() {
            self.stop(id);
          }
        });

        return self;
      }

      // If no id is passed, get all ID's to be stopped.
      var ids = self._getSoundIds(id);

      for (var i=0; i<ids.length; i++) {
        // Clear the end timer.
        self._clearTimer(ids[i]);

        // Get the sound.
        var sound = self._soundById(ids[i]);

        if (sound) {
          // Reset the seek position.
          sound._seek = sound._start || 0;
          sound._rateSeek = 0;
          sound._paused = true;
          sound._ended = true;

          // Stop currently running fades.
          self._stopFade(ids[i]);

          if (sound._node) {
            if (self._webAudio) {
              // Make sure the sound's AudioBufferSourceNode has been created.
              if (sound._node.bufferSource) {
                if (typeof sound._node.bufferSource.stop === 'undefined') {
                  sound._node.bufferSource.noteOff(0);
                } else {
                  sound._node.bufferSource.stop(0);
                }

                // Clean up the buffer source.
                self._cleanBuffer(sound._node);
              }
            } else if (!isNaN(sound._node.duration) || sound._node.duration === Infinity) {
              sound._node.currentTime = sound._start || 0;
              sound._node.pause();
            }
          }

          if (!internal) {
            self._emit('stop', sound._id);
          }
        }
      }

      return self;
    },

    /**
     * Mute/unmute a single sound or all sounds in this Howl group.
     * @param  {Boolean} muted Set to true to mute and false to unmute.
     * @param  {Number} id    The sound ID to update (omit to mute/unmute all).
     * @return {Howl}
     */
    mute: function(muted, id) {
      var self = this;

      // If the sound hasn't loaded, add it to the load queue to mute when capable.
      if (self._state !== 'loaded') {
        self._queue.push({
          event: 'mute',
          action: function() {
            self.mute(muted, id);
          }
        });

        return self;
      }

      // If applying mute/unmute to all sounds, update the group's value.
      if (typeof id === 'undefined') {
        if (typeof muted === 'boolean') {
          self._muted = muted;
        } else {
          return self._muted;
        }
      }

      // If no id is passed, get all ID's to be muted.
      var ids = self._getSoundIds(id);

      for (var i=0; i<ids.length; i++) {
        // Get the sound.
        var sound = self._soundById(ids[i]);

        if (sound) {
          sound._muted = muted;

          // Cancel active fade and set the volume to the end value.
          if (sound._interval) {
            self._stopFade(sound._id);
          }

          if (self._webAudio && sound._node) {
            sound._node.gain.setValueAtTime(muted ? 0 : sound._volume, Howler.ctx.currentTime);
          } else if (sound._node) {
            sound._node.muted = Howler._muted ? true : muted;
          }

          self._emit('mute', sound._id);
        }
      }

      return self;
    },

    /**
     * Get/set the volume of this sound or of the Howl group. This method can optionally take 0, 1 or 2 arguments.
     *   volume() -> Returns the group's volume value.
     *   volume(id) -> Returns the sound id's current volume.
     *   volume(vol) -> Sets the volume of all sounds in this Howl group.
     *   volume(vol, id) -> Sets the volume of passed sound id.
     * @return {Howl/Number} Returns self or current volume.
     */
    volume: function() {
      var self = this;
      var args = arguments;
      var vol, id;

      // Determine the values based on arguments.
      if (args.length === 0) {
        // Return the value of the groups' volume.
        return self._volume;
      } else if (args.length === 1 || args.length === 2 && typeof args[1] === 'undefined') {
        // First check if this is an ID, and if not, assume it is a new volume.
        var ids = self._getSoundIds();
        var index = ids.indexOf(args[0]);
        if (index >= 0) {
          id = parseInt(args[0], 10);
        } else {
          vol = parseFloat(args[0]);
        }
      } else if (args.length >= 2) {
        vol = parseFloat(args[0]);
        id = parseInt(args[1], 10);
      }

      // Update the volume or return the current volume.
      var sound;
      if (typeof vol !== 'undefined' && vol >= 0 && vol <= 1) {
        // If the sound hasn't loaded, add it to the load queue to change volume when capable.
        if (self._state !== 'loaded') {
          self._queue.push({
            event: 'volume',
            action: function() {
              self.volume.apply(self, args);
            }
          });

          return self;
        }

        // Set the group volume.
        if (typeof id === 'undefined') {
          self._volume = vol;
        }

        // Update one or all volumes.
        id = self._getSoundIds(id);
        for (var i=0; i<id.length; i++) {
          // Get the sound.
          sound = self._soundById(id[i]);

          if (sound) {
            sound._volume = vol;

            // Stop currently running fades.
            if (!args[2]) {
              self._stopFade(id[i]);
            }

            if (self._webAudio && sound._node && !sound._muted) {
              sound._node.gain.setValueAtTime(vol, Howler.ctx.currentTime);
            } else if (sound._node && !sound._muted) {
              sound._node.volume = vol * Howler.volume();
            }

            self._emit('volume', sound._id);
          }
        }
      } else {
        sound = id ? self._soundById(id) : self._sounds[0];
        return sound ? sound._volume : 0;
      }

      return self;
    },

    /**
     * Fade a currently playing sound between two volumes (if no id is passsed, all sounds will fade).
     * @param  {Number} from The value to fade from (0.0 to 1.0).
     * @param  {Number} to   The volume to fade to (0.0 to 1.0).
     * @param  {Number} len  Time in milliseconds to fade.
     * @param  {Number} id   The sound id (omit to fade all sounds).
     * @return {Howl}
     */
    fade: function(from, to, len, id) {
      var self = this;

      // If the sound hasn't loaded, add it to the load queue to fade when capable.
      if (self._state !== 'loaded') {
        self._queue.push({
          event: 'fade',
          action: function() {
            self.fade(from, to, len, id);
          }
        });

        return self;
      }

      // Set the volume to the start position.
      self.volume(from, id);

      // Fade the volume of one or all sounds.
      var ids = self._getSoundIds(id);
      for (var i=0; i<ids.length; i++) {
        // Get the sound.
        var sound = self._soundById(ids[i]);

        // Create a linear fade or fall back to timeouts with HTML5 Audio.
        if (sound) {
          // Stop the previous fade if no sprite is being used (otherwise, volume handles this).
          if (!id) {
            self._stopFade(ids[i]);
          }

          // If we are using Web Audio, let the native methods do the actual fade.
          if (self._webAudio && !sound._muted) {
            var currentTime = Howler.ctx.currentTime;
            var end = currentTime + (len / 1000);
            sound._volume = from;
            sound._node.gain.setValueAtTime(from, currentTime);
            sound._node.gain.linearRampToValueAtTime(to, end);
          }

          self._startFadeInterval(sound, from, to, len, ids[i], typeof id === 'undefined');
        }
      }

      return self;
    },

    /**
     * Starts the internal interval to fade a sound.
     * @param  {Object} sound Reference to sound to fade.
     * @param  {Number} from The value to fade from (0.0 to 1.0).
     * @param  {Number} to   The volume to fade to (0.0 to 1.0).
     * @param  {Number} len  Time in milliseconds to fade.
     * @param  {Number} id   The sound id to fade.
     * @param  {Boolean} isGroup   If true, set the volume on the group.
     */
    _startFadeInterval: function(sound, from, to, len, id, isGroup) {
      var self = this;
      var vol = from;
      var diff = to - from;
      var steps = Math.abs(diff / 0.01);
      var stepLen = Math.max(4, (steps > 0) ? len / steps : len);
      var lastTick = Date.now();

      // Store the value being faded to.
      sound._fadeTo = to;

      // Update the volume value on each interval tick.
      sound._interval = setInterval(function() {
        // Update the volume based on the time since the last tick.
        var tick = (Date.now() - lastTick) / len;
        lastTick = Date.now();
        vol += diff * tick;

        // Make sure the volume is in the right bounds.
        vol = Math.max(0, vol);
        vol = Math.min(1, vol);

        // Round to within 2 decimal points.
        vol = Math.round(vol * 100) / 100;

        // Change the volume.
        if (self._webAudio) {
          sound._volume = vol;
        } else {
          self.volume(vol, sound._id, true);
        }

        // Set the group's volume.
        if (isGroup) {
          self._volume = vol;
        }

        // When the fade is complete, stop it and fire event.
        if ((to < from && vol <= to) || (to > from && vol >= to)) {
          clearInterval(sound._interval);
          sound._interval = null;
          sound._fadeTo = null;
          self.volume(to, sound._id);
          self._emit('fade', sound._id);
        }
      }, stepLen);
    },

    /**
     * Internal method that stops the currently playing fade when
     * a new fade starts, volume is changed or the sound is stopped.
     * @param  {Number} id The sound id.
     * @return {Howl}
     */
    _stopFade: function(id) {
      var self = this;
      var sound = self._soundById(id);

      if (sound && sound._interval) {
        if (self._webAudio) {
          sound._node.gain.cancelScheduledValues(Howler.ctx.currentTime);
        }

        clearInterval(sound._interval);
        sound._interval = null;
        self.volume(sound._fadeTo, id);
        sound._fadeTo = null;
        self._emit('fade', id);
      }

      return self;
    },

    /**
     * Get/set the loop parameter on a sound. This method can optionally take 0, 1 or 2 arguments.
     *   loop() -> Returns the group's loop value.
     *   loop(id) -> Returns the sound id's loop value.
     *   loop(loop) -> Sets the loop value for all sounds in this Howl group.
     *   loop(loop, id) -> Sets the loop value of passed sound id.
     * @return {Howl/Boolean} Returns self or current loop value.
     */
    loop: function() {
      var self = this;
      var args = arguments;
      var loop, id, sound;

      // Determine the values for loop and id.
      if (args.length === 0) {
        // Return the grou's loop value.
        return self._loop;
      } else if (args.length === 1) {
        if (typeof args[0] === 'boolean') {
          loop = args[0];
          self._loop = loop;
        } else {
          // Return this sound's loop value.
          sound = self._soundById(parseInt(args[0], 10));
          return sound ? sound._loop : false;
        }
      } else if (args.length === 2) {
        loop = args[0];
        id = parseInt(args[1], 10);
      }

      // If no id is passed, get all ID's to be looped.
      var ids = self._getSoundIds(id);
      for (var i=0; i<ids.length; i++) {
        sound = self._soundById(ids[i]);

        if (sound) {
          sound._loop = loop;
          if (self._webAudio && sound._node && sound._node.bufferSource) {
            sound._node.bufferSource.loop = loop;
            if (loop) {
              sound._node.bufferSource.loopStart = sound._start || 0;
              sound._node.bufferSource.loopEnd = sound._stop;
            }
          }
        }
      }

      return self;
    },

    /**
     * Get/set the playback rate of a sound. This method can optionally take 0, 1 or 2 arguments.
     *   rate() -> Returns the first sound node's current playback rate.
     *   rate(id) -> Returns the sound id's current playback rate.
     *   rate(rate) -> Sets the playback rate of all sounds in this Howl group.
     *   rate(rate, id) -> Sets the playback rate of passed sound id.
     * @return {Howl/Number} Returns self or the current playback rate.
     */
    rate: function() {
      var self = this;
      var args = arguments;
      var rate, id;

      // Determine the values based on arguments.
      if (args.length === 0) {
        // We will simply return the current rate of the first node.
        id = self._sounds[0]._id;
      } else if (args.length === 1) {
        // First check if this is an ID, and if not, assume it is a new rate value.
        var ids = self._getSoundIds();
        var index = ids.indexOf(args[0]);
        if (index >= 0) {
          id = parseInt(args[0], 10);
        } else {
          rate = parseFloat(args[0]);
        }
      } else if (args.length === 2) {
        rate = parseFloat(args[0]);
        id = parseInt(args[1], 10);
      }

      // Update the playback rate or return the current value.
      var sound;
      if (typeof rate === 'number') {
        // If the sound hasn't loaded, add it to the load queue to change playback rate when capable.
        if (self._state !== 'loaded') {
          self._queue.push({
            event: 'rate',
            action: function() {
              self.rate.apply(self, args);
            }
          });

          return self;
        }

        // Set the group rate.
        if (typeof id === 'undefined') {
          self._rate = rate;
        }

        // Update one or all volumes.
        id = self._getSoundIds(id);
        for (var i=0; i<id.length; i++) {
          // Get the sound.
          sound = self._soundById(id[i]);

          if (sound) {
            // Keep track of our position when the rate changed and update the playback
            // start position so we can properly adjust the seek position for time elapsed.
            sound._rateSeek = self.seek(id[i]);
            sound._playStart = self._webAudio ? Howler.ctx.currentTime : sound._playStart;
            sound._rate = rate;

            // Change the playback rate.
            if (self._webAudio && sound._node && sound._node.bufferSource) {
              sound._node.bufferSource.playbackRate.setValueAtTime(rate, Howler.ctx.currentTime);
            } else if (sound._node) {
              sound._node.playbackRate = rate;
            }

            // Reset the timers.
            var seek = self.seek(id[i]);
            var duration = ((self._sprite[sound._sprite][0] + self._sprite[sound._sprite][1]) / 1000) - seek;
            var timeout = (duration * 1000) / Math.abs(sound._rate);

            // Start a new end timer if sound is already playing.
            if (self._endTimers[id[i]] || !sound._paused) {
              self._clearTimer(id[i]);
              self._endTimers[id[i]] = setTimeout(self._ended.bind(self, sound), timeout);
            }

            self._emit('rate', sound._id);
          }
        }
      } else {
        sound = self._soundById(id);
        return sound ? sound._rate : self._rate;
      }

      return self;
    },

    /**
     * Get/set the seek position of a sound. This method can optionally take 0, 1 or 2 arguments.
     *   seek() -> Returns the first sound node's current seek position.
     *   seek(id) -> Returns the sound id's current seek position.
     *   seek(seek) -> Sets the seek position of the first sound node.
     *   seek(seek, id) -> Sets the seek position of passed sound id.
     * @return {Howl/Number} Returns self or the current seek position.
     */
    seek: function() {
      var self = this;
      var args = arguments;
      var seek, id;

      // Determine the values based on arguments.
      if (args.length === 0) {
        // We will simply return the current position of the first node.
        id = self._sounds[0]._id;
      } else if (args.length === 1) {
        // First check if this is an ID, and if not, assume it is a new seek position.
        var ids = self._getSoundIds();
        var index = ids.indexOf(args[0]);
        if (index >= 0) {
          id = parseInt(args[0], 10);
        } else if (self._sounds.length) {
          id = self._sounds[0]._id;
          seek = parseFloat(args[0]);
        }
      } else if (args.length === 2) {
        seek = parseFloat(args[0]);
        id = parseInt(args[1], 10);
      }

      // If there is no ID, bail out.
      if (typeof id === 'undefined') {
        return self;
      }

      // If the sound hasn't loaded, add it to the load queue to seek when capable.
      if (self._state !== 'loaded') {
        self._queue.push({
          event: 'seek',
          action: function() {
            self.seek.apply(self, args);
          }
        });

        return self;
      }

      // Get the sound.
      var sound = self._soundById(id);

      if (sound) {
        if (typeof seek === 'number' && seek >= 0) {
          // Pause the sound and update position for restarting playback.
          var playing = self.playing(id);
          if (playing) {
            self.pause(id, true);
          }

          // Move the position of the track and cancel timer.
          sound._seek = seek;
          sound._ended = false;
          self._clearTimer(id);

          // Restart the playback if the sound was playing.
          if (playing) {
            self.play(id, true);
          }

          // Update the seek position for HTML5 Audio.
          if (!self._webAudio && sound._node) {
            sound._node.currentTime = seek;
          }

          // Wait for the play lock to be unset before emitting (HTML5 Audio).
          if (playing && !self._webAudio) {
            var emitSeek = function() {
              if (!self._playLock) {
                self._emit('seek', id);
              } else {
                setTimeout(emitSeek, 0);
              }
            };
            setTimeout(emitSeek, 0);
          } else {
            self._emit('seek', id);
          }
        } else {
          if (self._webAudio) {
            var realTime = self.playing(id) ? Howler.ctx.currentTime - sound._playStart : 0;
            var rateSeek = sound._rateSeek ? sound._rateSeek - sound._seek : 0;
            return sound._seek + (rateSeek + realTime * Math.abs(sound._rate));
          } else {
            return sound._node.currentTime;
          }
        }
      }

      return self;
    },

    /**
     * Check if a specific sound is currently playing or not (if id is provided), or check if at least one of the sounds in the group is playing or not.
     * @param  {Number}  id The sound id to check. If none is passed, the whole sound group is checked.
     * @return {Boolean} True if playing and false if not.
     */
    playing: function(id) {
      var self = this;

      // Check the passed sound ID (if any).
      if (typeof id === 'number') {
        var sound = self._soundById(id);
        return sound ? !sound._paused : false;
      }

      // Otherwise, loop through all sounds and check if any are playing.
      for (var i=0; i<self._sounds.length; i++) {
        if (!self._sounds[i]._paused) {
          return true;
        }
      }

      return false;
    },

    /**
     * Get the duration of this sound. Passing a sound id will return the sprite duration.
     * @param  {Number} id The sound id to check. If none is passed, return full source duration.
     * @return {Number} Audio duration in seconds.
     */
    duration: function(id) {
      var self = this;
      var duration = self._duration;

      // If we pass an ID, get the sound and return the sprite length.
      var sound = self._soundById(id);
      if (sound) {
        duration = self._sprite[sound._sprite][1] / 1000;
      }

      return duration;
    },

    /**
     * Returns the current loaded state of this Howl.
     * @return {String} 'unloaded', 'loading', 'loaded'
     */
    state: function() {
      return this._state;
    },

    /**
     * Unload and destroy the current Howl object.
     * This will immediately stop all sound instances attached to this group.
     */
    unload: function() {
      var self = this;

      // Stop playing any active sounds.
      var sounds = self._sounds;
      for (var i=0; i<sounds.length; i++) {
        // Stop the sound if it is currently playing.
        if (!sounds[i]._paused) {
          self.stop(sounds[i]._id);
        }

        // Remove the source or disconnect.
        if (!self._webAudio) {
          // Set the source to 0-second silence to stop any downloading (except in IE).
          var checkIE = /MSIE |Trident\//.test(Howler._navigator && Howler._navigator.userAgent);
          if (!checkIE) {
            sounds[i]._node.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
          }

          // Remove any event listeners.
          sounds[i]._node.removeEventListener('error', sounds[i]._errorFn, false);
          sounds[i]._node.removeEventListener(Howler._canPlayEvent, sounds[i]._loadFn, false);
        }

        // Empty out all of the nodes.
        delete sounds[i]._node;

        // Make sure all timers are cleared out.
        self._clearTimer(sounds[i]._id);

        // Remove the references in the global Howler object.
        var index = Howler._howls.indexOf(self);
        if (index >= 0) {
          Howler._howls.splice(index, 1);
        }
      }

      // Delete this sound from the cache (if no other Howl is using it).
      var remCache = true;
      for (i=0; i<Howler._howls.length; i++) {
        if (Howler._howls[i]._src === self._src) {
          remCache = false;
          break;
        }
      }

      if (cache && remCache) {
        delete cache[self._src];
      }

      // Clear global errors.
      Howler.noAudio = false;

      // Clear out `self`.
      self._state = 'unloaded';
      self._sounds = [];
      self = null;

      return null;
    },

    /**
     * Listen to a custom event.
     * @param  {String}   event Event name.
     * @param  {Function} fn    Listener to call.
     * @param  {Number}   id    (optional) Only listen to events for this sound.
     * @param  {Number}   once  (INTERNAL) Marks event to fire only once.
     * @return {Howl}
     */
    on: function(event, fn, id, once) {
      var self = this;
      var events = self['_on' + event];

      if (typeof fn === 'function') {
        events.push(once ? {id: id, fn: fn, once: once} : {id: id, fn: fn});
      }

      return self;
    },

    /**
     * Remove a custom event. Call without parameters to remove all events.
     * @param  {String}   event Event name.
     * @param  {Function} fn    Listener to remove. Leave empty to remove all.
     * @param  {Number}   id    (optional) Only remove events for this sound.
     * @return {Howl}
     */
    off: function(event, fn, id) {
      var self = this;
      var events = self['_on' + event];
      var i = 0;

      // Allow passing just an event and ID.
      if (typeof fn === 'number') {
        id = fn;
        fn = null;
      }

      if (fn || id) {
        // Loop through event store and remove the passed function.
        for (i=0; i<events.length; i++) {
          var isId = (id === events[i].id);
          if (fn === events[i].fn && isId || !fn && isId) {
            events.splice(i, 1);
            break;
          }
        }
      } else if (event) {
        // Clear out all events of this type.
        self['_on' + event] = [];
      } else {
        // Clear out all events of every type.
        var keys = Object.keys(self);
        for (i=0; i<keys.length; i++) {
          if ((keys[i].indexOf('_on') === 0) && Array.isArray(self[keys[i]])) {
            self[keys[i]] = [];
          }
        }
      }

      return self;
    },

    /**
     * Listen to a custom event and remove it once fired.
     * @param  {String}   event Event name.
     * @param  {Function} fn    Listener to call.
     * @param  {Number}   id    (optional) Only listen to events for this sound.
     * @return {Howl}
     */
    once: function(event, fn, id) {
      var self = this;

      // Setup the event listener.
      self.on(event, fn, id, 1);

      return self;
    },

    /**
     * Emit all events of a specific type and pass the sound id.
     * @param  {String} event Event name.
     * @param  {Number} id    Sound ID.
     * @param  {Number} msg   Message to go with event.
     * @return {Howl}
     */
    _emit: function(event, id, msg) {
      var self = this;
      var events = self['_on' + event];

      // Loop through event store and fire all functions.
      for (var i=events.length-1; i>=0; i--) {
        // Only fire the listener if the correct ID is used.
        if (!events[i].id || events[i].id === id || event === 'load') {
          setTimeout(function(fn) {
            fn.call(this, id, msg);
          }.bind(self, events[i].fn), 0);

          // If this event was setup with `once`, remove it.
          if (events[i].once) {
            self.off(event, events[i].fn, events[i].id);
          }
        }
      }

      // Pass the event type into load queue so that it can continue stepping.
      self._loadQueue(event);

      return self;
    },

    /**
     * Queue of actions initiated before the sound has loaded.
     * These will be called in sequence, with the next only firing
     * after the previous has finished executing (even if async like play).
     * @return {Howl}
     */
    _loadQueue: function(event) {
      var self = this;

      if (self._queue.length > 0) {
        var task = self._queue[0];

        // Remove this task if a matching event was passed.
        if (task.event === event) {
          self._queue.shift();
          self._loadQueue();
        }

        // Run the task if no event type is passed.
        if (!event) {
          task.action();
        }
      }

      return self;
    },

    /**
     * Fired when playback ends at the end of the duration.
     * @param  {Sound} sound The sound object to work with.
     * @return {Howl}
     */
    _ended: function(sound) {
      var self = this;
      var sprite = sound._sprite;

      // If we are using IE and there was network latency we may be clipping
      // audio before it completes playing. Lets check the node to make sure it
      // believes it has completed, before ending the playback.
      if (!self._webAudio && sound._node && !sound._node.paused && !sound._node.ended && sound._node.currentTime < sound._stop) {
        setTimeout(self._ended.bind(self, sound), 100);
        return self;
      }

      // Should this sound loop?
      var loop = !!(sound._loop || self._sprite[sprite][2]);

      // Fire the ended event.
      self._emit('end', sound._id);

      // Restart the playback for HTML5 Audio loop.
      if (!self._webAudio && loop) {
        self.stop(sound._id, true).play(sound._id);
      }

      // Restart this timer if on a Web Audio loop.
      if (self._webAudio && loop) {
        self._emit('play', sound._id);
        sound._seek = sound._start || 0;
        sound._rateSeek = 0;
        sound._playStart = Howler.ctx.currentTime;

        var timeout = ((sound._stop - sound._start) * 1000) / Math.abs(sound._rate);
        self._endTimers[sound._id] = setTimeout(self._ended.bind(self, sound), timeout);
      }

      // Mark the node as paused.
      if (self._webAudio && !loop) {
        sound._paused = true;
        sound._ended = true;
        sound._seek = sound._start || 0;
        sound._rateSeek = 0;
        self._clearTimer(sound._id);

        // Clean up the buffer source.
        self._cleanBuffer(sound._node);

        // Attempt to auto-suspend AudioContext if no sounds are still playing.
        Howler._autoSuspend();
      }

      // When using a sprite, end the track.
      if (!self._webAudio && !loop) {
        self.stop(sound._id);
      }

      return self;
    },

    /**
     * Clear the end timer for a sound playback.
     * @param  {Number} id The sound ID.
     * @return {Howl}
     */
    _clearTimer: function(id) {
      var self = this;

      if (self._endTimers[id]) {
        // Clear the timeout or remove the ended listener.
        if (typeof self._endTimers[id] !== 'function') {
          clearTimeout(self._endTimers[id]);
        } else {
          var sound = self._soundById(id);
          if (sound && sound._node) {
            sound._node.removeEventListener('ended', self._endTimers[id], false);
          }
        }

        delete self._endTimers[id];
      }

      return self;
    },

    /**
     * Return the sound identified by this ID, or return null.
     * @param  {Number} id Sound ID
     * @return {Object}    Sound object or null.
     */
    _soundById: function(id) {
      var self = this;

      // Loop through all sounds and find the one with this ID.
      for (var i=0; i<self._sounds.length; i++) {
        if (id === self._sounds[i]._id) {
          return self._sounds[i];
        }
      }

      return null;
    },

    /**
     * Return an inactive sound from the pool or create a new one.
     * @return {Sound} Sound playback object.
     */
    _inactiveSound: function() {
      var self = this;

      self._drain();

      // Find the first inactive node to recycle.
      for (var i=0; i<self._sounds.length; i++) {
        if (self._sounds[i]._ended) {
          return self._sounds[i].reset();
        }
      }

      // If no inactive node was found, create a new one.
      return new Sound(self);
    },

    /**
     * Drain excess inactive sounds from the pool.
     */
    _drain: function() {
      var self = this;
      var limit = self._pool;
      var cnt = 0;
      var i = 0;

      // If there are less sounds than the max pool size, we are done.
      if (self._sounds.length < limit) {
        return;
      }

      // Count the number of inactive sounds.
      for (i=0; i<self._sounds.length; i++) {
        if (self._sounds[i]._ended) {
          cnt++;
        }
      }

      // Remove excess inactive sounds, going in reverse order.
      for (i=self._sounds.length - 1; i>=0; i--) {
        if (cnt <= limit) {
          return;
        }

        if (self._sounds[i]._ended) {
          // Disconnect the audio source when using Web Audio.
          if (self._webAudio && self._sounds[i]._node) {
            self._sounds[i]._node.disconnect(0);
          }

          // Remove sounds until we have the pool size.
          self._sounds.splice(i, 1);
          cnt--;
        }
      }
    },

    /**
     * Get all ID's from the sounds pool.
     * @param  {Number} id Only return one ID if one is passed.
     * @return {Array}    Array of IDs.
     */
    _getSoundIds: function(id) {
      var self = this;

      if (typeof id === 'undefined') {
        var ids = [];
        for (var i=0; i<self._sounds.length; i++) {
          ids.push(self._sounds[i]._id);
        }

        return ids;
      } else {
        return [id];
      }
    },

    /**
     * Load the sound back into the buffer source.
     * @param  {Sound} sound The sound object to work with.
     * @return {Howl}
     */
    _refreshBuffer: function(sound) {
      var self = this;

      // Setup the buffer source for playback.
      sound._node.bufferSource = Howler.ctx.createBufferSource();
      sound._node.bufferSource.buffer = cache[self._src];

      // Connect to the correct node.
      if (sound._panner) {
        sound._node.bufferSource.connect(sound._panner);
      } else {
        sound._node.bufferSource.connect(sound._node);
      }

      // Setup looping and playback rate.
      sound._node.bufferSource.loop = sound._loop;
      if (sound._loop) {
        sound._node.bufferSource.loopStart = sound._start || 0;
        sound._node.bufferSource.loopEnd = sound._stop;
      }
      sound._node.bufferSource.playbackRate.setValueAtTime(sound._rate, Howler.ctx.currentTime);

      return self;
    },

    /**
     * Prevent memory leaks by cleaning up the buffer source after playback.
     * @param  {Object} node Sound's audio node containing the buffer source.
     * @return {Howl}
     */
    _cleanBuffer: function(node) {
      var self = this;

      if (Howler._scratchBuffer) {
        node.bufferSource.onended = null;
        node.bufferSource.disconnect(0);
        try { node.bufferSource.buffer = Howler._scratchBuffer; } catch(e) {}
      }
      node.bufferSource = null;

      return self;
    }
  };

  /** Single Sound Methods **/
  /***************************************************************************/

  /**
   * Setup the sound object, which each node attached to a Howl group is contained in.
   * @param {Object} howl The Howl parent group.
   */
  var Sound = function(howl) {
    this._parent = howl;
    this.init();
  };
  Sound.prototype = {
    /**
     * Initialize a new Sound object.
     * @return {Sound}
     */
    init: function() {
      var self = this;
      var parent = self._parent;

      // Setup the default parameters.
      self._muted = parent._muted;
      self._loop = parent._loop;
      self._volume = parent._volume;
      self._rate = parent._rate;
      self._seek = 0;
      self._paused = true;
      self._ended = true;
      self._sprite = '__default';

      // Generate a unique ID for this sound.
      self._id = ++Howler._counter;

      // Add itself to the parent's pool.
      parent._sounds.push(self);

      // Create the new node.
      self.create();

      return self;
    },

    /**
     * Create and setup a new sound object, whether HTML5 Audio or Web Audio.
     * @return {Sound}
     */
    create: function() {
      var self = this;
      var parent = self._parent;
      var volume = (Howler._muted || self._muted || self._parent._muted) ? 0 : self._volume;

      if (parent._webAudio) {
        // Create the gain node for controlling volume (the source will connect to this).
        self._node = (typeof Howler.ctx.createGain === 'undefined') ? Howler.ctx.createGainNode() : Howler.ctx.createGain();
        self._node.gain.setValueAtTime(volume, Howler.ctx.currentTime);
        self._node.paused = true;
        self._node.connect(Howler.masterGain);
      } else {
        self._node = new Audio();

        // Listen for errors (http://dev.w3.org/html5/spec-author-view/spec.html#mediaerror).
        self._errorFn = self._errorListener.bind(self);
        self._node.addEventListener('error', self._errorFn, false);

        // Listen for 'canplaythrough' event to let us know the sound is ready.
        self._loadFn = self._loadListener.bind(self);
        self._node.addEventListener(Howler._canPlayEvent, self._loadFn, false);

        // Setup the new audio node.
        self._node.src = parent._src;
        self._node.preload = 'auto';
        self._node.volume = volume * Howler.volume();

        // Begin loading the source.
        self._node.load();
      }

      return self;
    },

    /**
     * Reset the parameters of this sound to the original state (for recycle).
     * @return {Sound}
     */
    reset: function() {
      var self = this;
      var parent = self._parent;

      // Reset all of the parameters of this sound.
      self._muted = parent._muted;
      self._loop = parent._loop;
      self._volume = parent._volume;
      self._rate = parent._rate;
      self._seek = 0;
      self._rateSeek = 0;
      self._paused = true;
      self._ended = true;
      self._sprite = '__default';

      // Generate a new ID so that it isn't confused with the previous sound.
      self._id = ++Howler._counter;

      return self;
    },

    /**
     * HTML5 Audio error listener callback.
     */
    _errorListener: function() {
      var self = this;

      // Fire an error event and pass back the code.
      self._parent._emit('loaderror', self._id, self._node.error ? self._node.error.code : 0);

      // Clear the event listener.
      self._node.removeEventListener('error', self._errorFn, false);
    },

    /**
     * HTML5 Audio canplaythrough listener callback.
     */
    _loadListener: function() {
      var self = this;
      var parent = self._parent;

      // Round up the duration to account for the lower precision in HTML5 Audio.
      parent._duration = Math.ceil(self._node.duration * 10) / 10;

      // Setup a sprite if none is defined.
      if (Object.keys(parent._sprite).length === 0) {
        parent._sprite = {__default: [0, parent._duration * 1000]};
      }

      if (parent._state !== 'loaded') {
        parent._state = 'loaded';
        parent._emit('load');
        parent._loadQueue();
      }

      // Clear the event listener.
      self._node.removeEventListener(Howler._canPlayEvent, self._loadFn, false);
    }
  };

  /** Helper Methods **/
  /***************************************************************************/

  var cache = {};

  /**
   * Buffer a sound from URL, Data URI or cache and decode to audio source (Web Audio API).
   * @param  {Howl} self
   */
  var loadBuffer = function(self) {
    var url = self._src;

    // Check if the buffer has already been cached and use it instead.
    if (cache[url]) {
      // Set the duration from the cache.
      self._duration = cache[url].duration;

      // Load the sound into this Howl.
      loadSound(self);

      return;
    }

    if (/^data:[^;]+;base64,/.test(url)) {
      // Decode the base64 data URI without XHR, since some browsers don't support it.
      var data = atob(url.split(',')[1]);
      var dataView = new Uint8Array(data.length);
      for (var i=0; i<data.length; ++i) {
        dataView[i] = data.charCodeAt(i);
      }

      decodeAudioData(dataView.buffer, self);
    } else {
      // Load the buffer from the URL.
      var xhr = new XMLHttpRequest();
      xhr.open('GET', url, true);
      xhr.withCredentials = self._xhrWithCredentials;
      xhr.responseType = 'arraybuffer';
      xhr.onload = function() {
        // Make sure we get a successful response back.
        var code = (xhr.status + '')[0];
        if (code !== '0' && code !== '2' && code !== '3') {
          self._emit('loaderror', null, 'Failed loading audio file with status: ' + xhr.status + '.');
          return;
        }

        decodeAudioData(xhr.response, self);
      };
      xhr.onerror = function() {
        // If there is an error, switch to HTML5 Audio.
        if (self._webAudio) {
          self._html5 = true;
          self._webAudio = false;
          self._sounds = [];
          delete cache[url];
          self.load();
        }
      };
      safeXhrSend(xhr);
    }
  };

  /**
   * Send the XHR request wrapped in a try/catch.
   * @param  {Object} xhr XHR to send.
   */
  var safeXhrSend = function(xhr) {
    try {
      xhr.send();
    } catch (e) {
      xhr.onerror();
    }
  };

  /**
   * Decode audio data from an array buffer.
   * @param  {ArrayBuffer} arraybuffer The audio data.
   * @param  {Howl}        self
   */
  var decodeAudioData = function(arraybuffer, self) {
    // Decode the buffer into an audio source.
    Howler.ctx.decodeAudioData(arraybuffer, function(buffer) {
      if (buffer && self._sounds.length > 0) {
        cache[self._src] = buffer;
        loadSound(self, buffer);
      }
    }, function() {
      self._emit('loaderror', null, 'Decoding audio data failed.');
    });
  };

  /**
   * Sound is now loaded, so finish setting everything up and fire the loaded event.
   * @param  {Howl} self
   * @param  {Object} buffer The decoded buffer sound source.
   */
  var loadSound = function(self, buffer) {
    // Set the duration.
    if (buffer && !self._duration) {
      self._duration = buffer.duration;
    }

    // Setup a sprite if none is defined.
    if (Object.keys(self._sprite).length === 0) {
      self._sprite = {__default: [0, self._duration * 1000]};
    }

    // Fire the loaded event.
    if (self._state !== 'loaded') {
      self._state = 'loaded';
      self._emit('load');
      self._loadQueue();
    }
  };

  /**
   * Setup the audio context when available, or switch to HTML5 Audio mode.
   */
  var setupAudioContext = function() {
    // Check if we are using Web Audio and setup the AudioContext if we are.
    try {
      if (typeof AudioContext !== 'undefined') {
        Howler.ctx = new AudioContext();
      } else if (typeof webkitAudioContext !== 'undefined') {
        Howler.ctx = new webkitAudioContext();
      } else {
        Howler.usingWebAudio = false;
      }
    } catch(e) {
      Howler.usingWebAudio = false;
    }

    // Check if a webview is being used on iOS8 or earlier (rather than the browser).
    // If it is, disable Web Audio as it causes crashing.
    var iOS = (/iP(hone|od|ad)/.test(Howler._navigator && Howler._navigator.platform));
    var appVersion = Howler._navigator && Howler._navigator.appVersion.match(/OS (\d+)_(\d+)_?(\d+)?/);
    var version = appVersion ? parseInt(appVersion[1], 10) : null;
    if (iOS && version && version < 9) {
      var safari = /safari/.test(Howler._navigator && Howler._navigator.userAgent.toLowerCase());
      if (Howler._navigator && Howler._navigator.standalone && !safari || Howler._navigator && !Howler._navigator.standalone && !safari) {
        Howler.usingWebAudio = false;
      }
    }

    // Create and expose the master GainNode when using Web Audio (useful for plugins or advanced usage).
    if (Howler.usingWebAudio) {
      Howler.masterGain = (typeof Howler.ctx.createGain === 'undefined') ? Howler.ctx.createGainNode() : Howler.ctx.createGain();
      Howler.masterGain.gain.setValueAtTime(Howler._muted ? 0 : 1, Howler.ctx.currentTime);
      Howler.masterGain.connect(Howler.ctx.destination);
    }

    // Re-run the setup on Howler.
    Howler._setup();
  };

  // Add support for AMD (Asynchronous Module Definition) libraries such as require.js.
  if (typeof define === 'function' && define.amd) {
    define([], function() {
      return {
        Howler: Howler,
        Howl: Howl
      };
    });
  }

  // Add support for CommonJS libraries such as browserify.
  if (typeof exports !== 'undefined') {
    exports.Howler = Howler;
    exports.Howl = Howl;
  }

  // Define globally in case AMD is not available or unused.
  if (typeof window !== 'undefined') {
    window.HowlerGlobal = HowlerGlobal;
    window.Howler = Howler;
    window.Howl = Howl;
    window.Sound = Sound;
  } else if (typeof global !== 'undefined') { // Add to global in Node.js (for testing, etc).
    global.HowlerGlobal = HowlerGlobal;
    global.Howler = Howler;
    global.Howl = Howl;
    global.Sound = Sound;
  }
})();


/*!
 *  Spatial Plugin - Adds support for stereo and 3D audio where Web Audio is supported.
 *  
 *  howler.js v2.0.9
 *  howlerjs.com
 *
 *  (c) 2013-2018, James Simpson of GoldFire Studios
 *  goldfirestudios.com
 *
 *  MIT License
 */

(function() {

  'use strict';

  // Setup default properties.
  HowlerGlobal.prototype._pos = [0, 0, 0];
  HowlerGlobal.prototype._orientation = [0, 0, -1, 0, 1, 0];
  
  /** Global Methods **/
  /***************************************************************************/

  /**
   * Helper method to update the stereo panning position of all current Howls.
   * Future Howls will not use this value unless explicitly set.
   * @param  {Number} pan A value of -1.0 is all the way left and 1.0 is all the way right.
   * @return {Howler/Number}     Self or current stereo panning value.
   */
  HowlerGlobal.prototype.stereo = function(pan) {
    var self = this;

    // Stop right here if not using Web Audio.
    if (!self.ctx || !self.ctx.listener) {
      return self;
    }

    // Loop through all Howls and update their stereo panning.
    for (var i=self._howls.length-1; i>=0; i--) {
      self._howls[i].stereo(pan);
    }

    return self;
  };

  /**
   * Get/set the position of the listener in 3D cartesian space. Sounds using
   * 3D position will be relative to the listener's position.
   * @param  {Number} x The x-position of the listener.
   * @param  {Number} y The y-position of the listener.
   * @param  {Number} z The z-position of the listener.
   * @return {Howler/Array}   Self or current listener position.
   */
  HowlerGlobal.prototype.pos = function(x, y, z) {
    var self = this;

    // Stop right here if not using Web Audio.
    if (!self.ctx || !self.ctx.listener) {
      return self;
    }

    // Set the defaults for optional 'y' & 'z'.
    y = (typeof y !== 'number') ? self._pos[1] : y;
    z = (typeof z !== 'number') ? self._pos[2] : z;

    if (typeof x === 'number') {
      self._pos = [x, y, z];
      self.ctx.listener.setPosition(self._pos[0], self._pos[1], self._pos[2]);
    } else {
      return self._pos;
    }

    return self;
  };

  /**
   * Get/set the direction the listener is pointing in the 3D cartesian space.
   * A front and up vector must be provided. The front is the direction the
   * face of the listener is pointing, and up is the direction the top of the
   * listener is pointing. Thus, these values are expected to be at right angles
   * from each other.
   * @param  {Number} x   The x-orientation of the listener.
   * @param  {Number} y   The y-orientation of the listener.
   * @param  {Number} z   The z-orientation of the listener.
   * @param  {Number} xUp The x-orientation of the top of the listener.
   * @param  {Number} yUp The y-orientation of the top of the listener.
   * @param  {Number} zUp The z-orientation of the top of the listener.
   * @return {Howler/Array}     Returns self or the current orientation vectors.
   */
  HowlerGlobal.prototype.orientation = function(x, y, z, xUp, yUp, zUp) {
    var self = this;

    // Stop right here if not using Web Audio.
    if (!self.ctx || !self.ctx.listener) {
      return self;
    }

    // Set the defaults for optional 'y' & 'z'.
    var or = self._orientation;
    y = (typeof y !== 'number') ? or[1] : y;
    z = (typeof z !== 'number') ? or[2] : z;
    xUp = (typeof xUp !== 'number') ? or[3] : xUp;
    yUp = (typeof yUp !== 'number') ? or[4] : yUp;
    zUp = (typeof zUp !== 'number') ? or[5] : zUp;

    if (typeof x === 'number') {
      self._orientation = [x, y, z, xUp, yUp, zUp];
      self.ctx.listener.setOrientation(x, y, z, xUp, yUp, zUp);
    } else {
      return or;
    }

    return self;
  };

  /** Group Methods **/
  /***************************************************************************/

  /**
   * Add new properties to the core init.
   * @param  {Function} _super Core init method.
   * @return {Howl}
   */
  Howl.prototype.init = (function(_super) {
    return function(o) {
      var self = this;

      // Setup user-defined default properties.
      self._orientation = o.orientation || [1, 0, 0];
      self._stereo = o.stereo || null;
      self._pos = o.pos || null;
      self._pannerAttr = {
        coneInnerAngle: typeof o.coneInnerAngle !== 'undefined' ? o.coneInnerAngle : 360,
        coneOuterAngle: typeof o.coneOuterAngle !== 'undefined' ? o.coneOuterAngle : 360,
        coneOuterGain: typeof o.coneOuterGain !== 'undefined' ? o.coneOuterGain : 0,
        distanceModel: typeof o.distanceModel !== 'undefined' ? o.distanceModel : 'inverse',
        maxDistance: typeof o.maxDistance !== 'undefined' ? o.maxDistance : 10000,
        panningModel: typeof o.panningModel !== 'undefined' ? o.panningModel : 'HRTF',
        refDistance: typeof o.refDistance !== 'undefined' ? o.refDistance : 1,
        rolloffFactor: typeof o.rolloffFactor !== 'undefined' ? o.rolloffFactor : 1
      };

      // Setup event listeners.
      self._onstereo = o.onstereo ? [{fn: o.onstereo}] : [];
      self._onpos = o.onpos ? [{fn: o.onpos}] : [];
      self._onorientation = o.onorientation ? [{fn: o.onorientation}] : [];

      // Complete initilization with howler.js core's init function.
      return _super.call(this, o);
    };
  })(Howl.prototype.init);

  /**
   * Get/set the stereo panning of the audio source for this sound or all in the group.
   * @param  {Number} pan  A value of -1.0 is all the way left and 1.0 is all the way right.
   * @param  {Number} id (optional) The sound ID. If none is passed, all in group will be updated.
   * @return {Howl/Number}    Returns self or the current stereo panning value.
   */
  Howl.prototype.stereo = function(pan, id) {
    var self = this;

    // Stop right here if not using Web Audio.
    if (!self._webAudio) {
      return self;
    }

    // If the sound hasn't loaded, add it to the load queue to change stereo pan when capable.
    if (self._state !== 'loaded') {
      self._queue.push({
        event: 'stereo',
        action: function() {
          self.stereo(pan, id);
        }
      });

      return self;
    }

    // Check for PannerStereoNode support and fallback to PannerNode if it doesn't exist.
    var pannerType = (typeof Howler.ctx.createStereoPanner === 'undefined') ? 'spatial' : 'stereo';

    // Setup the group's stereo panning if no ID is passed.
    if (typeof id === 'undefined') {
      // Return the group's stereo panning if no parameters are passed.
      if (typeof pan === 'number') {
        self._stereo = pan;
        self._pos = [pan, 0, 0];
      } else {
        return self._stereo;
      }
    }

    // Change the streo panning of one or all sounds in group.
    var ids = self._getSoundIds(id);
    for (var i=0; i<ids.length; i++) {
      // Get the sound.
      var sound = self._soundById(ids[i]);

      if (sound) {
        if (typeof pan === 'number') {
          sound._stereo = pan;
          sound._pos = [pan, 0, 0];

          if (sound._node) {
            // If we are falling back, make sure the panningModel is equalpower.
            sound._pannerAttr.panningModel = 'equalpower';

            // Check if there is a panner setup and create a new one if not.
            if (!sound._panner || !sound._panner.pan) {
              setupPanner(sound, pannerType);
            }

            if (pannerType === 'spatial') {
              sound._panner.setPosition(pan, 0, 0);
            } else {
              sound._panner.pan.setValueAtTime(pan, Howler.ctx.currentTime);
            }
          }

          self._emit('stereo', sound._id);
        } else {
          return sound._stereo;
        }
      }
    }

    return self;
  };

  /**
   * Get/set the 3D spatial position of the audio source for this sound or group relative to the global listener.
   * @param  {Number} x  The x-position of the audio source.
   * @param  {Number} y  The y-position of the audio source.
   * @param  {Number} z  The z-position of the audio source.
   * @param  {Number} id (optional) The sound ID. If none is passed, all in group will be updated.
   * @return {Howl/Array}    Returns self or the current 3D spatial position: [x, y, z].
   */
  Howl.prototype.pos = function(x, y, z, id) {
    var self = this;

    // Stop right here if not using Web Audio.
    if (!self._webAudio) {
      return self;
    }

    // If the sound hasn't loaded, add it to the load queue to change position when capable.
    if (self._state !== 'loaded') {
      self._queue.push({
        event: 'pos',
        action: function() {
          self.pos(x, y, z, id);
        }
      });

      return self;
    }

    // Set the defaults for optional 'y' & 'z'.
    y = (typeof y !== 'number') ? 0 : y;
    z = (typeof z !== 'number') ? -0.5 : z;

    // Setup the group's spatial position if no ID is passed.
    if (typeof id === 'undefined') {
      // Return the group's spatial position if no parameters are passed.
      if (typeof x === 'number') {
        self._pos = [x, y, z];
      } else {
        return self._pos;
      }
    }

    // Change the spatial position of one or all sounds in group.
    var ids = self._getSoundIds(id);
    for (var i=0; i<ids.length; i++) {
      // Get the sound.
      var sound = self._soundById(ids[i]);

      if (sound) {
        if (typeof x === 'number') {
          sound._pos = [x, y, z];

          if (sound._node) {
            // Check if there is a panner setup and create a new one if not.
            if (!sound._panner || sound._panner.pan) {
              setupPanner(sound, 'spatial');
            }

            sound._panner.setPosition(x, y, z);
          }

          self._emit('pos', sound._id);
        } else {
          return sound._pos;
        }
      }
    }

    return self;
  };

  /**
   * Get/set the direction the audio source is pointing in the 3D cartesian coordinate
   * space. Depending on how direction the sound is, based on the `cone` attributes,
   * a sound pointing away from the listener can be quiet or silent.
   * @param  {Number} x  The x-orientation of the source.
   * @param  {Number} y  The y-orientation of the source.
   * @param  {Number} z  The z-orientation of the source.
   * @param  {Number} id (optional) The sound ID. If none is passed, all in group will be updated.
   * @return {Howl/Array}    Returns self or the current 3D spatial orientation: [x, y, z].
   */
  Howl.prototype.orientation = function(x, y, z, id) {
    var self = this;

    // Stop right here if not using Web Audio.
    if (!self._webAudio) {
      return self;
    }

    // If the sound hasn't loaded, add it to the load queue to change orientation when capable.
    if (self._state !== 'loaded') {
      self._queue.push({
        event: 'orientation',
        action: function() {
          self.orientation(x, y, z, id);
        }
      });

      return self;
    }

    // Set the defaults for optional 'y' & 'z'.
    y = (typeof y !== 'number') ? self._orientation[1] : y;
    z = (typeof z !== 'number') ? self._orientation[2] : z;

    // Setup the group's spatial orientation if no ID is passed.
    if (typeof id === 'undefined') {
      // Return the group's spatial orientation if no parameters are passed.
      if (typeof x === 'number') {
        self._orientation = [x, y, z];
      } else {
        return self._orientation;
      }
    }

    // Change the spatial orientation of one or all sounds in group.
    var ids = self._getSoundIds(id);
    for (var i=0; i<ids.length; i++) {
      // Get the sound.
      var sound = self._soundById(ids[i]);

      if (sound) {
        if (typeof x === 'number') {
          sound._orientation = [x, y, z];

          if (sound._node) {
            // Check if there is a panner setup and create a new one if not.
            if (!sound._panner) {
              // Make sure we have a position to setup the node with.
              if (!sound._pos) {
                sound._pos = self._pos || [0, 0, -0.5];
              }

              setupPanner(sound, 'spatial');
            }

            sound._panner.setOrientation(x, y, z);
          }

          self._emit('orientation', sound._id);
        } else {
          return sound._orientation;
        }
      }
    }

    return self;
  };

  /**
   * Get/set the panner node's attributes for a sound or group of sounds.
   * This method can optionall take 0, 1 or 2 arguments.
   *   pannerAttr() -> Returns the group's values.
   *   pannerAttr(id) -> Returns the sound id's values.
   *   pannerAttr(o) -> Set's the values of all sounds in this Howl group.
   *   pannerAttr(o, id) -> Set's the values of passed sound id.
   *
   *   Attributes:
   *     coneInnerAngle - (360 by default) A parameter for directional audio sources, this is an angle, in degrees,
   *                      inside of which there will be no volume reduction.
   *     coneOuterAngle - (360 by default) A parameter for directional audio sources, this is an angle, in degrees,
   *                      outside of which the volume will be reduced to a constant value of `coneOuterGain`.
   *     coneOuterGain - (0 by default) A parameter for directional audio sources, this is the gain outside of the
   *                     `coneOuterAngle`. It is a linear value in the range `[0, 1]`.
   *     distanceModel - ('inverse' by default) Determines algorithm used to reduce volume as audio moves away from
   *                     listener. Can be `linear`, `inverse` or `exponential.
   *     maxDistance - (10000 by default) The maximum distance between source and listener, after which the volume
   *                   will not be reduced any further.
   *     refDistance - (1 by default) A reference distance for reducing volume as source moves further from the listener.
   *                   This is simply a variable of the distance model and has a different effect depending on which model
   *                   is used and the scale of your coordinates. Generally, volume will be equal to 1 at this distance.
   *     rolloffFactor - (1 by default) How quickly the volume reduces as source moves from listener. This is simply a
   *                     variable of the distance model and can be in the range of `[0, 1]` with `linear` and `[0, ∞]`
   *                     with `inverse` and `exponential`.
   *     panningModel - ('HRTF' by default) Determines which spatialization algorithm is used to position audio.
   *                     Can be `HRTF` or `equalpower`.
   * 
   * @return {Howl/Object} Returns self or current panner attributes.
   */
  Howl.prototype.pannerAttr = function() {
    var self = this;
    var args = arguments;
    var o, id, sound;

    // Stop right here if not using Web Audio.
    if (!self._webAudio) {
      return self;
    }

    // Determine the values based on arguments.
    if (args.length === 0) {
      // Return the group's panner attribute values.
      return self._pannerAttr;
    } else if (args.length === 1) {
      if (typeof args[0] === 'object') {
        o = args[0];

        // Set the grou's panner attribute values.
        if (typeof id === 'undefined') {
          if (!o.pannerAttr) {
            o.pannerAttr = {
              coneInnerAngle: o.coneInnerAngle,
              coneOuterAngle: o.coneOuterAngle,
              coneOuterGain: o.coneOuterGain,
              distanceModel: o.distanceModel,
              maxDistance: o.maxDistance,
              refDistance: o.refDistance,
              rolloffFactor: o.rolloffFactor,
              panningModel: o.panningModel
            };
          }

          self._pannerAttr = {
            coneInnerAngle: typeof o.pannerAttr.coneInnerAngle !== 'undefined' ? o.pannerAttr.coneInnerAngle : self._coneInnerAngle,
            coneOuterAngle: typeof o.pannerAttr.coneOuterAngle !== 'undefined' ? o.pannerAttr.coneOuterAngle : self._coneOuterAngle,
            coneOuterGain: typeof o.pannerAttr.coneOuterGain !== 'undefined' ? o.pannerAttr.coneOuterGain : self._coneOuterGain,
            distanceModel: typeof o.pannerAttr.distanceModel !== 'undefined' ? o.pannerAttr.distanceModel : self._distanceModel,
            maxDistance: typeof o.pannerAttr.maxDistance !== 'undefined' ? o.pannerAttr.maxDistance : self._maxDistance,
            refDistance: typeof o.pannerAttr.refDistance !== 'undefined' ? o.pannerAttr.refDistance : self._refDistance,
            rolloffFactor: typeof o.pannerAttr.rolloffFactor !== 'undefined' ? o.pannerAttr.rolloffFactor : self._rolloffFactor,
            panningModel: typeof o.pannerAttr.panningModel !== 'undefined' ? o.pannerAttr.panningModel : self._panningModel
          };
        }
      } else {
        // Return this sound's panner attribute values.
        sound = self._soundById(parseInt(args[0], 10));
        return sound ? sound._pannerAttr : self._pannerAttr;
      }
    } else if (args.length === 2) {
      o = args[0];
      id = parseInt(args[1], 10);
    }

    // Update the values of the specified sounds.
    var ids = self._getSoundIds(id);
    for (var i=0; i<ids.length; i++) {
      sound = self._soundById(ids[i]);

      if (sound) {
        // Merge the new values into the sound.
        var pa = sound._pannerAttr;
        pa = {
          coneInnerAngle: typeof o.coneInnerAngle !== 'undefined' ? o.coneInnerAngle : pa.coneInnerAngle,
          coneOuterAngle: typeof o.coneOuterAngle !== 'undefined' ? o.coneOuterAngle : pa.coneOuterAngle,
          coneOuterGain: typeof o.coneOuterGain !== 'undefined' ? o.coneOuterGain : pa.coneOuterGain,
          distanceModel: typeof o.distanceModel !== 'undefined' ? o.distanceModel : pa.distanceModel,
          maxDistance: typeof o.maxDistance !== 'undefined' ? o.maxDistance : pa.maxDistance,
          refDistance: typeof o.refDistance !== 'undefined' ? o.refDistance : pa.refDistance,
          rolloffFactor: typeof o.rolloffFactor !== 'undefined' ? o.rolloffFactor : pa.rolloffFactor,
          panningModel: typeof o.panningModel !== 'undefined' ? o.panningModel : pa.panningModel
        };

        // Update the panner values or create a new panner if none exists.
        var panner = sound._panner;
        if (panner) {
          panner.coneInnerAngle = pa.coneInnerAngle;
          panner.coneOuterAngle = pa.coneOuterAngle;
          panner.coneOuterGain = pa.coneOuterGain;
          panner.distanceModel = pa.distanceModel;
          panner.maxDistance = pa.maxDistance;
          panner.refDistance = pa.refDistance;
          panner.rolloffFactor = pa.rolloffFactor;
          panner.panningModel = pa.panningModel;
        } else {
          // Make sure we have a position to setup the node with.
          if (!sound._pos) {
            sound._pos = self._pos || [0, 0, -0.5];
          }

          // Create a new panner node.
          setupPanner(sound, 'spatial');
        }
      }
    }

    return self;
  };

  /** Single Sound Methods **/
  /***************************************************************************/

  /**
   * Add new properties to the core Sound init.
   * @param  {Function} _super Core Sound init method.
   * @return {Sound}
   */
  Sound.prototype.init = (function(_super) {
    return function() {
      var self = this;
      var parent = self._parent;

      // Setup user-defined default properties.
      self._orientation = parent._orientation;
      self._stereo = parent._stereo;
      self._pos = parent._pos;
      self._pannerAttr = parent._pannerAttr;

      // Complete initilization with howler.js core Sound's init function.
      _super.call(this);

      // If a stereo or position was specified, set it up.
      if (self._stereo) {
        parent.stereo(self._stereo);
      } else if (self._pos) {
        parent.pos(self._pos[0], self._pos[1], self._pos[2], self._id);
      }
    };
  })(Sound.prototype.init);

  /**
   * Override the Sound.reset method to clean up properties from the spatial plugin.
   * @param  {Function} _super Sound reset method.
   * @return {Sound}
   */
  Sound.prototype.reset = (function(_super) {
    return function() {
      var self = this;
      var parent = self._parent;

      // Reset all spatial plugin properties on this sound.
      self._orientation = parent._orientation;
      self._pos = parent._pos;
      self._pannerAttr = parent._pannerAttr;

      // Complete resetting of the sound.
      return _super.call(this);
    };
  })(Sound.prototype.reset);

  /** Helper Methods **/
  /***************************************************************************/

  /**
   * Create a new panner node and save it on the sound.
   * @param  {Sound} sound Specific sound to setup panning on.
   * @param {String} type Type of panner to create: 'stereo' or 'spatial'.
   */
  var setupPanner = function(sound, type) {
    type = type || 'spatial';

    // Create the new panner node.
    if (type === 'spatial') {
      sound._panner = Howler.ctx.createPanner();
      sound._panner.coneInnerAngle = sound._pannerAttr.coneInnerAngle;
      sound._panner.coneOuterAngle = sound._pannerAttr.coneOuterAngle;
      sound._panner.coneOuterGain = sound._pannerAttr.coneOuterGain;
      sound._panner.distanceModel = sound._pannerAttr.distanceModel;
      sound._panner.maxDistance = sound._pannerAttr.maxDistance;
      sound._panner.refDistance = sound._pannerAttr.refDistance;
      sound._panner.rolloffFactor = sound._pannerAttr.rolloffFactor;
      sound._panner.panningModel = sound._pannerAttr.panningModel;
      sound._panner.setPosition(sound._pos[0], sound._pos[1], sound._pos[2]);
      sound._panner.setOrientation(sound._orientation[0], sound._orientation[1], sound._orientation[2]);
    } else {
      sound._panner = Howler.ctx.createStereoPanner();
      sound._panner.pan.setValueAtTime(sound._stereo, Howler.ctx.currentTime);
    }

    sound._panner.connect(sound._node);

    // Update the connections.
    if (!sound._paused) {
      sound._parent.pause(sound._id, true).play(sound._id, true);
    }
  };
})();

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],21:[function(require,module,exports){
(function (global){
'use strict';

var stub = require('./stub');
var tracking = require('./tracking');
var ls = 'localStorage' in global && global.localStorage ? global.localStorage : stub;

function accessor (key, value) {
  if (arguments.length === 1) {
    return get(key);
  }
  return set(key, value);
}

function get (key) {
  return JSON.parse(ls.getItem(key));
}

function set (key, value) {
  try {
    ls.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    return false;
  }
}

function remove (key) {
  return ls.removeItem(key);
}

function clear () {
  return ls.clear();
}

accessor.set = set;
accessor.get = get;
accessor.remove = remove;
accessor.clear = clear;
accessor.on = tracking.on;
accessor.off = tracking.off;

module.exports = accessor;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./stub":22,"./tracking":23}],22:[function(require,module,exports){
'use strict';

var ms = {};

function getItem (key) {
  return key in ms ? ms[key] : null;
}

function setItem (key, value) {
  ms[key] = value;
  return true;
}

function removeItem (key) {
  var found = key in ms;
  if (found) {
    return delete ms[key];
  }
  return false;
}

function clear () {
  ms = {};
  return true;
}

module.exports = {
  getItem: getItem,
  setItem: setItem,
  removeItem: removeItem,
  clear: clear
};

},{}],23:[function(require,module,exports){
(function (global){
'use strict';

var listeners = {};
var listening = false;

function listen () {
  if (global.addEventListener) {
    global.addEventListener('storage', change, false);
  } else if (global.attachEvent) {
    global.attachEvent('onstorage', change);
  } else {
    global.onstorage = change;
  }
}

function change (e) {
  if (!e) {
    e = global.event;
  }
  var all = listeners[e.key];
  if (all) {
    all.forEach(fire);
  }

  function fire (listener) {
    listener(JSON.parse(e.newValue), JSON.parse(e.oldValue), e.url || e.uri);
  }
}

function on (key, fn) {
  if (listeners[key]) {
    listeners[key].push(fn);
  } else {
    listeners[key] = [fn];
  }
  if (listening === false) {
    listen();
  }
}

function off (key, fn) {
  var ns = listeners[key];
  if (ns.length > 1) {
    ns.splice(ns.indexOf(fn), 1);
  } else {
    listeners[key] = [];
  }
}

module.exports = {
  on: on,
  off: off
};

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],24:[function(require,module,exports){
/*jshint eqnull:true*/
(function (root) {
  "use strict";

  var GLOBAL_KEY = "Random";

  var imul = (typeof Math.imul !== "function" || Math.imul(0xffffffff, 5) !== -5 ?
    function (a, b) {
      var ah = (a >>> 16) & 0xffff;
      var al = a & 0xffff;
      var bh = (b >>> 16) & 0xffff;
      var bl = b & 0xffff;
      // the shift by 0 fixes the sign on the high part
      // the final |0 converts the unsigned value into a signed value
      return (al * bl) + (((ah * bl + al * bh) << 16) >>> 0) | 0;
    } :
    Math.imul);

  var stringRepeat = (typeof String.prototype.repeat === "function" && "x".repeat(3) === "xxx" ?
    function (x, y) {
      return x.repeat(y);
    } : function (pattern, count) {
      var result = "";
      while (count > 0) {
        if (count & 1) {
          result += pattern;
        }
        count >>= 1;
        pattern += pattern;
      }
      return result;
    });

  function Random(engine) {
    if (!(this instanceof Random)) {
      return new Random(engine);
    }

    if (engine == null) {
      engine = Random.engines.nativeMath;
    } else if (typeof engine !== "function") {
      throw new TypeError("Expected engine to be a function, got " + typeof engine);
    }
    this.engine = engine;
  }
  var proto = Random.prototype;

  Random.engines = {
    nativeMath: function () {
      return (Math.random() * 0x100000000) | 0;
    },
    mt19937: (function (Int32Array) {
      // http://en.wikipedia.org/wiki/Mersenne_twister
      function refreshData(data) {
        var k = 0;
        var tmp = 0;
        for (;
          (k | 0) < 227; k = (k + 1) | 0) {
          tmp = (data[k] & 0x80000000) | (data[(k + 1) | 0] & 0x7fffffff);
          data[k] = data[(k + 397) | 0] ^ (tmp >>> 1) ^ ((tmp & 0x1) ? 0x9908b0df : 0);
        }

        for (;
          (k | 0) < 623; k = (k + 1) | 0) {
          tmp = (data[k] & 0x80000000) | (data[(k + 1) | 0] & 0x7fffffff);
          data[k] = data[(k - 227) | 0] ^ (tmp >>> 1) ^ ((tmp & 0x1) ? 0x9908b0df : 0);
        }

        tmp = (data[623] & 0x80000000) | (data[0] & 0x7fffffff);
        data[623] = data[396] ^ (tmp >>> 1) ^ ((tmp & 0x1) ? 0x9908b0df : 0);
      }

      function temper(value) {
        value ^= value >>> 11;
        value ^= (value << 7) & 0x9d2c5680;
        value ^= (value << 15) & 0xefc60000;
        return value ^ (value >>> 18);
      }

      function seedWithArray(data, source) {
        var i = 1;
        var j = 0;
        var sourceLength = source.length;
        var k = Math.max(sourceLength, 624) | 0;
        var previous = data[0] | 0;
        for (;
          (k | 0) > 0; --k) {
          data[i] = previous = ((data[i] ^ imul((previous ^ (previous >>> 30)), 0x0019660d)) + (source[j] | 0) + (j | 0)) | 0;
          i = (i + 1) | 0;
          ++j;
          if ((i | 0) > 623) {
            data[0] = data[623];
            i = 1;
          }
          if (j >= sourceLength) {
            j = 0;
          }
        }
        for (k = 623;
          (k | 0) > 0; --k) {
          data[i] = previous = ((data[i] ^ imul((previous ^ (previous >>> 30)), 0x5d588b65)) - i) | 0;
          i = (i + 1) | 0;
          if ((i | 0) > 623) {
            data[0] = data[623];
            i = 1;
          }
        }
        data[0] = 0x80000000;
      }

      function mt19937() {
        var data = new Int32Array(624);
        var index = 0;
        var uses = 0;

        function next() {
          if ((index | 0) >= 624) {
            refreshData(data);
            index = 0;
          }

          var value = data[index];
          index = (index + 1) | 0;
          uses += 1;
          return temper(value) | 0;
        }
        next.getUseCount = function() {
          return uses;
        };
        next.discard = function (count) {
          uses += count;
          if ((index | 0) >= 624) {
            refreshData(data);
            index = 0;
          }
          while ((count - index) > 624) {
            count -= 624 - index;
            refreshData(data);
            index = 0;
          }
          index = (index + count) | 0;
          return next;
        };
        next.seed = function (initial) {
          var previous = 0;
          data[0] = previous = initial | 0;

          for (var i = 1; i < 624; i = (i + 1) | 0) {
            data[i] = previous = (imul((previous ^ (previous >>> 30)), 0x6c078965) + i) | 0;
          }
          index = 624;
          uses = 0;
          return next;
        };
        next.seedWithArray = function (source) {
          next.seed(0x012bd6aa);
          seedWithArray(data, source);
          return next;
        };
        next.autoSeed = function () {
          return next.seedWithArray(Random.generateEntropyArray());
        };
        return next;
      }

      return mt19937;
    }(typeof Int32Array === "function" ? Int32Array : Array)),
    browserCrypto: (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function" && typeof Int32Array === "function") ? (function () {
      var data = null;
      var index = 128;

      return function () {
        if (index >= 128) {
          if (data === null) {
            data = new Int32Array(128);
          }
          crypto.getRandomValues(data);
          index = 0;
        }

        return data[index++] | 0;
      };
    }()) : null
  };

  Random.generateEntropyArray = function () {
    var array = [];
    var engine = Random.engines.nativeMath;
    for (var i = 0; i < 16; ++i) {
      array[i] = engine() | 0;
    }
    array.push(new Date().getTime() | 0);
    return array;
  };

  function returnValue(value) {
    return function () {
      return value;
    };
  }

  // [-0x80000000, 0x7fffffff]
  Random.int32 = function (engine) {
    return engine() | 0;
  };
  proto.int32 = function () {
    return Random.int32(this.engine);
  };

  // [0, 0xffffffff]
  Random.uint32 = function (engine) {
    return engine() >>> 0;
  };
  proto.uint32 = function () {
    return Random.uint32(this.engine);
  };

  // [0, 0x1fffffffffffff]
  Random.uint53 = function (engine) {
    var high = engine() & 0x1fffff;
    var low = engine() >>> 0;
    return (high * 0x100000000) + low;
  };
  proto.uint53 = function () {
    return Random.uint53(this.engine);
  };

  // [0, 0x20000000000000]
  Random.uint53Full = function (engine) {
    while (true) {
      var high = engine() | 0;
      if (high & 0x200000) {
        if ((high & 0x3fffff) === 0x200000 && (engine() | 0) === 0) {
          return 0x20000000000000;
        }
      } else {
        var low = engine() >>> 0;
        return ((high & 0x1fffff) * 0x100000000) + low;
      }
    }
  };
  proto.uint53Full = function () {
    return Random.uint53Full(this.engine);
  };

  // [-0x20000000000000, 0x1fffffffffffff]
  Random.int53 = function (engine) {
    var high = engine() | 0;
    var low = engine() >>> 0;
    return ((high & 0x1fffff) * 0x100000000) + low + (high & 0x200000 ? -0x20000000000000 : 0);
  };
  proto.int53 = function () {
    return Random.int53(this.engine);
  };

  // [-0x20000000000000, 0x20000000000000]
  Random.int53Full = function (engine) {
    while (true) {
      var high = engine() | 0;
      if (high & 0x400000) {
        if ((high & 0x7fffff) === 0x400000 && (engine() | 0) === 0) {
          return 0x20000000000000;
        }
      } else {
        var low = engine() >>> 0;
        return ((high & 0x1fffff) * 0x100000000) + low + (high & 0x200000 ? -0x20000000000000 : 0);
      }
    }
  };
  proto.int53Full = function () {
    return Random.int53Full(this.engine);
  };

  function add(generate, addend) {
    if (addend === 0) {
      return generate;
    } else {
      return function (engine) {
        return generate(engine) + addend;
      };
    }
  }

  Random.integer = (function () {
    function isPowerOfTwoMinusOne(value) {
      return ((value + 1) & value) === 0;
    }

    function bitmask(masking) {
      return function (engine) {
        return engine() & masking;
      };
    }

    function downscaleToLoopCheckedRange(range) {
      var extendedRange = range + 1;
      var maximum = extendedRange * Math.floor(0x100000000 / extendedRange);
      return function (engine) {
        var value = 0;
        do {
          value = engine() >>> 0;
        } while (value >= maximum);
        return value % extendedRange;
      };
    }

    function downscaleToRange(range) {
      if (isPowerOfTwoMinusOne(range)) {
        return bitmask(range);
      } else {
        return downscaleToLoopCheckedRange(range);
      }
    }

    function isEvenlyDivisibleByMaxInt32(value) {
      return (value | 0) === 0;
    }

    function upscaleWithHighMasking(masking) {
      return function (engine) {
        var high = engine() & masking;
        var low = engine() >>> 0;
        return (high * 0x100000000) + low;
      };
    }

    function upscaleToLoopCheckedRange(extendedRange) {
      var maximum = extendedRange * Math.floor(0x20000000000000 / extendedRange);
      return function (engine) {
        var ret = 0;
        do {
          var high = engine() & 0x1fffff;
          var low = engine() >>> 0;
          ret = (high * 0x100000000) + low;
        } while (ret >= maximum);
        return ret % extendedRange;
      };
    }

    function upscaleWithinU53(range) {
      var extendedRange = range + 1;
      if (isEvenlyDivisibleByMaxInt32(extendedRange)) {
        var highRange = ((extendedRange / 0x100000000) | 0) - 1;
        if (isPowerOfTwoMinusOne(highRange)) {
          return upscaleWithHighMasking(highRange);
        }
      }
      return upscaleToLoopCheckedRange(extendedRange);
    }

    function upscaleWithinI53AndLoopCheck(min, max) {
      return function (engine) {
        var ret = 0;
        do {
          var high = engine() | 0;
          var low = engine() >>> 0;
          ret = ((high & 0x1fffff) * 0x100000000) + low + (high & 0x200000 ? -0x20000000000000 : 0);
        } while (ret < min || ret > max);
        return ret;
      };
    }

    return function (min, max) {
      min = Math.floor(min);
      max = Math.floor(max);
      if (min < -0x20000000000000 || !isFinite(min)) {
        throw new RangeError("Expected min to be at least " + (-0x20000000000000));
      } else if (max > 0x20000000000000 || !isFinite(max)) {
        throw new RangeError("Expected max to be at most " + 0x20000000000000);
      }

      var range = max - min;
      if (range <= 0 || !isFinite(range)) {
        return returnValue(min);
      } else if (range === 0xffffffff) {
        if (min === 0) {
          return Random.uint32;
        } else {
          return add(Random.int32, min + 0x80000000);
        }
      } else if (range < 0xffffffff) {
        return add(downscaleToRange(range), min);
      } else if (range === 0x1fffffffffffff) {
        return add(Random.uint53, min);
      } else if (range < 0x1fffffffffffff) {
        return add(upscaleWithinU53(range), min);
      } else if (max - 1 - min === 0x1fffffffffffff) {
        return add(Random.uint53Full, min);
      } else if (min === -0x20000000000000 && max === 0x20000000000000) {
        return Random.int53Full;
      } else if (min === -0x20000000000000 && max === 0x1fffffffffffff) {
        return Random.int53;
      } else if (min === -0x1fffffffffffff && max === 0x20000000000000) {
        return add(Random.int53, 1);
      } else if (max === 0x20000000000000) {
        return add(upscaleWithinI53AndLoopCheck(min - 1, max - 1), 1);
      } else {
        return upscaleWithinI53AndLoopCheck(min, max);
      }
    };
  }());
  proto.integer = function (min, max) {
    return Random.integer(min, max)(this.engine);
  };

  // [0, 1] (floating point)
  Random.realZeroToOneInclusive = function (engine) {
    return Random.uint53Full(engine) / 0x20000000000000;
  };
  proto.realZeroToOneInclusive = function () {
    return Random.realZeroToOneInclusive(this.engine);
  };

  // [0, 1) (floating point)
  Random.realZeroToOneExclusive = function (engine) {
    return Random.uint53(engine) / 0x20000000000000;
  };
  proto.realZeroToOneExclusive = function () {
    return Random.realZeroToOneExclusive(this.engine);
  };

  Random.real = (function () {
    function multiply(generate, multiplier) {
      if (multiplier === 1) {
        return generate;
      } else if (multiplier === 0) {
        return function () {
          return 0;
        };
      } else {
        return function (engine) {
          return generate(engine) * multiplier;
        };
      }
    }

    return function (left, right, inclusive) {
      if (!isFinite(left)) {
        throw new RangeError("Expected left to be a finite number");
      } else if (!isFinite(right)) {
        throw new RangeError("Expected right to be a finite number");
      }
      return add(
        multiply(
          inclusive ? Random.realZeroToOneInclusive : Random.realZeroToOneExclusive,
          right - left),
        left);
    };
  }());
  proto.real = function (min, max, inclusive) {
    return Random.real(min, max, inclusive)(this.engine);
  };

  Random.bool = (function () {
    function isLeastBitTrue(engine) {
      return (engine() & 1) === 1;
    }

    function lessThan(generate, value) {
      return function (engine) {
        return generate(engine) < value;
      };
    }

    function probability(percentage) {
      if (percentage <= 0) {
        return returnValue(false);
      } else if (percentage >= 1) {
        return returnValue(true);
      } else {
        var scaled = percentage * 0x100000000;
        if (scaled % 1 === 0) {
          return lessThan(Random.int32, (scaled - 0x80000000) | 0);
        } else {
          return lessThan(Random.uint53, Math.round(percentage * 0x20000000000000));
        }
      }
    }

    return function (numerator, denominator) {
      if (denominator == null) {
        if (numerator == null) {
          return isLeastBitTrue;
        }
        return probability(numerator);
      } else {
        if (numerator <= 0) {
          return returnValue(false);
        } else if (numerator >= denominator) {
          return returnValue(true);
        }
        return lessThan(Random.integer(0, denominator - 1), numerator);
      }
    };
  }());
  proto.bool = function (numerator, denominator) {
    return Random.bool(numerator, denominator)(this.engine);
  };

  function toInteger(value) {
    var number = +value;
    if (number < 0) {
      return Math.ceil(number);
    } else {
      return Math.floor(number);
    }
  }

  function convertSliceArgument(value, length) {
    if (value < 0) {
      return Math.max(value + length, 0);
    } else {
      return Math.min(value, length);
    }
  }
  Random.pick = function (engine, array, begin, end) {
    var length = array.length;
    var start = begin == null ? 0 : convertSliceArgument(toInteger(begin), length);
    var finish = end === void 0 ? length : convertSliceArgument(toInteger(end), length);
    if (start >= finish) {
      return void 0;
    }
    var distribution = Random.integer(start, finish - 1);
    return array[distribution(engine)];
  };
  proto.pick = function (array, begin, end) {
    return Random.pick(this.engine, array, begin, end);
  };

  function returnUndefined() {
    return void 0;
  }
  var slice = Array.prototype.slice;
  Random.picker = function (array, begin, end) {
    var clone = slice.call(array, begin, end);
    if (!clone.length) {
      return returnUndefined;
    }
    var distribution = Random.integer(0, clone.length - 1);
    return function (engine) {
      return clone[distribution(engine)];
    };
  };

  Random.shuffle = function (engine, array, downTo) {
    var length = array.length;
    if (length) {
      if (downTo == null) {
        downTo = 0;
      }
      for (var i = (length - 1) >>> 0; i > downTo; --i) {
        var distribution = Random.integer(0, i);
        var j = distribution(engine);
        if (i !== j) {
          var tmp = array[i];
          array[i] = array[j];
          array[j] = tmp;
        }
      }
    }
    return array;
  };
  proto.shuffle = function (array) {
    return Random.shuffle(this.engine, array);
  };

  Random.sample = function (engine, population, sampleSize) {
    if (sampleSize < 0 || sampleSize > population.length || !isFinite(sampleSize)) {
      throw new RangeError("Expected sampleSize to be within 0 and the length of the population");
    }

    if (sampleSize === 0) {
      return [];
    }

    var clone = slice.call(population);
    var length = clone.length;
    if (length === sampleSize) {
      return Random.shuffle(engine, clone, 0);
    }
    var tailLength = length - sampleSize;
    return Random.shuffle(engine, clone, tailLength - 1).slice(tailLength);
  };
  proto.sample = function (population, sampleSize) {
    return Random.sample(this.engine, population, sampleSize);
  };

  Random.die = function (sideCount) {
    return Random.integer(1, sideCount);
  };
  proto.die = function (sideCount) {
    return Random.die(sideCount)(this.engine);
  };

  Random.dice = function (sideCount, dieCount) {
    var distribution = Random.die(sideCount);
    return function (engine) {
      var result = [];
      result.length = dieCount;
      for (var i = 0; i < dieCount; ++i) {
        result[i] = distribution(engine);
      }
      return result;
    };
  };
  proto.dice = function (sideCount, dieCount) {
    return Random.dice(sideCount, dieCount)(this.engine);
  };

  // http://en.wikipedia.org/wiki/Universally_unique_identifier
  Random.uuid4 = (function () {
    function zeroPad(string, zeroCount) {
      return stringRepeat("0", zeroCount - string.length) + string;
    }

    return function (engine) {
      var a = engine() >>> 0;
      var b = engine() | 0;
      var c = engine() | 0;
      var d = engine() >>> 0;

      return (
        zeroPad(a.toString(16), 8) +
        "-" +
        zeroPad((b & 0xffff).toString(16), 4) +
        "-" +
        zeroPad((((b >> 4) & 0x0fff) | 0x4000).toString(16), 4) +
        "-" +
        zeroPad(((c & 0x3fff) | 0x8000).toString(16), 4) +
        "-" +
        zeroPad(((c >> 4) & 0xffff).toString(16), 4) +
        zeroPad(d.toString(16), 8));
    };
  }());
  proto.uuid4 = function () {
    return Random.uuid4(this.engine);
  };

  Random.string = (function () {
    // has 2**x chars, for faster uniform distribution
    var DEFAULT_STRING_POOL = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-";

    return function (pool) {
      if (pool == null) {
        pool = DEFAULT_STRING_POOL;
      }

      var length = pool.length;
      if (!length) {
        throw new Error("Expected pool not to be an empty string");
      }

      var distribution = Random.integer(0, length - 1);
      return function (engine, length) {
        var result = "";
        for (var i = 0; i < length; ++i) {
          var j = distribution(engine);
          result += pool.charAt(j);
        }
        return result;
      };
    };
  }());
  proto.string = function (length, pool) {
    return Random.string(pool)(this.engine, length);
  };

  Random.hex = (function () {
    var LOWER_HEX_POOL = "0123456789abcdef";
    var lowerHex = Random.string(LOWER_HEX_POOL);
    var upperHex = Random.string(LOWER_HEX_POOL.toUpperCase());

    return function (upper) {
      if (upper) {
        return upperHex;
      } else {
        return lowerHex;
      }
    };
  }());
  proto.hex = function (length, upper) {
    return Random.hex(upper)(this.engine, length);
  };

  Random.date = function (start, end) {
    if (!(start instanceof Date)) {
      throw new TypeError("Expected start to be a Date, got " + typeof start);
    } else if (!(end instanceof Date)) {
      throw new TypeError("Expected end to be a Date, got " + typeof end);
    }
    var distribution = Random.integer(start.getTime(), end.getTime());
    return function (engine) {
      return new Date(distribution(engine));
    };
  };
  proto.date = function (start, end) {
    return Random.date(start, end)(this.engine);
  };

  if (typeof define === "function" && define.amd) {
    define(function () {
      return Random;
    });
  } else if (typeof module !== "undefined" && typeof require === "function") {
    module.exports = Random;
  } else {
    (function () {
      var oldGlobal = root[GLOBAL_KEY];
      Random.noConflict = function () {
        root[GLOBAL_KEY] = oldGlobal;
        return this;
      };
    }());
    root[GLOBAL_KEY] = Random;
  }
}(this));
},{}]},{},[16]);

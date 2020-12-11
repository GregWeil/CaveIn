(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
/// colors.js
//Make each grid cell a slightly different color

var Random = require('random-js')();

var Vector2 = require('./vector2.js');
var Render = require('./render.js');

var BaseObject = require('./object.js');

var colors = [
  '#F00', '#0F0', '#06F', '#FF0', '#F0F', '#0FF',
  '#FFF', '#FFF', '#FFF', '#FFF', '#FFF', '#FFF'
];

class GridColors extends BaseObject {
  constructor(grid) {
    super();
    
    this.grid = grid;
    
    this.padding = 2;
    
    this.colors = [];
    for (let i = -2 * this.padding; i < this.grid.gridSize.x; ++i) {
      var array = [];
      for (let j = -2 * this.padding; j < this.grid.gridSize.y; ++j) {
        array.push(Random.pick(colors));
      }
      this.colors.push(array);
    }
    
    this.handle(game, 'render-last', this.render);
  }
  
  render(evt) {
    Render.context = evt.context;
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
  constructor(grid) {
    super();
    
    this.color = Random.pick(colors);
    
    this.handle(game, 'render-last', this.render);
  }
  
  render(evt) {
    Render.context = evt.context;
    Render.context.globalCompositeOperation = 'multiply';
    Render.context.fillStyle = this.color;
    Render.rect(new Vector2(0, 0), new Vector2(
      Render.context.canvas.width, Render.context.canvas.height));
    Render.context.globalCompositeOperation = 'source-over';
  }
}

module.exports = ScreenColors;
},{"./object.js":7,"./render.js":10,"./vector2.js":11,"random-js":13}],2:[function(require,module,exports){
/// enemy.js
//Move at the player, kill on contact

var Random = require('random-js')();

var Vector2 = require('./vector2.js');
var Render = require('./render.js');

var BaseObject = require('./object.js');

var dimensions = new Vector2(16);
var spritesheet = document.getElementById('spritesheet');

Render.addSprite('enemy-a', spritesheet, dimensions.multiply(0, 2),
  dimensions, dimensions.multiply(0.5));
Render.addSprite('enemy-b', spritesheet, dimensions.multiply(1, 2),
  dimensions, dimensions.multiply(0.5));
var sprites = ['enemy-a', 'enemy-b'];

var audioStep = 'https://cdn.gomix.com/e6f17913-09e8-449d-8798-e394b24f6eff%2Fenemy_move.wav';
var audioStepPool = [];
for (let i = 0; i < 4; ++i) {
  var audio = new Audio(audioStep);
  audio.volume = 0.3;
  audioStepPool.push(audio);
}

module.exports = class Enemy extends BaseObject {
  static spawn(grid, avoid, ai) {
    var instances = game.getCollisions();
    //Take the farthest accessible point
    var locations = [];
    var distance = -Infinity;
    for (var i = 0; i < grid.gridSize.x; ++i) {
      for (var j = 0; j < grid.gridSize.y; ++j) {
        var pos = new Vector2(i, j);
        if (!!instances[pos.hash()]) continue;
        var dist = pos.minus(avoid).manhattan();
        if (dist > distance) {
          locations = [pos];
          distance = dist;
        } else if (dist === distance) {
          locations.push(pos);
        }
      }
    }
    return game.create(Enemy, grid, Random.pick(locations), ai);
  }
  
  constructor(grid, pos, pathfind) {
    super();
    
    this.grid = grid;
    this.pos = pos;
    this.posLast = pos.copy();
    this.movement = new Vector2();
    this.moveTimer = 1;
    this.ai = pathfind;
    
    this.sprite = Random.integer(0, sprites.length - 1);
    
    this.handle(game, 'collision-check', this.collide);
    this.handle(game, 'update-first', this.pathfind);
    this.handle(game, 'update', this.update);
    
    this.handle(game, 'anim-idle', this.anim);
    this.handle(game, 'render', this.render);
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
      var collision = game.collisionCheck(newPos);
      if (!(collision instanceof Enemy)) {
        this.pos = newPos;
        Random.pick(audioStepPool).play();
      }
    }
  }
  
  collide(evt) {
    evt.instances[this.pos.hash()] = this;
  }
  
  hurt(evt) {
    if (this.pos.equals(evt.pos)) {
      if (evt.cause === 'player') {
        this.grid.setBlock(this.pos, true, 0.3);
      }
      game.destroy(this);
      evt.hit = true;
    }
  }
  
  anim(evt) {
    this.sprite = (this.sprite + 1) % sprites.length;
  }
  
  render(evt) {
    Render.context = evt.context;
    var displayPos = this.pos;
    if (evt.time < 0.05) {
      displayPos = this.pos.plus(this.posLast).multiply(0.5);
    }
    Render.sprite(sprites[this.sprite], this.grid.getPos(displayPos));
  }
};
},{"./object.js":7,"./render.js":10,"./vector2.js":11,"random-js":13}],3:[function(require,module,exports){
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
},{"./vector2.js":11,"events":12}],4:[function(require,module,exports){
/// gem.js
//A pickup that gives a point

var Random = require('random-js')();

var Vector2 = require('./vector2.js');
var Render = require('./render.js');

var BaseObject = require('./object.js');

var dimensions = new Vector2(16);
var spritesheetOld = document.getElementById('spritesheet');
var spritesheet = document.getElementById('spritesheet-gems');

Render.addSprite('gem-a-a', spritesheetOld, dimensions.multiply(0, 1),
  dimensions, dimensions.multiply(0.5));
Render.addSprite('gem-a-b', spritesheetOld, dimensions.multiply(1, 1),
  dimensions, dimensions.multiply(0.5));

Render.addSprite('gem-b-a', spritesheet, dimensions.multiply(0, 0),
  dimensions, dimensions.multiply(0.5));
Render.addSprite('gem-b-b', spritesheet, dimensions.multiply(1, 0),
  dimensions, dimensions.multiply(0.5));

Render.addSprite('gem-c-a', spritesheet, dimensions.multiply(0, 1),
  dimensions, dimensions.multiply(0.5));
Render.addSprite('gem-c-b', spritesheet, dimensions.multiply(1, 1),
  dimensions, dimensions.multiply(0.5));

var audioGem = 'https://cdn.gomix.com/e6f17913-09e8-449d-8798-e394b24f6eff%2Fgem.wav';

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
  static spawn(grid, avoid) {
    var collisions = game.getCollisions();
    var count = Object.keys(collisions).length;
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
        Random.integer(0, grid.gridSize.x-1),
        Random.integer(0, grid.gridSize.y-1)
      );
      if (!grid.getBlock(pos)) continue;
      var dist = Math.abs(pos.minus(avoid).manhattan() - 15);
      if (dist < distance) {
        position = pos;
        distance = dist;
      }
      iterations += 1;
    }
    
    return game.create(Gem, grid, position, tier);
  }
  
  constructor(grid, pos, tier) {
    super();
    
    this.grid = grid;
    this.pos = pos;
    
    var base = gemTiers[tier];
    this.score = base.score;
    this.rangeAxis = base.rangeAxis;
    this.rangeManhattan = base.rangeManhattan;
    this.sprites = base.sprites;
    
    this.sprite = Random.integer(0, this.sprites.length - 1);
    
    this.grid.setBlock(this.pos, 'gem');
    
    this.handle(game, 'grid-change', this.check);
    
    this.handle(game, 'anim-idle', this.anim);
    this.handle(game, 'render', this.render);
  }
  
  check(evt) {
    if (evt.pos.equals(this.pos) && !evt.to) {
      this.collect();
    }
  }
  
  collect() {
    var collisions = game.getCollisions();
    var ra = this.rangeAxis;
    var rm = this.rangeManhattan;
    for (let i = -ra; i <= ra; ++i) {
      for (let j = -ra; j <= ra; ++j) {
        if (i === 0 && j === 0) continue;
        var pos = this.pos.plus(i, j);
        if (Vector2.new(i, j).manhattan() > rm) {
          continue;
        }
        var col = collisions[pos.hash()];
        if (col && col === this.grid) {
          this.grid.setBlock(pos, false, 0.1, 'gem');
        } else if (col && col.hurt) {
          col.hurt({ pos: pos, cause: 'gem' });
        }
      }
    }
    
    game.emit('gem-collect', {
      score: this.score
    });
    
    var audio = new Audio(audioGem);
    audio.volume = 1;
    audio.play();
    
    game.destroy(this);
  }
  
  anim(evt) {
    this.sprite = (this.sprite + 1) % this.sprites.length;
  }
  
  render(evt) {
    Render.context = evt.context;
    Render.sprite(this.sprites[this.sprite], this.grid.getPos(this.pos));
  }
};
},{"./object.js":7,"./render.js":10,"./vector2.js":11,"random-js":13}],5:[function(require,module,exports){
/// grid.js
//Grid utility functions

var Vector2 = require('./vector2.js');
var Render = require('./render.js');

var BaseObject = require('./object.js');

module.exports = class Grid extends BaseObject {
  constructor() {
    super();
    
    this.cellSize = new Vector2(16);
    this.gridSize = new Vector2(29, 18);
    
    //This centers it on the screen
    this.origin = Vector2.new(game.canvas.width, game.canvas.height)
      .minus(this.gridSize.minus(1).plus(0, -1).multiply(this.cellSize)).multiply(0.5);
    
    this.blocks = [];
    for (let i = 0; i < this.gridSize.x; ++i) {
      this.blocks[i] = Array(this.gridSize.y).fill(false);
    }
    this.hashBlocks = {};
    
    this.delayBlocks = {};
    
    this.handle(game, 'collision-check', this.collide);
    this.handle(game, 'update-first', this.update);
    this.handle(game, 'render-first', this.render);
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
      var oldVal = this.blocks[pos.x][pos.y];
      this.blocks[pos.x][pos.y] = (val || false);
      if (this.blocks[pos.x][pos.y]) {
        this.hashBlocks[pos.hash()] = this;
      } else {
        delete this.hashBlocks[pos.hash()];
      }
      this.delayBlocks[pos.hash()] = delay;
      game.emit('grid-change', {
        source: this,
        cause: cause,
        pos: pos.copy(),
        from: oldVal,
        to: this.blocks[pos.x][pos.y]
      });
    }
  }
  
  hurt(evt) {
    if (this.inBounds(evt.pos)) {
      this.setBlock(evt.pos, false, 0, 'hurt');
    }
  }
  
  collide(evt) {
    Object.assign(evt.instances, this.hashBlocks, Object.assign({}, evt.instances));
  }
  
  update(evt) {
    this.delayBlocks = {};
  }
  
  render(evt) {
    Render.context = evt.context;
    
    //Fill in background
    Render.context.fillStyle = 'black';
    Render.rect(this.getPos(-0.5), this.gridSize.multiply(this.cellSize));
    
    //Fill in squares
    Render.context.fillStyle = 'white';
    for (let i = 0; i < this.gridSize.x; ++i) {
      for (let j = 0; j < this.gridSize.y; ++j) {
        var drawBlock = !!this.getBlock(new Vector2(i, j));
        if (evt.time < this.delayBlocks[Vector2.new(i, j).hash()]) {
          drawBlock = !drawBlock;
        }
        if (drawBlock) {
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
},{"./object.js":7,"./render.js":10,"./vector2.js":11}],6:[function(require,module,exports){
/// main.js
//Create the main game loop, delegate input events

var Random = require('random-js')();

var Vector2 = require('./vector2.js');
var Render = require('./render.js');
var Game = require('./game.js');

var Grid = require('./grid.js');
var Colors = require('./colors.js');
var Pathfind = require('./pathfind.js');
var Player = require('./player.js');
var Enemy = require('./enemy.js');
var Gem = require('./gem.js');

function getQueryParam(name) {
  var match = window.location.search.match(/[?&]music=([^&]+)/);
  return match && match[1];
}

window.addEventListener('load', function() {
  var music = getQueryParam('music');
  if (music) {
    window.sessionStorage.setItem('music', music);
  }
  if (window.sessionStorage.getItem('music') !== '0') {
    document.getElementById('music').play();
  }
  
  window.addEventListener('keypress', function(evt) {
    if (!started) {
      evt.preventDefault();
      startGame();
    }
  });
});

var started = false;
window.startGame = function startGame() {
  if (started) return;
  started = true;
  window.removeEventListener('keypress', startGame);
  document.getElementById('title').style.display = 'none';
  
  window.game = new Game(document.getElementById('canvas'), {
    'KeyW': 'up',
    'KeyA': 'left',
    'KeyS': 'down',
    'KeyD': 'right',
    
    'ArrowUp': 'up',
    'ArrowDown': 'down',
    'ArrowLeft': 'left',
    'ArrowRight': 'right',
    
    'Space': 'action'
  });
  window.grid = game.create(Grid);
  window.pathfind = game.create(Pathfind, grid);
  window.player = game.create(Player, grid, grid.gridSize.minus(1).multiply(0.5).round());
  
  //Fill in the grid
  for (let i = 0; i < grid.gridSize.x; ++i) {
    for (let j = 0; j < grid.gridSize.y; ++j) {
      grid.setBlock(new Vector2(i, j), true);
    }
  }
  
  //Clear some space around the player
  for (let i = -6; i <= 6; ++i) {
    for (let j = -4; j <= 4; ++j) {
      grid.setBlock(player.pos.plus(i, j), false);
    }
  }
  
  function enemyAI(pos) {
    if (player.active) {
      var choices = pathfind.getNextChoices(pos, player.pos);
      return Random.pick(choices).minus(pos);
    } else {
      return Random.pick([
        new Vector2(-1, 0), new Vector2(1, 0),
        new Vector2(0, -1), new Vector2(0, 1)
      ]);
    }
  }
  
  //Spawn an enemy when a block is destroyed
  game.on('grid-change', function(evt) {
    if (evt.from && !evt.to && evt.cause !== 'gem') {
      //if (evt.from !== 'gem') {
        Enemy.spawn(grid, player.pos, enemyAI);
      //}
    }
  });
  
  //Check if something should collapse
  game.on('update-last', function(evt) {
    var collisions = game.getCollisions();
    var distances = pathfind.generateDistanceField(player.pos);
    for (let i = 0; i < grid.gridSize.x; ++i) {
      for (let j = 0; j < grid.gridSize.y; ++j) {
        var pos = new Vector2(i, j);
        if (!grid.getBlock(pos) && !Number.isFinite(distances[i][j])) {
          if (collisions[pos.hash()]) {
            game.destroy(collisions[pos.hash()], 0.4);
          }
          grid.setBlock(pos, true, 0.4);
        }
      }
    }
  });
  
  //Prepare gems
  window.score = 0;
  window.best = window.localStorage.getItem('best-score');
  
  Gem.spawn(grid, player.pos);
  game.on('gem-collect', function(evt) {
    Gem.spawn(grid, player.pos);
    score += evt.score;
    
    if (score > best) {
      window.localStorage.setItem('best-score', score);
    }
  });
  
  game.on('render-last', function(evt) {
    Render.context = evt.context;
    Render.context.fillStyle = 'white';
    Render.context.textAlign = 'left';
    Render.context.textBaseline = 'middle';
    Render.context.font = '32px IdealGarbanzo';
    Render.context.textAlign = 'left';
    Render.context.fillText(score, 8, 12);
    if (best || score) {
      Render.context.textAlign = 'right';
      Render.context.fillText(best >= score ?
        'BEST: ' + best : 'NEW BEST',
        canvas.width - 8, 12);
    }
  });
  
  game.create(Colors, grid);
  
  game.on('player-died', function() {
    window.setTimeout(function() {
      document.getElementById('gameover').style.display = '';
      window.addEventListener('keypress', function(evt) {
        evt.preventDefault();
        window.location.reload();
      });
    }, 1000);
  });
  
  //Fire it up
  game.render();
};
},{"./colors.js":1,"./enemy.js":2,"./game.js":3,"./gem.js":4,"./grid.js":5,"./pathfind.js":8,"./player.js":9,"./render.js":10,"./vector2.js":11,"random-js":13}],7:[function(require,module,exports){
 /// object.js
//Base game object that things inherit from

module.exports = class BaseObject {
  constructor() {
    this.listeners = [];
    this.active = true;
  }
  
  destroy(displayTime) {
    this.active = false;
    var keptListeners = [];
    for (let i = 0; i < this.listeners.length; ++i) {
      var data = this.listeners[i];
      if (data.name !== 'render') {
        //Things render for a little after they die
        //It looks better when you move into an attack
        this.unhandle(data);
      } else {
        keptListeners.push(data);
      }
    }
    this.listeners = keptListeners;
    window.setTimeout((function() {
      for (let i = 0; i < this.listeners.length; ++i) {
        this.unhandle(this.listeners[i]);
      }
      this.listeners = [];
    }).bind(this), displayTime !== undefined ? displayTime*1000 : 30);
  }
  
  handle(obj, name, func) {
    var data = {
      obj: obj,
      name: name,
      func: func.bind(this)
    };
    data.obj.on(data.name, data.func);
    this.listeners.push(data);
  }
  
  unhandle(data) {
    data.obj.removeListener(data.name, data.func);
  }
};
},{}],8:[function(require,module,exports){
/// pathfind.js
//Construct a grid where each cell has its distance to the player

var Vector2 = require('./vector2.js');
var Render = require('./render.js');

var BaseObject = require('./object.js');

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
  constructor(grid) {
    super();
    
    this.grid = grid;
    this.paths = {};
    
    this.handle(game, 'update-cleanup', this.invalidate);
    //this.handle(game, 'render-last', this.render);
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
    
    if (grid.inBounds(goal)) {
      distance[goal.x][goal.y] = 1;
      var queue = getAdjacent(goal);
      
      while (queue.length) {
        var pos = queue.shift();
        if (!this.grid.accessible(pos)) continue;
        var adjacent = getAdjacent(pos);
        
        var newDist = distance[pos.x][pos.y];
        for (let i = 0; i < adjacent.length; ++i) {
          newDist = Math.min(getDistance(grid, distance, adjacent[i])+1, newDist);
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
      Render.context = evt.context;
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
},{"./object.js":7,"./render.js":10,"./vector2.js":11}],9:[function(require,module,exports){
/// player.js
//Time to get some interactivity

var Random = require('random-js')();

var Vector2 = require('./vector2.js');
var Render = require('./render.js');

var BaseObject = require('./object.js');

var Enemy = require('./enemy.js');

var dimensions = new Vector2(16);
var spritesheet = document.getElementById('spritesheet');

Render.addSprite('player-up', spritesheet, dimensions.multiply(1, 4),
  dimensions, dimensions.multiply(0.5));
Render.addSprite('player-down', spritesheet, dimensions.multiply(0, 3),
  dimensions, dimensions.multiply(0.5));
Render.addSprite('player-left', spritesheet, dimensions.multiply(1, 3),
  dimensions, dimensions.multiply(0.5));
Render.addSprite('player-right', spritesheet, dimensions.multiply(0, 4),
  dimensions, dimensions.multiply(0.5));

Render.addSprite('pickaxe-hit', spritesheet, dimensions.multiply(1, 0),
  dimensions, dimensions.multiply(0.5));
Render.addSprite('pickaxe-swing', spritesheet, dimensions.multiply(0, 0),
  dimensions, dimensions.multiply(0.5));

var audioStep = 'https://cdn.gomix.com/e6f17913-09e8-449d-8798-e394b24f6eff%2Fmove.wav';
var audioHit = 'https://cdn.gomix.com/e6f17913-09e8-449d-8798-e394b24f6eff%2Fattack.wav';
var audioDie = 'https://cdn.gomix.com/e6f17913-09e8-449d-8798-e394b24f6eff%2Fdie.wav';

module.exports = class Player extends BaseObject {
  constructor(grid, pos) {
    super();
    
    this.grid = grid;
    this.pos = pos;
    this.posLast = pos.copy();
    this.facing = 'down';
    
    this.attacking = false;
    this.attackHit = false;
    
    this.handle(game, 'command-check', this.acceptCommand);
    
    this.handle(game, 'update-early', this.updateEarly);
    this.handle(game, 'update', this.update);
    this.handle(game, 'update-late', this.updateLate);
    
    this.handle(game, 'collision-check', this.collide);
    
    this.handle(game, 'render', this.render);
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
    var hit = game.collisionCheck(hitPos);
    if (hit) {
      hit.hurt({
        pos: hitPos,
        cause: 'player'
      });
      this.attackHit = true;
      var audio = new Audio(audioHit);
      audio.volume = Random.real(0.3, 0.5, true);
      audio.play();
    }
  }
  
  hurt(evt) {
    if (evt.cause !== 'gem') {
      var audio = new Audio(audioDie);
      audio.volume = 0.5;
      audio.play();
      game.emit('player-died');
      game.destroy(this);
    }
  }
  
  collide(evt) {
    if (evt.data.source === this) return;
    evt.instances[this.pos.hash()] = this;
  }
  
  acceptCommand(evt) {
    if (['up', 'down', 'left', 'right', 'action'].indexOf(evt.command) >= 0) {
      evt.accept = true;
    }
  }
  
  updateEarly(evt) {
    this.attackHit = false;
    if (evt.command === 'action') {
      this.attack();
    }
  }
  
  update(evt) {
    this.moving = false;
    this.attacking = false;
    this.posLast = this.pos.copy();
    switch (evt.command) {
      case 'up':
      case 'down':
      case 'left':
      case 'right':
        this.facing = evt.command;
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
        var audio = new Audio(audioStep);
        audio.volume = 0.3;
        audio.play();
      }
    }
  }
  
  updateLate(evt) {
    //If something else is on this space, get hurt
    if (game.collisionCheck(this.pos, { source: this })) {
      this.hurt({ cause: 'collision' });
    } else if (evt.command === 'action' && !this.attackHit) {
      this.attack();
    }
  }
  
  render(evt) {
    Render.context = evt.context;
    var displayPos = this.pos;
    if (evt.time < 0.05) {
      displayPos = displayPos.plus(this.posLast).multiply(0.5);
    }
    Render.sprite('player-'+this.facing, this.grid.getPos(displayPos));
    if (this.attacking && (evt.time < 0.3)) {
      Render.sprite((this.attackHit && evt.time < 0.1) ? 'pickaxe-hit' : 'pickaxe-swing',
        this.grid.getPos(displayPos.plus(this.getFacingDirection())),
        this.getFacingDirection().angle() - (Math.PI / 2));
    }
  }
};
},{"./enemy.js":2,"./object.js":7,"./render.js":10,"./vector2.js":11,"random-js":13}],10:[function(require,module,exports){
/// render.js
//A bunch of utility functions for drawing things

var Vector2 = require('./vector2.js');

var ctx = null;

var sprites = {};

function line(from, to) {
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x, to.y);
}

function rect(pos, size) {
  ctx.fillRect(pos.x, pos.y, size.x, size.y);
}

function addSprite(name, img, offset, size, center) {
  sprites[name] = {
    image: img,
    offset: offset.copy(),
    size: size.copy(),
    center: center.copy()
  };
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
  addSprite: addSprite,
  sprite: drawSprite
};
},{"./vector2.js":11}],11:[function(require,module,exports){
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
  
  angle() {
    return Math.atan2(this.y, this.x);
  }
  
  hash() {
    return (this.x + ',' + this.y);
  }
};
},{}],12:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

function EventEmitter() {
  this._events = this._events || {};
  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10;

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!isNumber(n) || n < 0 || isNaN(n))
    throw TypeError('n must be a positive number');
  this._maxListeners = n;
  return this;
};

EventEmitter.prototype.emit = function(type) {
  var er, handler, len, args, i, listeners;

  if (!this._events)
    this._events = {};

  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events.error ||
        (isObject(this._events.error) && !this._events.error.length)) {
      er = arguments[1];
      if (er instanceof Error) {
        throw er; // Unhandled 'error' event
      } else {
        // At least give some kind of context to the user
        var err = new Error('Uncaught, unspecified "error" event. (' + er + ')');
        err.context = er;
        throw err;
      }
    }
  }

  handler = this._events[type];

  if (isUndefined(handler))
    return false;

  if (isFunction(handler)) {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        args = Array.prototype.slice.call(arguments, 1);
        handler.apply(this, args);
    }
  } else if (isObject(handler)) {
    args = Array.prototype.slice.call(arguments, 1);
    listeners = handler.slice();
    len = listeners.length;
    for (i = 0; i < len; i++)
      listeners[i].apply(this, args);
  }

  return true;
};

EventEmitter.prototype.addListener = function(type, listener) {
  var m;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events)
    this._events = {};

  // To avoid recursion in the case that type === "newListener"! Before
  // adding it to the listeners, first emit "newListener".
  if (this._events.newListener)
    this.emit('newListener', type,
              isFunction(listener.listener) ?
              listener.listener : listener);

  if (!this._events[type])
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  else if (isObject(this._events[type]))
    // If we've already got an array, just append.
    this._events[type].push(listener);
  else
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];

  // Check for listener leak
  if (isObject(this._events[type]) && !this._events[type].warned) {
    if (!isUndefined(this._maxListeners)) {
      m = this._maxListeners;
    } else {
      m = EventEmitter.defaultMaxListeners;
    }

    if (m && m > 0 && this._events[type].length > m) {
      this._events[type].warned = true;
      console.error('(node) warning: possible EventEmitter memory ' +
                    'leak detected. %d listeners added. ' +
                    'Use emitter.setMaxListeners() to increase limit.',
                    this._events[type].length);
      if (typeof console.trace === 'function') {
        // not supported in IE 10
        console.trace();
      }
    }
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  var fired = false;

  function g() {
    this.removeListener(type, g);

    if (!fired) {
      fired = true;
      listener.apply(this, arguments);
    }
  }

  g.listener = listener;
  this.on(type, g);

  return this;
};

// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener = function(type, listener) {
  var list, position, length, i;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events || !this._events[type])
    return this;

  list = this._events[type];
  length = list.length;
  position = -1;

  if (list === listener ||
      (isFunction(list.listener) && list.listener === listener)) {
    delete this._events[type];
    if (this._events.removeListener)
      this.emit('removeListener', type, listener);

  } else if (isObject(list)) {
    for (i = length; i-- > 0;) {
      if (list[i] === listener ||
          (list[i].listener && list[i].listener === listener)) {
        position = i;
        break;
      }
    }

    if (position < 0)
      return this;

    if (list.length === 1) {
      list.length = 0;
      delete this._events[type];
    } else {
      list.splice(position, 1);
    }

    if (this._events.removeListener)
      this.emit('removeListener', type, listener);
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  var key, listeners;

  if (!this._events)
    return this;

  // not listening for removeListener, no need to emit
  if (!this._events.removeListener) {
    if (arguments.length === 0)
      this._events = {};
    else if (this._events[type])
      delete this._events[type];
    return this;
  }

  // emit removeListener for all listeners on all events
  if (arguments.length === 0) {
    for (key in this._events) {
      if (key === 'removeListener') continue;
      this.removeAllListeners(key);
    }
    this.removeAllListeners('removeListener');
    this._events = {};
    return this;
  }

  listeners = this._events[type];

  if (isFunction(listeners)) {
    this.removeListener(type, listeners);
  } else if (listeners) {
    // LIFO order
    while (listeners.length)
      this.removeListener(type, listeners[listeners.length - 1]);
  }
  delete this._events[type];

  return this;
};

EventEmitter.prototype.listeners = function(type) {
  var ret;
  if (!this._events || !this._events[type])
    ret = [];
  else if (isFunction(this._events[type]))
    ret = [this._events[type]];
  else
    ret = this._events[type].slice();
  return ret;
};

EventEmitter.prototype.listenerCount = function(type) {
  if (this._events) {
    var evlistener = this._events[type];

    if (isFunction(evlistener))
      return 1;
    else if (evlistener)
      return evlistener.length;
  }
  return 0;
};

EventEmitter.listenerCount = function(emitter, type) {
  return emitter.listenerCount(type);
};

function isFunction(arg) {
  return typeof arg === 'function';
}

function isNumber(arg) {
  return typeof arg === 'number';
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isUndefined(arg) {
  return arg === void 0;
}

},{}],13:[function(require,module,exports){
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
},{}]},{},[6]);

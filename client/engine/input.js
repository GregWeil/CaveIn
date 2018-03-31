/// input.js
//Take player input and send it to the game

var _ = require('underscore');

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
      new InputType(Object.create(config, {
        emit: this.handler.bind(this)
      }))
    );
  }
  
  destructor() {
    _.invoke(this.inputs, 'destructor');
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
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
    
    this.inputs = _.map(inputs, function(Input) {
      return new Input(_.defaults({ emit: this.handler
      }, config));
    }, this);
  }
  
  destructor() {
    _.invoke(this.inputs, 'destructor');
    super.destructor();
  }
  
  handler(cmd) {
    this.command(cmd);
  }
}

class InputThrottler extends Input {
  constructor(config, inputs) {
    super(config, inputs);
  }
}

class OldInput {
  constructor(config) {
    this.emitCommand = config.emit || _.noop;
    this.checkCommand = config.check || _.constant(true);
  }
  
  destructor() {
    //Inheriting input types override this
  }
  
  command(cmd) {
    this.emitCommand(cmd);
  }
  
  check(cmd) {
    return this.checkCommand(cmd);
  }
  
  tryCommand(cmd) {
    if (this.check(cmd)) {
      this.command(cmd);
      return true;
    }
    return false;
  }
}

class InputThrottled extends OldInput {
  constructor(config) {
    super(config);
    
    this.timeNext = -Infinity;
    this.timeInterval = 150;
  }
  
  command(cmd) {
    super.command(cmd);
    this.timeNext = performance.now() + this.timeInterval;
  }
  
  check(cmd) {
    if (performance.now() > this.timeNext) {
      return super.check(cmd);
    }
    return false;
  }
}

class InputKeyboard extends InputThrottled {
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
      return this.tryCommand(cmd);
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

class InputSwipe extends InputThrottled {
  constructor(config) {
    super(config);
    
    this.moveThreshold = 7.5;
    
    this.game = config.game;
    this.target = this.game.canvas;
    
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
        this.tryCommand(command);
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

class InputCombined extends InputThrottled {
  constructor(config) {
    super(config);
    
    var sourceConfig = _.defaults({
      emit: this.tryCommand.bind(this),
      check: this.check.bind(this)
    }, config)
    
    this.sources = [
      new InputKeyboard(sourceConfig),
      new InputSwipe(sourceConfig)
    ];
  }
  
  destructor() {
    for (var i = 0; i < this.sources.length; ++i) {
      this.sources[i].destructor();
    }
    
    super.destructor();
  }
}

module.exports = {
  Keyboard: InputKeyboard,
  Swipe: InputSwipe,
  Combined: InputCombined
};
/// input.ts
//Take player input and send it to the game

import Vector2 from './vector2';
import { EventEmitter } from './events';

class Input extends EventEmitter {
  constructor() {
    super();
  }
  
  destructor() {
  }
  
  protected command(cmd: string) {
    this.emit('command', { command: cmd });
  }
}

class InputWrapper extends Input {
  private readonly inputs: Input[];
  
  constructor(config: any, inputs: any[]) {
    super();
    
    this.inputs = inputs.map(InputType => new InputType(config));
    this.inputs.forEach(input => {
      input.on('command', evt => this.command(evt.data.command));
    });
  }
  
  destructor() {
    this.inputs.forEach(input => input.destructor());
    super.destructor();
  }
}

class InputThrottled extends InputWrapper {
  private time: number;
  
  constructor(config: any, inputs: any[]) {
    super(config, inputs);
    this.time = -Infinity;
  }
  
  protected command(cmd: string) {
    if (performance.now() > this.time) {
      super.command(cmd);
      this.time = performance.now() + 150;
    }
  }
}

class InputQueued extends InputWrapper {
  private callback: any|null;
  private queued: string|null;
  
  constructor(config: any, inputs: any[]) {
    super(config, inputs);
    this.callback = null;
    this.queued = null;
  }
  
  destructor() {
    if (this.callback !== null) {
      window.clearTimeout(this.callback);
    }
    super.destructor();
  }
  
  protected command(cmd: string) {
    if (this.callback === null) {
      super.command(cmd);
      this.queued = null;

      this.callback = window.setTimeout(() => {
        this.callback = null;
        if (this.queued) {
          this.command(this.queued);
        }
      }, 150);
    } else {
      this.queued = cmd;
    }
  }
}

class InputKeyboard extends Input {
  private readonly keyCommands: { [key: string]: string };
  private keyLast: string|null;
  
  constructor(keys: { [key: string]: string }) {
    super();
    
    this.keyCommands = keys;
    this.keyLast = null;
    
    this.keyDown = this.keyDown.bind(this);
    this.keyUp = this.keyUp.bind(this);
    
    window.addEventListener('keydown', this.keyDown, true);
    window.addEventListener('keyup', this.keyUp, true);
  }
  
  destructor() {
    window.removeEventListener('keydown', this.keyDown, true);
    window.removeEventListener('keyup', this.keyUp, true);
    super.destructor();
  }
  
  keyDown(evt: KeyboardEvent) {
    if (this.keyLast === evt.code) {
      return;
    }
    this.keyLast = evt.code;
    if (this.keyCommands[evt.code]) {
      this.command(this.keyCommands[evt.code]);
      evt.preventDefault();
      evt.stopPropagation();
    }
  }
  
  keyUp(evt: KeyboardEvent) {
    if (this.keyLast === evt.code) {
      this.keyLast = null;
    }
  }
}

class InputSwipe extends Input {
  private readonly target: HTMLCanvasElement;
  private readonly swipeCommands: string[];
  private readonly tapCommand: string;
  
  private readonly touches: { [key: string]: any };
  
  constructor(target: HTMLCanvasElement, swipes: string[], tap: string) {
    super();
    
    this.target = target;
    this.swipeCommands = swipes;
    this.tapCommand = tap;
    
    this.touches = {};
    
    this.touchStart = this.touchStart.bind(this);
    this.touchMove = this.touchMove.bind(this);
    this.touchEnd = this.touchEnd.bind(this);
    
    this.target.addEventListener('touchstart', this.touchStart, true);
    this.target.addEventListener('touchmove', this.touchMove, true);
    this.target.addEventListener('touchend', this.touchEnd, true);
  }
  
  destructor() {
    this.target.removeEventListener('touchstart', this.touchStart, true);
    this.target.removeEventListener('touchmove', this.touchMove, true);
    this.target.removeEventListener('touchend', this.touchEnd, true);
    super.destructor();
  }
  
  private normalizePosition(x: number, y: number) {
    const rect = this.target.getBoundingClientRect();
    return Vector2.new(x, y)
      .minus(rect.left, rect.top).divide(rect.width, rect.height)
      .multiply(this.target.width, this.target.height);
  }
  
  private touchUpdate(evtTouch: Touch, timeStamp: number) {
    const id = evtTouch.identifier;
    if (this.touches[id] && timeStamp > this.touches[id].lastTime) {
      this.touches[id].lastPos = this.normalizePosition(evtTouch.clientX, evtTouch.clientY);
      this.touches[id].lastTime = timeStamp;
    }
  }
  
  private touchCommand(touch: Touch) {
    const touch = this.touches[touch.identifier];
    const pos = this.normalizePosition(touch.clientX, touch.clientY);
    if (touch) {
      const offset = pos.minus(touch.firstPos);
      if (offset.length() < 10) {
        return this.tapCommand;
      } else {
        const increments = this.swipeCommands.length;
        const segment = Math.round(offset.angle() * (increments / 2) / Math.PI);
        const direction = ((segment + increments) % increments);
        return this.swipeCommands[direction] || null;
      }
    }
    return null;
  }
  
  private touchExecute(id) {
    var touch = this.touches[id];
    if (touch) {
      var command = this.touchCommand(touch.id);
      if (command) {
        this.command(command);
      }
      
      delete this.touches[touch.id];
    }
  }
  
  private touchStart(evt: any) {
    evt.preventDefault();
    evt.stopPropagation();
    for (let i = 0; i < evt.changedTouches.length; ++i) {
      const touch = evt.changedTouches[i];
      this.touches[id] = {
        id: touch.identifier,
        firstTime: evt.timeStamp,
        firstPos: this.normalizePosition(touch.clientX, touch.clientY)
      };
    }
  }
  
  private touchMove(evt: any) {
    evt.preventDefault();
    evt.stopPropagation();
    for (let i = 0; i < evt.changedTouches.length; ++i) {
      const touch = this.touches[evt.changedTouches[i].identifier];
      if (touch) {
        const command = this.touchCommand(touch.id);
        if (command && command != this.tapCommand) {
          this.touchExecute(touch.id);
        }
      }
    }
  }
  
  private touchEnd(evt: any) {
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
/// input.ts
//Take player input and send it to the game

import Vector2 from './vector2';
import { EventEmitter } from './events';

export abstract class Input extends EventEmitter {
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
  
  constructor(inputs: Input[]) {
    super();
    
    this.inputs = inputs;
    this.inputs.forEach(input => {
      input.on('command', evt => this.command(evt.data.command));
    });
  }
  
  destructor() {
    this.inputs.forEach(input => input.destructor());
    super.destructor();
  }
}

export class InputThrottled extends InputWrapper {
  private time: number;
  
  constructor(inputs: Input[]) {
    super( inputs);
    this.time = -Infinity;
  }
  
  protected command(cmd: string) {
    if (performance.now() > this.time) {
      super.command(cmd);
      this.time = performance.now() + 150;
    }
  }
}

export class InputQueued extends InputWrapper {
  private callback: any|null;
  private queued: string|null;
  
  constructor(inputs: Input[]) {
    super(inputs);
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

export class InputKeyboard extends Input {
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

export class InputSwipe extends Input {
  private readonly target: HTMLCanvasElement;
  private readonly swipeCommands: (string|null)[];
  private readonly tapCommand: string;
  
  private readonly touches: { [key: string]: { time: number, pos: Vector2 } };
  
  constructor(target: HTMLCanvasElement, swipes: (string|null)[], tap: string) {
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
  
  private touchCommand(touch: Touch) {
    const pos = this.normalizePosition(touch.clientX, touch.clientY);
    if (this.touches[touch.identifier]) {
      const offset = pos.minus(this.touches[touch.identifier].pos);
      if (offset.length() < 10) {
        return this.tapCommand;
      } else {
        const increments = this.swipeCommands.length;
        const segment = Math.round(offset.angle() * (increments / 2) / Math.PI);
        const direction = ((segment + increments) % increments);
        return this.swipeCommands[direction];
      }
    }
    return '';
  }
  
  private touchExecute(touch: Touch) {
    if (this.touches[touch.identifier]) {
      const command = this.touchCommand(touch);
      if (command) {
        this.command(command);
      }
      
      delete this.touches[touch.identifier];
    }
  }
  
  private touchStart(evt: Event) {
    evt.preventDefault();
    evt.stopPropagation();
    const changedTouches = (evt as TouchEvent).changedTouches;
    for (let i = 0; i < changedTouches.length; ++i) {
      const touch = changedTouches[i];
      this.touches[touch.identifier] = {
        time: evt.timeStamp,
        pos: this.normalizePosition(touch.clientX, touch.clientY)
      };
    }
  }
  
  private touchMove(evt: Event) {
    evt.preventDefault();
    evt.stopPropagation();
    const changedTouches = (evt as TouchEvent).changedTouches;
    for (let i = 0; i < changedTouches.length; ++i) {
      const touch = changedTouches[i];
      if (this.touches[touch.identifier]) {
        const command = this.touchCommand(touch);
        if (command && command !== this.tapCommand) {
          this.touchExecute(touch);
        }
      }
    }
  }
  
  private touchEnd(evt: Event) {
    evt.preventDefault();
    evt.stopPropagation();
    const changedTouches = (evt as TouchEvent).changedTouches;
    for (var i = 0; i < changedTouches.length; ++i) {
      const touch = changedTouches[i];
      const original = this.touches[touch.identifier];
      if (original) {
        if (evt.timeStamp - original.time < 1000) {
          this.touchExecute(touch);
        }
        delete this.touches[touch.identifier];
      }
    }
  }
}
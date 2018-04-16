/// engine.ts
//Main engine loop

import { EventEmitter } from './events';
import Vector2 from './vector2';

export default class Engine extends EventEmitter {
  active: boolean;
  headless: booleans;
  locked: boolean;
  silent: boolean;
  
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  
  constructor(config: any) {
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
    if (!this.active) return;
    
    //Clear the canvas
    this.ctx.fillStyle = 'black';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    //Draw everything
    this.emit('render', {
      context: this.ctx,
      time: (performance.now() - this.updateTime) / 1000
    });
    
    //Queue up the next render
    window.requestAnimationFrame(this.render.bind(this));
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
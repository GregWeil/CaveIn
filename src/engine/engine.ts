/// engine.ts
//Main engine loop

import { Howl } from 'howler';

import { EventEmitter } from './events';
import Vector2 from './vector2';
import BaseObject from './object';

export default class Engine extends EventEmitter {
  active: boolean;
  headless: boolean;
  locked: boolean;
  silent: boolean;
  
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  
  updateTime: number;
  objects: BaseObject<this>[];
  
  constructor(config: any) {
    super();
    
    this.active = true;
    this.headless = !config.canvas;
    this.locked = config.locked || this.headless;
    this.silent = config.silent || this.headless;
    
    this.canvas = config.canvas || document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d')!;
    
    this.updateTime = performance.now();
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
  
  update(command: string) {
    const dt = (performance.now() - this.updateTime) / 1000;
    
    this.emit('update', {
      command: command,
      time: dt
    });
    
    this.updateTime = performance.now();
  }
  
  commandCheck(command: string) {
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
  
  sound(asset: Howl, config?: any) {
    if (this.silent) {
      return null;
    }
    const audio = asset.play();
    if (config) {
      if ('volume' in config) {
        asset.volume(config.volume, audio);
      }
    }
    return audio;
  }
  
  create<T extends BaseObject<this>>(Obj: { new (config: any): T }, config?: any): T {
    config = Object.assign({ game: this }, (config || {}));
    const inst = new Obj(config);
    this.objects.push(inst);
    return inst;
  }
  
  destroy(inst: BaseObject<this>, displayTime?: number) {
    const index = this.objects.indexOf(inst);
    if (index >= 0) {
      inst.destroy(displayTime);
      this.objects.splice(index, 1);
    }
  }
}
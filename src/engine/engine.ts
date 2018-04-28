/// engine.ts
//Main engine loop

import { Howl } from 'howler';

import { EventEmitter } from './events';
import Vector2 from './vector2';
import BaseObject from './object';

export default class Engine extends EventEmitter {
  active: boolean;
  headless: boolean;
  silent: boolean;
  
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  
  updateTime: number;
  objects: BaseObject<Engine>[];
  
  constructor(config: any) {
    super();
    
    this.active = true;
    this.headless = !config.canvas;
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
  
  create<G extends Engine, T extends BaseObject<G>>(Obj: Constructor0<G, T>): T;
  create<G extends Engine, T extends BaseObject<G>, A>(Obj: Constructor1<G, T, A>, a: A): T;
  create<G extends Engine, T extends BaseObject<G>>(Obj: Constructor<G, T>, ...params: any[]): T {
    const inst = new Obj(<G>this, ...params);
    this.objects.push(inst);
    return inst;
  }
  
  destroy(inst: BaseObject<Engine>, displayTime?: number) {
    const index = this.objects.indexOf(inst);
    if (index < 0) {
      throw 'Tried to destroy an object that is not mine';
    }
    inst.destroy(displayTime);
    this.objects.splice(index, 1);
  }
}

// How does one variadic?
interface Constructor<G extends Engine, T extends BaseObject<G>> {
  new (game: G, ...params: any[]): T;
}
interface Constructor0<G extends Engine, T extends BaseObject<G>> {
  new (game: G): T;
}
interface Constructor1<G extends Engine, T extends BaseObject<G>, A> {
  new (game: G, a: A): T;
}
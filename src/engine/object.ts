/// object.ts
//Base game object that things inherit from

import Engine from './engine';
import { Emitter, Handler } from './events';

export default class BaseObject<Game extends Engine> {
  protected game: Game;
  private handlers: Handler<any>[];
  
  active: boolean;
  
  constructor(game: Game) {
    this.game = game;
    this.handlers = [];
    this.active = true;
  }
  
  destroy(displayTime?: number) {
    this.active = false;
    const handlers = Array.from(this.handlers);
    for (let i = 0; i < handlers.length; ++i) {
      const data = handlers[i];
      //Things render for a little after they die
      //It looks better when you move into an attack
      if (data.source !== this.game.onRender) {
        this.unhandle(data);
      }
    }
    setTimeout(() => {
      const handlers = Array.from(this.handlers);
      for (let i = 0; i < handlers.length; ++i) {
        this.unhandle(handlers[i]);
      }
    }, displayTime !== undefined ? displayTime*1000 : 30);
  }
  
  protected listen<T>(emitter: Emitter<T>, func: (evt: T) => void, priority?: number) {
    this.handlers.push(emitter.listen(func, priority));
  }
  
  protected unhandle(handler: Handler<any>) {
    const index = this.handlers.indexOf(handler);
    this.handlers.splice(index, 1);
    handler.active = false;
  }
};
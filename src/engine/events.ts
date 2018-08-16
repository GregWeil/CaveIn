/// events.js
//A pretty standard event system

//Key features
//Prioritized handlers, lower numbers first
//Unbind handlers by setting hander.active = false

export class Handler<T> {
  active: boolean;
  source: any;
  func: (data: T) => void;
  priority: number;
  
  constructor(source: any, func: (data: T) => void, priority: number = 0) {
    this.active = true;
    
    this.source = source;
    this.func = func;
    this.priority = priority;
  }
  
  handle(data: T) {
    this.func(data);
  }
}

export class Emitter<T> {
  private handlers: Handler<T>[];
  
  constructor() {
    this.handlers = [];
  }
  
  emit(data: T) {
    this.handlers = this.handlers.filter(h => h.active);
    
    for (let i = 0; i < this.handlers.length; ++i) {
      this.handlers[i].handle(data);
    }
    
    return data;
  }
  
  listen(func: (evt: T) => void, priority?: number) {
    const handler = new Handler(this, func, priority);
    
    let index = this.handlers.findIndex(h => h.priority > handler.priority);
    if (index < 0) index = this.handlers.length;
    this.handlers.splice(index, 0, handler);
    
    return handler;
  }
}
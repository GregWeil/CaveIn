/// events.js
//A pretty standard event system

//Key features
//Prioritized handlers, lower numbers first
//Unbind handlers by setting hander.active = false

export class Event {
  data: any;
  
  constructor(data: any) {
    this.data = data;
  }
}

export class Handler {
  active: boolean;
  source: any;
  type: string;
  func: (evt: Event) => void;
  priority: number;
  funcName: string;
  
  constructor(source: any, name: string, func: (evt: Event) => void, priority?: number, ctx?: object) {
    this.active = true;
    
    this.source = source;
    this.type = name;
    this.func = ctx ? func.bind(ctx) : func;
    this.priority = priority || 0;
    
    this.funcName = func.name;
  }
  
  handle(event: Event): void {
    this.func(event);
  }
}

export class EventEmitter {
  private handlers: { [key: string]: Handler[] };
  
  constructor() {
    this.handlers = {};
  }
  
  emit(name: string, data?: any): Event {
    const event = new Event(data || {});
    
    let handlers = this.handlers[name] || [];
    handlers = handlers.filter(handler => handler.active);
    this.handlers[name] = handlers;
    
    for (let i = 0; i < handlers.length; ++i) {
      handlers[i].handle(event);
    }
    
    return event;
  }
  
  on(name: string, func: (evt: Event) => void, ctx?: object, priority?: number): Handler {
    const handler = new Handler(this, name, func, priority, ctx);
    
    let handlers = this.handlers[handler.type] || [];
    let index = handlers.findIndex(h => h.priority > handler.priority);
    if (index < 0) index = handlers.length;
    handlers.splice(index, 0, handler);
    this.handlers[handler.type] = handlers;
    
    return handler;
  }
}

export class Emitter<T> {
  private handlers: Handler[];
  
  constructor() {
    this.handlers = [];
  }
  
  emit(data: T) {
    const event = new Event(data);
    
    this.handlers = this.handlers.filter(h => h.active);
    for (let i = 0; i < this.handlers.length; ++i) {
      this.handlers[i].handle(event);
    }
    
    return event;
  }
  
  listen(func: (evt: Event) => void, priority?: number) {
    const handler = new Handler(this, '', func, priority);
    
    let index = this.handlers.findIndex(h => h.priority > handler.priority);
    if (index < 0) index = this.handlers.length;
    this.handlers.splice(index, 0, handler);
    
    return handler;
  }
}
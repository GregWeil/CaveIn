/// events.js
//A pretty standard event system

//Key features
//Prioritized handlers, lower numbers first
//Unbind handlers by setting hander.active = false

export class Event<T> {
  source: EventEmitter;
  type: string;
  data: T;
  
  constructor(source: EventEmitter, name: string, data: T) {
    this.source = source;
    this.type = name;
    this.data = data;
  }
}

export class Handler<T> {
  active: boolean;
  type: string;
  func: (evt: Event<T>) => void;
  priority: number;
  funcName: string;
  as: object|undefined;
  
  constructor(name: string, func: (evt: Event<T>) => void, priority: number|undefined, ctx: object|undefined) {
    this.active = true;
    
    this.type = name;
    this.func = ctx ? func.bind(ctx) : func;
    this.priority = priority || 0;
    
    this.funcName = func.name;
    this.as = ctx;
  }
  
  handle(event: Event<T>): void {
    this.func(event);
  }
}

export class EventEmitter {
  private handlers: { [key: string]: Handler<any>[] };
  
  constructor() {
    this.handlers = {};
  }
  
  emit<T = {}>(name: string, data: T): Event<T> {
    const event = new Event(this, name, data);
    
    let handlers = this.handlers[name] || [];
    handlers = handlers.filter(handler => handler.active);
    this.handlers[name] = handlers;
    
    for (let i = 0; i < handlers.length; ++i) {
      handlers[i].handle(event);
    }
    
    return event;
  }
  
  on<T>(name: string, func: (evt: Event<T>) => void, ctx?: object, priority?: number): Handler<T> {
    const handler = new Handler(name, func, priority, ctx);
    
    let handlers = this.handlers[handler.type] || [];
    let index = handlers.findIndex(h => h.priority > handler.priority);
    if (index < 0) index = handlers.length;
    handlers.splice(index, 0, handler);
    this.handlers[handler.type] = handlers;
    
    return handler;
  }
}
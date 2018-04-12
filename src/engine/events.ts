/// events.js
//A pretty standard event system

//Key features
//Prioritized handlers, lower numbers first
//Unbind handlers by setting hander.active = false

export class Event {
  source: EventEmitter;
  type: string;
  data: object;
  
  constructor(source: EventEmitter, name: string, data: object) {
    this.source = source;
    this.type = name;
    this.data = data;
  }
}

export class Handler {
  active: boolean;
  type: string;
  func: (evt: Event) => void;
  priority: number;
  funcName: string;
  as: object|undefined;
  
  constructor(name: string, func: (evt: Event) => void, priority: number, ctx: object) {
    this.active = true;
    
    this.type = name;
    this.func = ctx ? func.bind(ctx) : func;
    this.priority = priority || 0;
    
    this.funcName = func.name;
    this.as = ctx;
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
  
  emit(name: string, data?: object): Event {
    const event = new Event(this, name, data || {});
    
    let handlers = this.handlers[name] || [];
    handlers = handlers.filter(handler => handler.active);
    this.handlers[name] = handlers;
    
    for (let i = 0; i < handlers.length; ++i) {
      handlers[i].handle(event);
    }
    
    return event;
  }
  
  on(name: string, func: (evt: Event) => void, ctx: object, priority: number): Handler {
    const handler = new Handler(name, func, priority, ctx);
    
    let handlers = this.handlers[handler.type] || [];
    let index = handlers.findIndex(h => h.priority > handler.priority);
    if (index < 0) index = handlers.length;
    handlers.splice(index, 0, handler);
    this.handlers[handler.type] = handlers;
    
    return handler;
  }
};
/// events.js
//A pretty standard event system

//Key features
//Prioritized handlers, lower numbers first
//Unbind handlers by setting hander.active = false

export class Event {
  source: EventEmitter;
  type: string;
  data: object;
  
  constructor(source: object, name: string, data: object) {
    this.source = source;
    this.type = name;
    this.data = data;
  }
}

export class Handler {
  constructor(data) {
    this.active = true;
    
    this.type = data.type;
    this.func = data.as ? data.func.bind(data.as) : data.func;
    this.priority = data.priority || 0;
    
    this.funcName = data.func.name;
    this.as = data.as;
  }
  
  handle(event) {
    this.func(event);
  }
}

export class EventEmitter {
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
  
  on(name, func, as, priority) {
    var handler = new Handler({
      type: name,
      func: func,
      priority: priority,
      as: as
    });
    var handlers = this.handlers[handler.type] || [];
    
    const index = handlers.findIndex(h => h.pr
    for (index = 0; index < handlers.length; ++index) {
      if (handlers[index].priority > handler.priority) break;
    }
    handlers.splice(index, 0, handler);
    
    this.handlers[handler.type] = handlers;
    return handler;
  }
};
/// events.js
//A pretty standard event system

//Key features
//Prioritized handlers, lower numbers first
//Unbind handlers by setting hander.active = false

var _ = require('underscore');

class Event {
  constructor(data) {
    this.source = data.source;
    this.type = data.type;
    this.data = data.data;
  }
}

class Handler {
  constructor(data) {
    this.active = true;
    
    this.type = data.type;
    this.func = data.as ? _.bind(data.func, data.as) : data.func;
    this.priority = data.priority || 0;
    
    this.funcName = data.func.name;
    this.as = data.as;
  }
  
  handle(event) {
    this.func(event);
  }
}

module.exports = class EventEmitter {
  constructor() {
    this.handlers = {};
  }
  
  emit(type, data) {
    var event = new Event({
      source: this,
      type: type,
      data: data || {}
    });
    
    var handlers = this.handlers[type] || [];
    handlers = handlers.filter(handler => handler.active);
    this.handlers[type] = handlers;
    
    for (let i = 0; i < handlers.length; ++i) {
      handlers[i].handle(event);
    }
    
    return event;
  }
  
  on(type, func, as, priority) {
    var handler = new Handler({
      type: type,
      func: func,
      priority: priority,
      as: as
    });
    var handlers = this.handlers[handler.type] || [];
    
    var index;
    for (index = 0; index < handlers.length; ++index) {
      if (handlers[index].priority > handler.priority) break;
    }
    handlers.splice(index, 0, handler);
    
    this.handlers[handler.type] = handlers;
    return handler;
  }
};
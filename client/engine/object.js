/// object.js
//Base game object that things inherit from

module.exports = class BaseObject {
  constructor(config) {
    this.game = config.game;
    this.handlers = [];
    this.active = true;
  }
  
  destroy(displayTime) {
    this.active = false;
    var handlers = Array.from(this.handlers);
    for (let i = 0; i < handlers.length; ++i) {
      var data = handlers[i];
      //Things render for a little after they die
      //It looks better when you move into an attack
      if (data.type !== 'render') {
        this.unhandle(data);
      }
    }
    window.setTimeout(() => {
      var handlers = Array.from(this.handlers);
      for (let i = 0; i < handlers.length; ++i) {
        this.unhandle(handlers[i]);
      }
    }, displayTime !== undefined ? displayTime*1000 : 30);
  }
  
  storeHandler(handler) {
    this.handlers.push(handler);
  }
  
  dropHandler(handler) {
    var index = this.handlers.indexOf(handler);
    this.handlers.splice(index, 1);
  }
  
  handle(obj, type, func, priority) {
    this.storeHandler(obj.on(type, func, this, priority));
  }
  
  unhandle(handler) {
    this.dropHandler(handler);
    handler.active = false;
  }
};
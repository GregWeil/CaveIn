/// object.js
//Base game object that things inherit from

var _ = require('underscore');

module.exports = class BaseObject {
  constructor(config) {
    this.game = config.game;
    this.handlers = [];
    this.active = true;
  }
  
  destroy(displayTime) {
    this.active = false;
    var handlers = _.clone(this.handlers);
    for (let i = 0; i < handlers.length; ++i) {
      var data = handlers[i];
      //Things render for a little after they die
      //It looks better when you move into an attack
      if (data.type !== 'render') {
        this.unhandle(data);
      }
    }
    window.setTimeout((function() {
      var handlers = _.clone(this.handlers);
      for (let i = 0; i < handlers.length; ++i) {
        this.unhandle(handlers[i]);
      }
    }).bind(this), !_.isUndefined(displayTime) ? displayTime*1000 : 30);
  }
  
  storeHandler(handler) {
    this.handlers.push(handler);
  }
  
  dropHandler(handler) {
    this.handlers = _.without(this.handlers, handler);
  }
  
  handle(obj, type, func, priority) {
    this.storeHandler(obj.on(type, func, this, priority));
  }
  
  unhandle(handler) {
    this.dropHandler(handler);
    handler.active = false;
  }
};
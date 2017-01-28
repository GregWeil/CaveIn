 /// object.js
//Base game object that things inherit from

module.exports = class BaseObject {
  constructor() {
    this.listeners = [];
    this.active = true;
  }
  
  destroy(displayTime) {
    this.active = false;
    var keptListeners = [];
    for (let i = 0; i < this.listeners.length; ++i) {
      var data = this.listeners[i];
      if (data.name !== 'render') {
        //Things render for a little after they die
        //It looks better when you move into an attack
        this.unhandle(data);
      } else {
        keptListeners.push(data);
      }
    }
    this.listeners = keptListeners;
    window.setTimeout((function() {
      for (let i = 0; i < this.listeners.length; ++i) {
        this.unhandle(this.listeners[i]);
      }
      this.listeners = [];
    }).bind(this), displayTime !== undefined ? displayTime*1000 : 30);
  }
  
  handle(obj, name, func) {
    var data = {
      obj: obj,
      name: name,
      func: func.bind(this)
    };
    data.obj.on(data.name, data.func);
    this.listeners.push(data);
  }
  
  unhandle(data) {
    data.obj.removeListener(data.name, data.func);
  }
};
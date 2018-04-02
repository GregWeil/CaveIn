/// score.js
//Show a popup when the player gets any points

var Render = require('engine/render');
var BaseObject = require('engine/object');

module.exports = class Score extends BaseObject {
  constructor(config) {
    super(config);
    
    this.grid = config.grid;
    
    this.popups = [];
    
    this.handle(this.game, 'update', this.update, -Infinity);
    this.handle(this.game, 'score', this.score);
    this.handle(this.game, 'render', this.render, 900);
  }
  
  update(evt) {
    if (this.popups.length) {
      var kept = [];
      for (var i = 0; i < this.popups.length; ++i) {
        var popup = this.popups[i];
        popup.time -= evt.data.time;
        popup.delay = 0;
        if (popup.time >= Math.max(popup.delay, 0)) {
          kept.push(popup);
        }
      }
      if (!this.headless) {
        this.popups = kept;
      }
    }
  }
  
  score(evt) {
    if (evt.data.pos) {
      this.popups.push({
        score: evt.data.score,
        pos: evt.data.pos,
        time: 1.2, delay: 0.5
      });
    }
  }
  
  render(evt) {
    Render.context.fillStyle = 'white';
    Render.context.textAlign = 'center';
    Render.context.textBaseline = 'middle';
    Render.context.font = '16px IdealGarbanzo';
    for (var i = 0; i < this.popups.length; ++i) {
      var popup = this.popups[i];
      if (evt.data.time < popup.delay || evt.data.time > popup.time) continue;
      if (this.game.collide.get(popup.pos)) continue;
      Render.text('+' + popup.score, this.grid.getPos(popup.pos));
    }
  }
};
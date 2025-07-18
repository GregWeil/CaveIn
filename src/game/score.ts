/// score.ts
//Show a popup when the player gets any points

import * as Render from '../engine/render';
import BaseObject from '../engine/object';
import Vector2 from '../engine/vector2';
import Game from './game';

interface Popup {
  score: number;
  pos: Vector2;
  time: number;
  delay: number;
}

export default class Score extends BaseObject<Game> {
  private popups: Popup[];
  
  constructor(game: Game) {
    super(game);
    
    this.popups = [];
    
    this.listen(this.game.onUpdate, evt => this.update(evt.time), -Infinity);
    this.listen(this.game.onScore, evt => this.score(evt.score, evt.pos));
    this.listen(this.game.onRender, evt => this.render(evt.context, evt.time), 900);
  }
  
  update(time: number) {
    if (this.popups.length) {
      const kept = [];
      for (var i = 0; i < this.popups.length; ++i) {
        const popup = this.popups[i];
        popup.time -= time;
        popup.delay = 0;
        if (popup.time >= Math.max(popup.delay, 0)) {
          kept.push(popup);
        }
      }
      this.popups = kept;
    }
  }
  
  score(score: number, pos: Vector2) {
    this.popups.push({
      score, pos,
      time: 1.2,
      delay: 0.5,
    });
  }
  
  render(ctx: CanvasRenderingContext2D, time: number) {
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '16px IdealGarbanzo';
    for (var i = 0; i < this.popups.length; ++i) {
      var popup = this.popups[i];
      if (time < popup.delay || time > popup.time) continue;
      if (this.game.collide.get(popup.pos)) continue;
      Render.text(ctx, '+' + popup.score, this.game.grid.getPos(popup.pos));
    }
  }
}
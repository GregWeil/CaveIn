/// collide.ts
//General grid-based collision checking

import Vector2 from '../engine/vector2';
import * as Render from '../engine/render';
import BaseObject from '../engine/object';
import { Event } from '../engine/events';

import Game from './game';

interface Collider extends BaseObject<Game> {
  hurt(data: { pos: Vector2, cause: string, delay?: number, hit?: boolean }): void;
}

interface Collision {
  instance: Collider;
  priority: number;
}

export default class Collide extends BaseObject<Game> {
  private collisions: { [key: string]: Collision[] };
   
  constructor(game: Game) {
    super(game);
    
    this.collisions = {};
    
    //this.listen(this.game.onRender, evt => this.render(evt.data.context), Infinity);
  }
  
  render(context: CanvasRenderingContext2D) {
    context.fillStyle = 'red';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    for (let i = 0; i < this.game.grid.gridSize.x; ++i) {
      for (let j = 0; j < this.game.grid.gridSize.y; ++j) {
        const data = this.getData(Vector2.new(i, j).hash());
        if (data.length) {
          Render.text(context, data[0].priority.toString(), this.game.grid.getPos(i, j));
        }
      }
    }
  }
  
  private getData(hash: string) {
    return this.collisions[hash] || [];
  }
  
  private setData(hash: string, data: Collision[]) {
    this.collisions[hash] = data;
  }
  
  add(pos: Vector2, instance: Collider, priority: number = 0) {
    const hash = pos.hash();
    const data = this.getData(hash);
    
    let index: number;
    for (index = 0; index < data.length; ++index) {
      if (data[index].priority > priority) break;
    }
    
    data.splice(index, 0, {
      instance: instance,
      priority: priority
    });
    
    this.setData(hash, data);
    return data[index];
  }
  
  remove(pos: Vector2, instance: Collider) {
    const hash = pos.hash();
    const data = this.getData(hash);
    const index = data.findIndex(item => item.instance === instance);
    if (index < 0) return null;
    const removed = data[index];
    data.splice(index, 1);
    this.setData(hash, data);
    return removed;
  }
  
  move(from: Vector2, to: Vector2, instance: Collider) {
    const removed = this.remove(from, instance);
    if (removed) {
      return this.add(to, instance);
    }
    return null;
  }
  
  get(pos: Vector2, config: { type?: { new (...args: any[]): Collider }, ignore?: Collider[] } = {}) {
    config = Object.assign({ ignore: [] }, config);
    const item = this.getData(pos.hash()).find(item => {
      if (config.ignore!.includes(item.instance)) return false;
      if (config.type && !(item.instance instanceof config.type)) return false;
      return true;
    });
    return item ? item.instance : null;
  }
  
  count() {
    return Object.values(this.collisions).filter(data => data.length).length;
  }
}
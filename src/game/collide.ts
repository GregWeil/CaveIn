/// collide.ts
//General grid-based collision checking

import Vector2 from '../engine/vector2';
import * as Render from '../engine/render';
import BaseObject from '../engine/object';

import Game from './game';

interface Collider extends BaseObject<Game> {
  hurt(data: { pos: Vector2, cause: string, delay?: number, hit?: boolean }): void;
}

interface Collision {
  instance: Collider;
  priority: number;
}

export default class Collide extends BaseObject<Game> {
  private collisions: Map<number, Map<number, Collision[]>>;
   
  constructor(game: Game) {
    super(game);
    
    this.collisions = new Map();
    
    //this.listen(this.game.onRender, evt => this.render(evt.context), Infinity);
  }
  
  render(context: CanvasRenderingContext2D) {
    context.fillStyle = 'red';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    for (let i = 0; i < this.game.grid.gridSize.x; ++i) {
      for (let j = 0; j < this.game.grid.gridSize.y; ++j) {
        const data = this.getData(new Vector2(i, j));
        if (data.length) {
          Render.text(context, data[0].priority.toString(), this.game.grid.getPos(i, j));
        }
      }
    }
  }
  
  private getData(pos: Vector2) {
    const axis = this.collisions.get(pos.x);
    if (!axis) return [];
    return axis.get(pos.y) || [];
  }
  
  private setData(pos: Vector2, data: Collision[]) {
    const axis = this.collisions.get(pos.x) || new Map();
    this.collisions.set(pos.x, axis);
    axis.set(pos.y, data);
  }
  
  add(pos: Vector2, instance: Collider, priority: number = 0) {
    const data = this.getData(pos);
    
    let index: number;
    for (index = 0; index < data.length; ++index) {
      if (data[index].priority > priority) break;
    }
    
    data.splice(index, 0, {
      instance: instance,
      priority: priority
    });
    
    this.setData(pos, data);
    return data[index];
  }
  
  remove(pos: Vector2, instance: Collider) {
    const data = this.getData(pos);
    const index = data.findIndex(item => item.instance === instance);
    if (index < 0) return null;
    const removed = data[index];
    data.splice(index, 1);
    this.setData(pos, data);
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
    const item = this.getData(pos).find(item => {
      if (config.ignore!.includes(item.instance)) return false;
      if (config.type && !(item.instance instanceof config.type)) return false;
      return true;
    });
    return item ? item.instance : null;
  }
  
  count() {
    const axes = Array.from(this.collisions.values());
    const flat = axes.reduce<Collision[][]>((all, axis) => [...all, ...axis.values()], []);
    return flat.filter(data => data.length).length;
  }
}
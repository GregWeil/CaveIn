/// render.ts
//A bunch of utility functions for drawing things

import Vector2 from './vector2';

type Context = CanvasRenderingContext2D;

interface Sprite {
  image: HTMLImageElement;
  size: Vector2;
  offset: Vector2;
  center: Vector2;
}

const sprites: { [key: string]: Sprite } = {};

export function addSprite(name: string, img: HTMLImageElement, size: Vector2, offset: Vector2, center: Vector2) {
  sprites[name] = {
    image: img,
    size: size.copy(),
    offset: size.multiply(offset || new Vector2()),
    center: center ? center.copy() : size.multiply(0.5)
  };
  return name;
}

export function sprite(ctx: Context, name: string, pos: Vector2, angle: number) {
  ctx.translate(pos.x, pos.y);
  ctx.rotate(angle || 0);
  
  const spr = sprites[name];
  ctx.drawImage(spr.image,
                spr.offset.x, spr.offset.y, spr.size.x, spr.size.y,
                -spr.center.x, -spr.center.y, spr.size.x, spr.size.y);
  
  ctx.rotate(-angle || 0);
  ctx.translate(-pos.x, -pos.y);
}

export function line(ctx: Context, from: Vector2, to: Vector2) {
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x, to.y);
}

export function rect(ctx: Context, pos: Vector2, size: Vector2) {
  ctx.fillRect(pos.x, pos.y, size.x, size.y);
}

export function text(ctx: Context, text: string, pos: Vector2) {
  ctx.fillText(text, pos.x, pos.y);
}
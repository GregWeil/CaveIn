/// render.js
//A bunch of utility functions for drawing things

var Vector2 = require('./vector2.js');

var ctx = null;

var sprites = {};

function line(from, to) {
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x, to.y);
}

function rect(pos, size) {
  ctx.fillRect(pos.x, pos.y, size.x, size.y);
}

function addSprite(name, img, offset, size, center) {
  sprites[name] = {
    image: img,
    offset: offset.copy(),
    size: size.copy(),
    center: center.copy()
  };
}

function drawSprite(name, pos, angle) {
  ctx.translate(pos.x, pos.y);
  ctx.rotate(angle || 0);
  
  var spr = sprites[name];
  ctx.drawImage(spr.image, spr.offset.x, spr.offset.y, spr.size.x, spr.size.y,
    -spr.center.x, -spr.center.y, spr.size.x, spr.size.y);
  
  ctx.rotate(-angle || 0);
  ctx.translate(-pos.x, -pos.y);
}

module.exports = {
  set context(val) { ctx = val; },
  get context() { return ctx; },
  line: line,
  rect: rect,
  addSprite: addSprite,
  sprite: drawSprite
};
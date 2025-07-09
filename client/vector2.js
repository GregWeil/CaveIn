/// vector2.js
//A point class

module.exports = class Vector2 {
  constructor(x, y) {
    this.x = x || 0;
    this.y = y !== undefined ? y : this.x;
  }
  
  static new(x, y) {
    return new Vector2(x, y);
  }
  
  copy() {
    return new Vector2(this.x, this.y);
  }
  
  plus(a, b) {
    if (a instanceof Vector2) {
      return new Vector2((this.x + a.x), (this.y + a.y));
    } else {
      return this.plus(new Vector2(a, b));
    }
  }
  minus(a, b) {
    if (a instanceof Vector2) {
      return this.plus(a.multiply(-1));
    } else {
      return this.minus(new Vector2(a, b));
    }
  }
  multiply(a, b) {
    if (a instanceof Vector2) {
      return new Vector2(this.x * a.x, this.y * a.y);
    } else {
      return this.multiply(new Vector2(a, b));
    }
  }
  divide(a, b) {
    if (a instanceof Vector2) {
      return new Vector2(this.x / a.x, this.y / a.y);
    } else {
      return this.divide(new Vector2(a, b));
    }
  }
  
  equals(a, b) {
    if (a instanceof Vector2) {
      return (this.x == a.x && this.y == a.y);
    } else {
      return this.equals(new Vector2(a, b));
    }
  }
  
  round() {
    return new Vector2(Math.round(this.x), Math.round(this.y));
  }
  
  manhattan() {
    return (Math.abs(this.x) + Math.abs(this.y));
  }
  
  angle() {
    return Math.atan2(this.y, this.x);
  }
  
  hash() {
    return (this.x + ',' + this.y);
  }
};

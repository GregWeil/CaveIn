/// vector2.js
//A point class

export default class Vector2 {
  x: number;
  y: number
  
  constructor(x?: number, y?: number) {
    this.x = x || 0;
    this.y = y !== undefined ? y : this.x;
  }
  
  static new(): Vector2;
  static new(x: number): Vector2;
  static new(x: number, y: number): Vector2;
  static new(x?: number, y?: number): Vector2 {
    return new Vector2(x, y);
  }
  
  copy(): Vector2 {
    return new Vector2(this.x, this.y);
  }
  
  plus(a: Vector2): Vector2;
  plus(a: number, b?: number): Vector2;
  plus(a: Vector2|number, b?: number): Vector2 {
    if (a instanceof Vector2) {
      return new Vector2(this.x + a.x, this.y + a.y);
    } else {
      return this.plus(new Vector2(a, b));
    }
  }
  minus(a: Vector2): Vector2;
  minus(a: number, b?: number): Vector2;
  minus(a: Vector2|number, b?: number): Vector2 {
    if (a instanceof Vector2) {
      return new Vector2(this.x - a.x, this.y - a.y);
    } else {
      return this.minus(new Vector2(a, b));
    }
  }
  multiply(a: Vector2): Vector2;
  multiply(a: number, b?: number): Vector2;
  multiply(a: Vector2|number, b?: number): Vector2 {
    if (a instanceof Vector2) {
      return new Vector2(this.x * a.x, this.y * a.y);
    } else {
      return this.multiply(new Vector2(a, b));
    }
  }
  divide(a: Vector2): Vector2;
  divide(a: number, b?: number): Vector2;
  divide(a: Vector2|number, b?: number): Vector2 {
    if (a instanceof Vector2) {
      return new Vector2(this.x / a.x, this.y / a.y);
    } else {
      return this.divide(new Vector2(a, b));
    }
  }
  
  equals(a: Vector2): boolean;
  equals(a: number, b?: number): boolean;
  equals(a: Vector2|number, b?: number): boolean {
    if (a instanceof Vector2) {
      return (this.x == a.x && this.y == a.y);
    } else {
      return this.equals(new Vector2(a, b));
    }
  }
  
  round(): Vector2 {
    return new Vector2(Math.round(this.x), Math.round(this.y));
  }
  
  manhattan(): number {
    return (Math.abs(this.x) + Math.abs(this.y));
  }
  
  length(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }
  
  angle(): number {
    return Math.atan2(this.y, this.x);
  }
  
  hash(): string {
    return (this.x + ',' + this.y)
  }
};
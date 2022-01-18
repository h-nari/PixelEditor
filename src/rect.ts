import { CoordinateTransformation } from "./ct";
import { Point } from "./point";

export class Rect {
  public x: number;
  public y: number;
  public w: number;
  public h: number;

  constructor(x: number, y: number, w: number = 0, h: number = 0) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
  }

  x1() { return this.x + this.w; }
  y1() { return this.y + this.h; }
  center() { return { x: this.x + this.w / 2, y: this.y + this.h / 2 }; }

  or(b: Rect | Point | undefined) {
    if (!b) return this;

    if (b instanceof Point) {
      let x0 = Math.min(this.x, b.x);
      let x1 = Math.max(this.x1(), b.x);
      let y0 = Math.min(this.y, b.y);
      let y1 = Math.max(this.y1(), b.y);
      return new Rect(x0, y0, x1 - x0, y1 - y0);
    }
    else if (b) {
      let x0 = Math.min(this.x, b.x);
      let x1 = Math.max(this.x1(), b.x1());
      let y0 = Math.min(this.y, b.y);
      let y1 = Math.max(this.y1(), b.y1());
      return new Rect(x0, y0, x1 - x0, y1 - y0);
    }
  }

  transform(ct: CoordinateTransformation) {
    return new Rect(ct.toX(this.x), ct.toY(this.y), this.w * ct.ax, this.h * ct.ay);
  }

  static from2Point(x0: number, y0: number, x1: number, y1: number) {
    let x = Math.min(x0, x1);
    let w = Math.abs(x0 - x1) + 1;
    let y = Math.min(y0, y1);
    let h = Math.abs(y0 - y1) + 1;
    return new Rect(x, y, w, h);
  }

  path(ctx: CanvasRenderingContext2D) {
    ctx.rect(this.x, this.y, this.w, this.h);
  }
};
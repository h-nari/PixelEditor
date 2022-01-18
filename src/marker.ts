import { CoordinateTransformation } from "./ct";
import { Point } from "./point";

export class Marker extends Point {
  public r: number;

  constructor(x: number, y: number, r: number = 8) {
    super(x, y);
    this.r = r;
  }

  draw(ctx: CanvasRenderingContext2D, ct: CoordinateTransformation) {
    let p = this.transform(ct);
    ctx.strokeRect(p.x - p.r / 2, p.y - p.r / 2, p.r, p.r);
  }

  override transform(ct: CoordinateTransformation) {
    return new Marker(ct.toX(this.x), ct.toY(this.y), this.r);
  }

  isHit(ct: CoordinateTransformation, x: number, y: number): boolean {
    let p = this.transform(ct);
    return p.chebyshev(x, y) <= this.r;
  }
}

export function marker(x: number, y: number) {
  return new Marker(x, y);
}
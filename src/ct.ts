import { Rect } from "./rect";

/**
 * 座標変換クラス
 */
export interface ICoordinateTransformationState {
  ax: number, bx: number, ay: number, by: number
};

export class CoordinateTransformation {
  public ax: number;
  public bx: number;
  public ay: number;
  public by: number;

  constructor(ax: number = 16.0, bx: number = 0.0, ay: number = 16.0, by: number = 0.0) {
    this.ax = ax;
    this.bx = bx;
    this.ay = ay;
    this.by = by;
  }

  toX(x: number) { return this.ax * x + this.bx; }
  toY(y: number) { return this.ay * y + this.by; }
  fromX(sx: number) { return Math.floor((sx - this.bx) / this.ax); }
  fromY(sy: number) { return Math.floor((sy - this.by) / this.ay); }

  join(ct: CoordinateTransformation) {
    return new CoordinateTransformation(
      this.ax * ct.ax,
      this.ax * ct.bx + this.bx,
      this.ay * ct.ay,
      this.ay * ct.by + this.by
    );
  }

  zoom(factor: number, cx: number, cy: number) {
    this.bx = (1 - factor) * cx + factor * this.bx;
    this.by = (1 - factor) * cy + factor * this.by;
    this.ax *= factor;
    this.ay *= factor;
  }
  pan(dx: number, dy: number) {
    this.bx += dx;
    this.by += dy;
    return dx != 0 || dy != 0;
  }

  save(): ICoordinateTransformationState {
    return { ax: this.ax, bx: this.bx, ay: this.ay, by: this.by };
  }

  load(v: ICoordinateTransformationState) {
    this.ax = v.ax;
    this.bx = v.bx;
    this.ay = v.ay;
    this.by = v.by;
  }

  /**
   * area1に表示されている領域がarea2に表示されるよう設定する
   * 
   * @param area1   ターゲット領域
   * @param aria2   目標領域
   * @param  r      補正係数
   */
  viewArea(area1: Rect | undefined, area2: Rect, a: number = 0.96) {
    if (area1 && area1.w > 0 && area2.w > 0) {
      let r = Math.min(area2.w / area1.w, area2.h / area1.h) * a;
      this.ax = r * this.ax;
      this.ay = r * this.ay;
      let c1 = area1.center();
      let c2 = area2.center();
      this.bx = c2.x - r * (c1.x - this.bx);
      this.by = c2.y - r * (c1.y - this.by);
    }
  }

}
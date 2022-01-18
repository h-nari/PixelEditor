import { CoordinateTransformation } from "./ct";
import { ModeHander } from "./modeHandler";
import { PixelEditor } from "./pixelEditor";
import { Rect } from "./rect";
import { Marker } from "./marker";

export class ArtiboardModeHandler extends ModeHander {

  public rect: ResizableRect | undefined;

  constructor(parent: PixelEditor) {
    super(parent, 'artboard');
  }

  override onSelect(): void {
    let bb = this.parent.bb;
    this.rect = new ResizableRect(this.parent, 0, 0, bb.col, bb.row);
    this.parent.status(`${bb.col} x ${bb.row}`);
    setTimeout(() => { this.parent.draw(); }, 0);
  }

  override onUnselect(): void {
    this.rect = undefined;
    setTimeout(() => { this.parent.draw(); }, 0);
  }

  draw(ctx: CanvasRenderingContext2D, ct: CoordinateTransformation) {
    if (this.rect) {
      this.rect.draw(ctx, ct);
    }
  }

  override onMouseDown(e: JQuery.MouseDownEvent<any, any, any, any>): void {
    if (this.rect)
      this.rect.onMouseDown(e);
  }

  override onMouseMove(e: JQuery.MouseMoveEvent<any, any, any, any>): void {
    if (this.rect)
      this.rect.onMouseMove(e);
  }

  override onMouseUp(e: JQuery.MouseUpEvent<any, any, any, any>): void {
    console.log('mouse up');
    if (this.rect)
      this.rect.onMouseUp(e);
  }
}

/**
 * ResizeRect
 */

class ResizableRect extends Rect {
  public pe: PixelEditor;
  public baseRect: Rect;
  public markers: ResizeMarker[] = [];
  public draggingMarker: ResizeMarker | undefined;
  public ct: CoordinateTransformation | undefined;
  public x0 = 0;
  public y0 = 0;

  constructor(pe: PixelEditor, x: number, y: number, w: number, h: number) {
    super(x, y, w, h);
    this.baseRect = new Rect(x, y, w, h);
    this.pe = pe;
    this.setMarkers();
  }

  private setMarkers() {
    let x0 = this.x;
    let y0 = this.y;
    let x1 = this.x1();
    let xm = (x0 + x1) / 2;
    let y1 = this.y1();
    let ym = (y0 + y1) / 2;
    this.markers = [
      new ResizeMarker(x0, y0, 'x0', 'y0'),
      new ResizeMarker(xm, y0, 'none', 'y0'),
      new ResizeMarker(x1, y0, 'x1', 'y0'),
      new ResizeMarker(x1, ym, 'x1', 'none'),
      new ResizeMarker(x1, y1, 'x1', 'y1'),
      new ResizeMarker(xm, y1, 'none', 'y1'),
      new ResizeMarker(x0, y1, 'x0', 'y1'),
      new ResizeMarker(x0, ym, 'x0', 'none'),
    ];
  }

  draw(ctx: CanvasRenderingContext2D, ct: CoordinateTransformation) {
    this.ct = ct;
    ctx.save();
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'red';
    ctx.fillStyle = 'white';
    ctx.beginPath();
    this.transform(ct).path(ctx);
    ctx.stroke();
    this.markers.forEach(m => m.draw(ctx, ct));
    ctx.restore();
  }

  onMouseDown(e: JQuery.MouseDownEvent<any, any, any, any>) {
    if (this.ct) {
      let x = e.clientX - e.currentTarget.offsetLeft;
      let y = e.clientY - e.currentTarget.offsetTop;
      for (let m of this.markers)
        if (m.isHit(this.ct, x, y)) {
          this.draggingMarker = m;
          this.x0 = e.clientX;
          this.y0 = e.clientY;
          return;
        }
    }
    this.draggingMarker = undefined;
  }

  onMouseMove(e: JQuery.MouseMoveEvent<any, any, any, any>) {
    let m = this.draggingMarker;
    if (m && this.ct) {
      let dx = Math.round((e.clientX - this.x0) / this.ct.ax);
      let dy = Math.round((e.clientY - this.y0) / this.ct.ay);
      let b = this.baseRect;
      if (m.xmove == 'x0') {
        this.x = b.x + dx;
        this.w = b.w - dx;
      } else if (m.xmove == 'x1') {
        this.w = b.w + dx;
      }
      if (m.ymove == 'y0') {
        this.y = b.y + dy;
        this.h = b.h - dy;
      } else if (m.ymove == 'y1') {
        this.h = b.h + dy;
      }
      this.setMarkers();
      this.pe.status(`${this.w} x ${this.h}`);
      this.pe.draw();
    }
  }

  onMouseUp(e: JQuery.MouseUpEvent<any, any, any, any>) {
    if (this.draggingMarker && this.ct) {
      this.pe.bb.resize(this);
      this.pe.ct.bx += this.pe.ct.ax * this.x;
      this.pe.ct.by += this.pe.ct.ay * this.y;
      this.pe.tp.ct.bx -= this.x;
      this.pe.tp.ct.by -= this.y;
      let m = this.pe.bb.minecraft;
      if (m) {
        console.log('offset:', this.x, this.y);
        switch (m.x_direction) {
          case 'x+': m.offset.x += this.x; break;
          case 'x-': m.offset.x -= this.x; break;
          case 'z+': m.offset.z += this.x; break;
          case 'z-': m.offset.z -= this.x; break;
        }
        m.offset.y -= this.y;
      }
      this.draggingMarker = undefined;
      this.x = this.y = 0;
      this.baseRect = new Rect(this.x, this.y, this.w, this.h);
      this.setMarkers();
      this.pe.save();
      this.pe.draw();
    }
  }
}

/**
 * マーカー
 */

type XMoveType = 'none' | 'x0' | 'x1';
type YMoveType = 'none' | 'y0' | 'y1';

class ResizeMarker extends Marker {
  public xmove: XMoveType;
  public ymove: YMoveType;

  constructor(x: number, y: number, xmove: XMoveType, ymove: YMoveType) {
    super(x, y);
    this.xmove = xmove;
    this.ymove = ymove;
  }
}
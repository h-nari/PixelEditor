import { ModeHander } from "./modeHandler";
import { PixelEditor } from "./pixelEditor";
import { Rect } from "./rect";

export class SelectModeHandler extends ModeHander {
  public bp0: { bx: number, by: number } | undefined;

  constructor(parent: PixelEditor) {
    super(parent, 'select');
  }

  override onMouseDown(e: JQuery.MouseDownEvent<any, any, any, any>): void {
    super.onMouseDown(e);
    if (e.button == 0) {
      if (this.parent.bb.bDisp)
        this.bp0 = this.parent.blockPos(e);
      if (this.parent.tp.bDisp)
        this.parent.tp.onMouseDown(e);
    }
  }

  override onMouseMove(e: JQuery.MouseMoveEvent<any, any, any, any>): void {
    if (this.pressed) {
      if (this.bp0) {
        let bp = this.parent.blockPos(e);
        let r = this.parent.bb.selectedRect = Rect.from2Point(this.bp0.bx, this.bp0.by, bp.bx, bp.by);
        this.parent.status(`${r.w} x ${r.h}`);
        this.parent.draw();
      }
      if (this.parent.tp.bDisp) {
        let dx0 = e.clientX - this.x0;
        let dy0 = e.clientY - this.y0;
        this.parent.tp.onMouseMove(e, dx0, dy0);
        this.x0  = e.clientX;
        this.y0 = e.clientY;
      }
    }
  }

  override onMouseUp(e: JQuery.MouseUpEvent) {
    if (this.pressed) {
      if (this.bp0) {
        let bp = this.parent.blockPos(e);
        this.parent.bb.selectedRect = Rect.from2Point(this.bp0.bx, this.bp0.by, bp.bx, bp.by);
      }
      if (this.parent.tp.bDisp)
        this.parent.tp.onMouseUp(e);
      this.parent.draw();
      this.pressed = false;
    }
  }

  override onClick(e: JQuery.ClickEvent<any, any, any, any>): void {
    let r = this.parent.bb.selectedRect;
    if (r && r.w == 1 && r.h == 1)
      this.parent.bb.select(r.x, r.y);
  }
};
import { ModeHander } from "./modeHandler";
import { PixelEditor } from "./pixelEditor";

export class EraseModeHandler extends ModeHander {
  constructor(parent: PixelEditor) {
    super(parent, 'erase');
  }

  override onMouseDown(e: JQuery.MouseDownEvent<any, any, any, any>): void {
    super.onMouseDown(e);
  }

  override onMouseMove(e: JQuery.MouseMoveEvent<any, any, any, any>): void {
    if (this.pressed) {
      this.paint(e);
    }
  }

  override onMouseUp(e: JQuery.MouseUpEvent<any, any, any, any>): void {
    if (this.pressed) {
      this.parent.save();
      this.pressed = false;
    }
  }

  override onClick(e: JQuery.ClickEvent<any, any, any, any>): void {
    this.paint(e);
  }

  paint(e: JQuery.ClickEvent | JQuery.MouseMoveEvent) {
    let parent = this.parent;
    let p = parent.blockPos(e);
    parent.bb.setPixcel(p.bx, p.by, undefined);
    parent.save();
    parent.draw();
  }
}
import { ModeHander } from "./modeHandler";
import { PixelEditor } from "./pixelEditor";

export class SpoidModeHandler extends ModeHander {

  constructor(parent: PixelEditor) {
    super(parent, 'spoid');
  }

  override onClick(e: JQuery.ClickEvent<any, any, any, any>): void {
    this.parent.spoid(e);
  }
}
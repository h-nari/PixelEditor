import { blockGroups, IBlockType } from "./blockTypes";
import { Color } from "./color";
import { PixelEditor } from "./pixelEditor";
import { div, img } from "./tag";

export class BlockTypeWindow {
  public parent: PixelEditor;
  public selected_bid: string | undefined;
  public bid2bt: { [bid: string]: IBlockType };

  constructor(parent: PixelEditor) {
    this.parent = parent;

    this.bid2bt = {};
    for (let g of blockGroups) {
      for (let t of g.types)
        this.bid2bt[t.id] = t;
    }
  }

  html() {
    let s = '';
    for (let g of blockGroups) {
      s += div({ class: 'block-group' },
        div({ class: 'name' }, g.name),
        div({ class: 'block' }, ...g.types.map(t => img({ src: `public/block/${t.id}.png`, title: t.name, bid: t.id }))))
    }
    return div({ class: 'block-group-win' }, s);
  }

  selecteBlock(bid: string | undefined) {
    this.selected_bid = bid;
    console.log('select:', bid);
    $('.block-group-win .block-group .block img').removeClass('selected');
    if (bid) {
      $(`.block-group-win .block-group .block img[bid=${bid}]`).addClass('selected');
      let bt = this.bid2bt[bid];
      this.parent.status(`${bt.name} ブロック`);
    } else {
      this.parent.status('ブロック無し');
    }
  }

  bind() {
    $('.block-group-win .block-group .block img').on('click', e => {
      let bid = $(e.currentTarget).attr('bid');
      this.selecteBlock(bid);
      if (this.parent.currentMode?.name != 'rect-fill')
        this.parent.modeSet('paint');
    })
  }

  /**
   * 最も近い色のブロックのbidを返す
   * 
   * @param color 
   * @returns 
   */
  selectBlockWithClosestColor(color: Color): string | undefined {
    return undefined;
  }
}

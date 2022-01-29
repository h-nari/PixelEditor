import { assert_not_null } from "./asserts";
import { blockCanUse } from "./blockSelectDialog";
import { blockGroups, IBlockType } from "./blockTypes";
import { Color, ColorRGB } from "./color";
import { PixelEditor } from "./pixelEditor";
import { div, img } from "./tag";


/**
 * Block の use状態を保存するインターっフェース
 */
export interface IBlockTypeSave {
  [id: string]: boolean;
};

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
   * ブロックのuseの状態を返す
   */
  save(): IBlockTypeSave {
    let s: IBlockTypeSave = {};
    for (let g of blockGroups)
      for (let t of g.types)
        s[t.id] = blockCanUse(t);
    return s;
  }

  /**
   * 
   * 保存されたブロックのuse情報をloadする
   */
  load(s: IBlockTypeSave) {
    for (let g of blockGroups)
      for (let t of g.types)
        t.use = s[t.id];
  }


  /**
   * 最も近い色のブロックのbidを返す
   * 
   * @param color 
   * @returns 
   */
  selectBlockWithClosestColor(color: Color): string | undefined {
    let min_dist = 0;
    let block: IBlockType | undefined;

    for (let g of blockGroups) {
      for (let t of g.types) {
        if (!blockCanUse(t)) continue;
        if (!t.color && t.imageBitmap)
          t.color = this.getAverageColor(color.value.type, t.imageBitmap).to('LAB');
        assert_not_null(t.color);
        let dist = color.distance(t.color);
        if (!block || dist < min_dist) {
          block = t;
          min_dist = dist;
        }
      }
    }
    return block?.id;
  }


  getAverageColor(type: string, im: ImageBitmap): Color {
    let ctx = this.parent.canvas.getContext('2d');
    assert_not_null(ctx);
    ctx.drawImage(im, 0, 0);
    let w = im.width;
    let h = im.height;
    let d = ctx.getImageData(0, 0, w, h);
    let r = 0;
    let g = 0;
    let b = 0;
    for (let i = 0; i < w * h; i++) {
      r += d.data[i * 4];
      g += d.data[i * 4 + 1];
      b += d.data[i * 4 + 2];
    }
    r /= w * h;
    g /= w * h;
    b /= w * h;
    return new Color({ type: 'RGB', r, g, b });
  }
}


import { ArtiboardModeHandler } from "./artboardMode";
import { assert_minecraft_xdir, assert_not_null } from "./asserts";
import { blockGroups, IBlockType } from "./blockTypes";
import { CoordinateTransformation } from "./ct";
import { Menu } from "./menu";
import { PixelEditor } from "./pixelEditor";
import { IPrimitiveBlockBufferState, PrimitiveBlockBuffer } from "./primitiveBlockBuffer";
import { Rect } from "./rect";
import { div, img, input, label, option, select } from "./tag";

export type MinecraftXDir = 'x+' | 'x-' | 'z+' | 'z-';
type TGrid = { pitch: number, color: string };

export interface IBlockBufferState {
  row: number;
  col: number;
  pbb: IPrimitiveBlockBufferState;
  idx2id: [number, string][];
  bDisp?: boolean;
  bDispFrame?: boolean;
  block_idx: number;
  minecraft?: {
    offset: { x: number, y: number, z: number };
    x_direction: MinecraftXDir;
  }
};

/**
 * Frameのサイズと位置
 */

const mh = 3;      // Frameと上辺の距離
const mw = 3;      // Frameと左辺の距離
const fh = 20;     // 上辺Frameの高さ
const fw = 60;     // 左辺Frame の幅

/**
 * ブロックの2次元配列を保持するオブジェクト
 */
export class BlockBuffer {
  public parent: PixelEditor;
  public row = 64;
  public col = 64;
  public pbb: PrimitiveBlockBuffer;
  public bid2bt: { [bid: string]: IBlockType | undefined } = {};
  public idx2bt: { [idx: number]: IBlockType | undefined } = {};
  public bDisp = true;
  private block_idx = 1;
  private rect: { x0: number, y0: number, x1: number, y1: number } | undefined;
  public transparacy = 0.6;
  public bTransparent = false;
  public selectedRect: Rect | undefined;
  public minecraft: {
    offset: { x: number, y: number, z: number },
    x_direction: MinecraftXDir,
    mat?: number[]
  } | undefined;
  public bDispFrame = true;

  constructor(parent: PixelEditor) {
    this.parent = parent;
    this.pbb = new PrimitiveBlockBuffer(this.col, this.row);
  }

  async init() {
    let loadImage = function (path: string): Promise<HTMLImageElement> {
      return new Promise((resolve, reject) => {
        let img = new Image();
        img.onload = function () { resolve(img); };
        img.onerror = function () { reject(); };
        img.src = path;
      });
    }
    this.bid2bt = {};
    for (let g of blockGroups) {
      for (let t of g.types) {
        this.bid2bt[t.id] = t;
        try {
          let img = await loadImage(`block/${t.id}.png`);
          t.imageBitmap = await createImageBitmap(img);
        } catch (e) {
          console.log(`error on ${t.id} image load`);
          console.log('error:', e);
        }
      }
    }
  }

  clear() {
    this.pbb.clear();
    this.block_idx = 1;
    this.idx2bt = {};
    for (let bt of Object.values(this.bid2bt))
      if (bt)
        bt.idx = undefined;
  }

  resize(rect: Rect) {
    let pbb = this.pbb;
    let idx2bt = this.idx2bt;
    this.pbb = new PrimitiveBlockBuffer(rect.w, rect.h);
    this.clear();
    this.row = rect.h;
    this.col = rect.w;
    for (let y = Math.max(0, rect.y); y < Math.min(pbb.height, rect.y1()); y++) {
      for (let x = Math.max(0, rect.x); x < Math.min(pbb.width, rect.x1()); x++) {
        let i = pbb.get(x, y);
        if (i > 0) {
          let b = idx2bt[i];
          assert_not_null(b);
          this.setPixcel(x - rect.x, y - rect.y, b.id);
        }
      }
    }
  }

  drawGrid(ctx: CanvasRenderingContext2D, ct: CoordinateTransformation) {
    ctx.strokeStyle = 'gray';
    ctx.lineWidth = 1;
    let sx0 = ct.toX(0);
    let sx1 = ct.toX(this.col);
    let sy0 = ct.toY(0);
    let sy1 = ct.toY(this.row);
    for (let y = 0; y <= this.row; y++) {
      ctx.beginPath();
      let sy = ct.toY(y);
      ctx.moveTo(sx0, sy);
      ctx.lineTo(sx1, sy);
      ctx.stroke();
    }
    for (let x = 0; x <= this.col; x++) {
      let sx = ct.toX(x);
      ctx.beginPath();
      ctx.moveTo(sx, sy0);
      ctx.lineTo(sx, sy1);
      ctx.stroke();
    }
  }

  draw(ctx: CanvasRenderingContext2D, ct: CoordinateTransformation) {
    if (this.bDisp) {
      ctx.save();
      if (this.bTransparent)
        ctx.globalAlpha = 1.0 - this.transparacy;
      for (let by = 0; by < this.row; by++) {
        let y = ct.toY(by);
        for (let bx = 0; bx < this.col; bx++) {
          let x = ct.toX(bx);
          let idx = this.pbb.get(bx, by);
          let bt = this.idx2bt[idx];
          if (bt) {
            if (bt.imageBitmap) {
              ctx.imageSmoothingEnabled = false;
              ctx.drawImage(bt.imageBitmap, x, y, ct.ax, ct.ay);
            }
          }
        }
      }
      ctx.restore();
      this.drawRect(ctx, ct);
      this.drawGrid(ctx, ct);
      if (this.bDispFrame) this.drawFrame(ctx, ct);
      if (this.parent.currentMode instanceof ArtiboardModeHandler)
        this.parent.currentMode.draw(ctx, ct);
      this.drawSelectedRect(ctx, ct);
    }
  }

  /**
   * Frame表示時はフレームを除いた長方形の領域、非表示時はcanvas全体の領域を返す
   */
  canvasRect(): Rect {
    let c = this.parent.canvas;
    let x = 0;
    let y = 0;
    if (this.bDisp && this.bDispFrame) {
      x = mw + fw;
      y = mh + fh;
    }
    return new Rect(x, y, c.width - x, c.height - y);
  }

  drawFrame(ctx: CanvasRenderingContext2D, ct: CoordinateTransformation) {
    const bg_color = 'lightgray';
    const text_color = 'black';
    const xgrids: TGrid[] = [
      { pitch: 1, color: 'white' }, { pitch: 2, color: 'gray' },
      { pitch: 4, color: 'red' }, { pitch: 16, color: 'blue' }];
    const ygrids: TGrid[] = [
      { pitch: 1, color: 'white' }, { pitch: 2, color: 'gray' }, { pitch: 4, color: 'red' }];

    let c = this.parent.canvas;
    let m = this.minecraft;
    let axis = 'x';
    let sign = 1;
    let off = 0;
    if (m) {
      if (m.x_direction[0] == 'x') {
        axis = 'x';
        off = m.offset.x;
      } else {
        axis = 'z';
        off = m.offset.z;
      }
      if (m.x_direction[1] == '-') sign = -1;
    }
    ctx.save();
    ctx.beginPath();
    ctx.rect(fw + mw, mh, c.width - fw - 2 * mw, fh);
    ctx.fillStyle = bg_color;
    ctx.fill();
    ctx.clip();
    ctx.fillStyle = text_color;

    for (let g of xgrids) {
      if (g.pitch * ct.ax < 10) continue;

      let bx0 = ct.fromX(fw + mw);
      let v0 = Math.floor((sign * bx0 + off) / g.pitch) * g.pitch;
      ctx.strokeStyle = g.color;
      ctx.font = 'bold 12px sans-serif';
      for (let v = v0; ct.toX(sign * (v - off)) < c.width; v += sign * g.pitch) {
        let x = ct.toX(sign * (v - off));
        ctx.beginPath();
        ctx.moveTo(x, mh + fh);
        let s = `${axis}:${v}`;
        let mt = ctx.measureText(s);
        if (g.pitch * ct.ax > mt.width + 5) {
          ctx.lineTo(x, mh);
          ctx.stroke();
          ctx.fillText(s, x + 2, mh + fh - 4);
        } else {
          ctx.lineTo(x, mh + fh - 3);
          ctx.stroke();
        }
      }
    }
    ctx.restore();
    ctx.save();
    ctx.beginPath();
    ctx.rect(mw, fh + mh, fw, c.height - fh - mh * 2);
    ctx.fillStyle = bg_color;
    ctx.fill();
    ctx.clip();
    ctx.fillStyle = text_color;

    ctx.textBaseline = 'top';
    off = m ? m.offset.y : 0;
    for (let g of ygrids) {
      if (g.pitch * ct.ay < 10) continue;
      ctx.strokeStyle = g.color;
      let by0 = Math.floor(ct.fromY(fh + mh) / g.pitch) * g.pitch;
      for (let by = by0; ct.toY(by) < c.height; by += g.pitch) {
        let y = ct.toY(by);
        ctx.beginPath();
        ctx.moveTo(fw + mw, y);
        if (g.pitch * ct.ay > 20) {
          ctx.lineTo(mw, y);
          ctx.stroke();
          ctx.fillText(`y:${off - by}`, mw + 2, y + 2);
        } else {
          ctx.lineTo(fw + mw - 3, y);
          ctx.stroke();
        }
      }
    }
    ctx.restore();
  }


  drawSelectedRect(ctx: CanvasRenderingContext2D, ct: CoordinateTransformation) {
    if (this.selectedRect) {
      let r = this.selectedRect.transform(ct);
      ctx.save();
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'white';
      ctx.globalCompositeOperation = 'difference';
      ctx.strokeRect(r.x, r.y, r.w, r.h);
      ctx.restore();
    }
  }

  drawRect(ctx: CanvasRenderingContext2D, ct: CoordinateTransformation) {
    if (this.rect) {
      let x0 = ct.toX(Math.min(this.rect.x0, this.rect.x1));
      let x1 = ct.toX(Math.max(this.rect.x0, this.rect.x1) + 1) - 1;
      let y0 = ct.toY(Math.min(this.rect.y0, this.rect.y1));
      let y1 = ct.toY(Math.max(this.rect.y0, this.rect.y1) + 1) - 1;

      ctx.save();
      ctx.globalCompositeOperation = 'difference';
      ctx.fillStyle = 'white';
      ctx.beginPath();
      ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
      ctx.restore();
    }
  }

  setPixcel(bx: number, by: number, bid: string | undefined) {
    let idx = 0;
    if (bid) {
      let bt = this.bid2bt[bid];
      assert_not_null(bt);
      if (!bt.idx) {
        bt.idx = this.block_idx++;
        this.idx2bt[bt.idx] = bt;
      }
      idx = bt.idx;
    }
    if (this.pbb.inRange(bx, by))
      this.pbb.set(bx, by, idx);
  }

  getPixel(bx: number, by: number): string | undefined {
    try {
      let idx = this.pbb.get(bx, by);
      return this.idx2bt[idx]?.id;
    } catch (e) {
      return undefined;
    }
  }

  save(): IBlockBufferState {
    let idx2id: [number, string][] = [];
    for (let id_str in this.idx2bt) {
      let id = Number(id_str);
      let bt = this.idx2bt[id_str];
      if (bt)
        idx2id.push([id, bt.id]);
    }
    let s: IBlockBufferState = {
      row: this.row, col: this.col, block_idx: this.block_idx, pbb: this.pbb.save(),
      bDisp: this.bDisp, bDispFrame: this.bDispFrame, idx2id
    };
    if (this.minecraft) {
      s.minecraft = {
        offset: this.minecraft.offset,
        x_direction: this.minecraft.x_direction
      };
    }
    return s;
  }

  load(s: IBlockBufferState) {
    this.pbb.load(s.pbb);
    this.row = s.row;
    this.col = s.col;
    this.block_idx = s.block_idx;
    this.idx2bt = {};
    if (s.bDisp !== undefined) this.bDisp = s.bDisp;
    if (s.bDispFrame != undefined) this.bDispFrame = s.bDispFrame;
    s.idx2id.forEach(([idx, id]) => { this.idx2bt[idx] = this.bid2bt[id]; })
    this.resize(new Rect(0, 0, s.col, s.row));
    if (s.minecraft) {
      this.minecraft = Object.assign({}, s.minecraft);
      this.minecraft.mat = this.calcMinecraftMat(s.minecraft.x_direction);
    }
  }

  calcMinecraftMat(x_dir: MinecraftXDir) {
    let mat: number[];
    switch (x_dir) {
      case 'x+': mat = [1, 0, 0, -1, 0, 0]; break;
      case 'x-': mat = [-1, 0, 0, -1, 0, 0]; break;
      case 'z+': mat = [0, 0, 0, -1, 1, 0]; break;
      case 'z-': mat = [0, 0, 0, -1, -1, 0]; break;
    }
    return mat;
  }

  calcMinecraftCoordinate(x: number, y: number) {
    let m = this.minecraft?.mat;
    let off = this.minecraft?.offset;
    return (m && off) ? {
      x: m[0] * x + m[1] * y + off.x,
      y: m[2] * x + m[3] * y + off.y,
      z: m[4] * x + m[5] * y + off.z
    } : undefined;

  }

  rectStart(e: JQuery.MouseDownEvent) {
    let { bx, by } = this.parent.blockPos(e);
    this.rect = { x0: bx, y0: by, x1: bx, y1: by };
    this.parent.draw();
  }

  rectMove(e: JQuery.MouseMoveEvent) {
    if (this.rect) {
      let { bx, by } = this.parent.blockPos(e);
      this.rect.x1 = bx;
      this.rect.y1 = by;
      this.parent.draw();
    }
  }

  rectFill(e: JQuery.MouseUpEvent<HTMLCanvasElement, undefined, HTMLCanvasElement, HTMLCanvasElement>) {
    if (this.rect) {
      let bid = this.parent.btw.selected_bid;
      let x0 = Math.max(Math.min(this.rect.x0, this.rect.x1), 0);
      let x1 = Math.min(Math.max(this.rect.x0, this.rect.x1), this.pbb.width - 1);
      let y0 = Math.max(Math.min(this.rect.y0, this.rect.y1), 0);
      let y1 = Math.min(Math.max(this.rect.y0, this.rect.y1), this.pbb.height - 1);
      for (let y = y0; y <= y1; y++)
        for (let x = x0; x <= x1; x++)
          this.setPixcel(x, y, bid);
    }
    this.rect = undefined;
    this.parent.save();
    this.parent.draw();
  }

  setTransparacy(v: number) {
    this.transparacy = v;
    this.parent.draw();
  }

  /**
   * 画面上での専有領域を画面座標で返す
   * 
   * @param ct ブロック座標から画面座標への変換オブジェクト
   */
  getArea(ct: CoordinateTransformation): Rect | undefined {
    return this.bDisp ? new Rect(0, 0, this.col, this.row).transform(ct) : undefined;
  }

  select(x: number, y: number) {
    let mes = '';
    if (x >= 0 && x < this.col && y >= 0 && y < this.row) {
      this.selectedRect = new Rect(x, y, 1, 1);

      let idx = this.pbb.get(x, y);
      let bt = this.idx2bt[idx];
      if (bt) mes += bt.name;
      let m = this.calcMinecraftCoordinate(x, y);
      if (m) mes += ` / マイクラ座標 x:${m.x}, y:${m.y}, z:${m.z}`;

    } else {
      this.selectedRect = undefined;
    }
    this.parent.status(mes);
    this.parent.draw();
  }

  minecraft_dlg() {
    $.confirm({
      title: 'マインクラフト座標の設定',
      type: 'green',
      columnClass: 'medium',
      content: div({ class: 'minecraft-dlg' },
        div({ class: 'direction' },
          label('画面 → の方向'),
          select(
            option({ value: 'x+' }, '東 (X+) 方向'),
            option({ value: 'z+' }, '南 (Z+) 方向'),
            option({ value: 'x-' }, '西 (X-) 方向'),
            option({ value: 'z-' }, '北 (Z-) 方向'),
          )),
        div({ class: 'offset' },
          div({ class: 'title' }, '選択されたブロックの座標'),
          div({ class: 'coordinate' },
            div({ class: 'x' }, label('X:'), input({ type: 'number', value: 0 })),
            div({ class: 'y' }, label('Y:'), input({ type: 'number', value: 0 })),
            div({ class: 'z' }, label('Z:'), input({ type: 'number', value: 0 }))
          ))),
      onOpen: () => {
        let xdir = this.minecraft?.x_direction;
        if (xdir) $('.minecraft-dlg .direction select').val(xdir);
        $('.minecraft-dlg .offset').addClass('d-none');
        let s = this.selectedRect;
        if (s && s.w == 1 && s.h == 1) {
          let m = this.calcMinecraftCoordinate(s.x, s.y);
          if (m) {
            $('.minecraft-dlg .offset .coordinate .x input').val(m.x);
            $('.minecraft-dlg .offset .coordinate .y input').val(m.y);
            $('.minecraft-dlg .offset .coordinate .z input').val(m.z);
            $('.minecraft-dlg .offset').removeClass('d-none');
          }
        }
      },
      buttons: {
        '設定': () => {
          let xdir = $('.minecraft-dlg .direction select').val();
          assert_minecraft_xdir(xdir);
          let mx = Number($('.minecraft-dlg .coordinate .x input').val() as string);
          let my = Number($('.minecraft-dlg .coordinate .y input').val() as string);
          let mz = Number($('.minecraft-dlg .coordinate .z input').val() as string);
          if (!this.minecraft)
            this.minecraft = {
              x_direction: xdir,
              offset: { x: 0, y: 0, z: 0 }
            }
          else
            this.minecraft.x_direction = xdir;
          this.minecraft.mat = this.calcMinecraftMat(xdir);

          let s = this.selectedRect;
          if (s && s.w == 1 && s.h == 1) {
            let x = s.x;
            let y = s.y;
            let m = this.calcMinecraftCoordinate(x, y);
            console.log('m:', m);
            assert_not_null(m);
            this.minecraft.offset.x += mx - m.x;
            this.minecraft.offset.y += my - m.y;
            this.minecraft.offset.z += mz - m.z;
            this.parent.save();
            this.parent.draw();
            this.select(s.x, s.y);
          }
        },
        'キャンセル': () => { },
      },
    });
  }

  tallyBlocks() {
    let r = this.pbb.tallyBlocks();
    let list: { bt: IBlockType | undefined, num: number }[] = [];
    let unallocated = 0;
    let sum = 0;
    for (let [idx_str, num] of Object.entries(r)) {
      let idx = parseInt(idx_str);
      sum += num;
      if (idx == 0)
        unallocated = num;
      else
        list.push({ bt: this.idx2bt[idx], num });
    }
    list.sort((a, b) => b.num - a.num);
    return { list, sum, unallocated };
  }

  tallyBlocksHtml() {
    let r = this.tallyBlocks();
    let no = 1;
    const stackCount = function (n: number) {
      let s = '';
      if (n > 64) {
        let c = Math.floor(n / 64);
        s += ` = 64 x ${c} + ${n - c * 64}`;
      }
      return s;
    }
    let html = div({ class: 'tally-blocks-dlg' }, '集計',
      div({ class: 'table' },
        ...r.list.map(e => div({ class: 'data' },
          div({ class: 'no ' }, no++),
          div({ class: 'image ' }, e.bt?.id ? img({ src: `block/${e.bt?.id}.png` }) : ''),
          div({ class: 'name ' }, e.bt ? e.bt.name : '?'),
          div({ class: 'num ' }, e.num, ' ブロック'),
          div({ class: 'num-stack' }, stackCount(e.num)),
        )),
        div({ class: 'trailer sum' }, div({ class: 'title' }, '合計'), div({ class: 'value' }, r.sum, ' ブロック')),
        div({ class: 'trailer unallocated' }, div({ class: 'title' }, '空きスペース'), div({ class: 'value' }, r.unallocated, ' ブロック'))
      ));
    return html;
  }

  tallyBlocksDlg() {
    $.confirm({
      title: '使用ブロック数集計',
      columnClass: 'large',
      content: this.tallyBlocksHtml(),
      buttons: {
        'OK': () => { },
        '印刷用ウィンドウを開く': () => {
          let url = new URL(document.URL);
          url.search = 'print=tally';
          console.log('url:', url.toString());
          window.open(url.toString(), '_blank');
        }
      }
    });
  }

  makeMenu() {
    return new Menu({
      name: 'ブロック',
      children: [
        {
          name: '表示',
          with_check: true,
          onBeforeExpand: m => { m.opt.checked = this.bDisp; },
          action: (e, m) => {
            m.opt.checked = this.bDisp = !this.bDisp;
            this.parent.setDispBlockState();
            this.parent.save();
            this.parent.draw();
          }
        },
        {
          name: '座標表示',
          with_check: true,
          onBeforeExpand: m => {
            m.opt.checked = this.bDispFrame && this.bDisp;
            m.opt.disable = !this.bDisp;
          },
          action: (e, m) => {
            m.opt.checked = this.bDispFrame = !this.bDispFrame;
            this.parent.save();
            this.parent.draw();
          }
        },
        {
          name: 'クリア',
          action: (e, m) => {
            this.clear();
            this.parent.save();
            this.parent.draw();
          }
        }, {
          separator: true
        }, {
          name: '透明表示',
          action: (e, m) => { m.expand(e, true); },
          onBeforeExpand: m => {
            m.clear();
            m.add({
              name: '透明表示',
              with_check: true,
              onBeforeExpand: m => { m.opt.checked = this.bTransparent; },
              action: (e, m) => {
                m.opt.checked = this.bTransparent = !this.bTransparent;
                this.parent.draw();
              }
            });
            m.addSeparator();
            let pct0 = Math.round(this.transparacy * 100);
            [20, 40, 60, 80].forEach(pct => {
              m.add({
                name: `透明度 ${pct}%`,
                with_check: true,
                action: (e, m) => {
                  this.bTransparent = true;
                  this.setTransparacy(pct / 100);
                },
                checked: pct == pct0
              })
            });
          }
        }, {
          separator: true
        }, {
          name: 'マインクラフト座標の設定',
          action: (e, m) => { this.minecraft_dlg(); }
        }, {
          name: '使用ブロック集計',
          action: (e, m) => { this.tallyBlocksDlg(); }
        }
      ]
    });

  }
}


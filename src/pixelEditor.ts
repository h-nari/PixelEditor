import { assert_not_null } from "./asserts";
import { BlockTypeWindow, IBlockTypeSave } from "./blockTypeWin";
import { CoordinateTransformation, ICoordinateTransformationState } from "./ct";
import { a, div, input, span } from "./tag";
import { BlockBuffer, IBlockBufferState } from "./blockBuffer";
import { ToolBar } from "./toolBar";
import { Menu } from "./menu";
import { ITemplatePictureState, TemplatePicture } from "./templatePicture";
import { Rect } from "./rect";
import { ModeHander } from "./modeHandler";
import { SelectModeHandler } from "./selectMode";
import { PanModeHandler } from "./panMode";
import { PaintModeHandler } from "./paintMode";
import { EraseModeHandler } from "./eraseMode";
import { RectFillModeHandler } from "./rectFillMode";
import { SpoidModeHandler } from "./spoidMode";
import { ArtiboardModeHandler } from "./artboardMode";

type BackgroundType = 'check' | 'monochrome';

interface IState {
  backgroundType?: BackgroundType;
  backgroundColor?: string;
  block: IBlockBufferState;
  templatePicture?: ITemplatePictureState;
  ct?: ICoordinateTransformationState;
  blockType?: IBlockTypeSave;
};

interface IStateFile {
  state: IState;
  pictureData?: string;
};

export class PixelEditor {
  public canvas: HTMLCanvasElement;
  public btw: BlockTypeWindow;
  public ct: CoordinateTransformation;
  public bb: BlockBuffer;
  public tp: TemplatePicture;
  public tb: ToolBar;
  private savedJsonStr: string = '';
  public mousePressed = false;
  public x0 = 0;
  public y0 = 0;
  private menus: Menu[] = [];
  public backgroundType: BackgroundType = 'monochrome';
  public backgroundColor: string = '#c0c080';
  public moved = 0;
  public modes: ModeHander[] = [];
  public currentMode: ModeHander | undefined;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.btw = new BlockTypeWindow(this);
    this.ct = new CoordinateTransformation();
    this.bb = new BlockBuffer(this);
    this.modes.push(new SelectModeHandler(this));
    this.modes.push(new PanModeHandler(this));
    this.modes.push(new ArtiboardModeHandler(this));
    this.modes.push(new PaintModeHandler(this));
    this.modes.push(new EraseModeHandler(this));
    this.modes.push(new RectFillModeHandler(this));
    this.modes.push(new SpoidModeHandler(this));
    this.modeSet('select');

    this.tp = new TemplatePicture(this);
    this.tb = new ToolBar();
    this.tb.add({ icon: 'arrow-up-left', title: '選択モード', action: () => { this.modeSet('select'); } });
    this.tb.add({ icon: 'arrows-move', title: 'パン・モード', action: () => { this.modeSet('pan'); } });
    this.tb.add({ icon: 'bounding-box', title: 'アートボード・ツール', action: () => { this.modeSet('artboard'); } });
    this.tb.add({ icon: 'pencil', title: 'ペイントモード', action: () => { this.modeSet('paint') } });
    this.tb.add({ icon: 'pencil-square', title: '長方形塗り潰し', action: () => { this.modeSet('rect-fill') } });
    this.tb.add({ icon: 'eraser', title: '消去', action: () => { this.modeSet('erase'); } });
    this.tb.add({ icon: 'eyedropper', title: 'スポイドツール', action: () => { this.modeSet('spoid'); } });
    this.tb.add({
      icon: 'grid-3x3-gap', title: 'ブロック画像', class: 'btn-disp-block',
      action: () => {
        this.bb.bDisp = !this.bb.bDisp;
        this.setDispBlockState();
        this.save();
        this.draw();
      }
    });
    this.tb.add({
      icon: 'image', title: '背景画像', class: 'btn-disp-image',
      action: () => {
        this.tp.bDisp = !this.tp.bDisp;
        this.setDispImageState();
        this.save();
        this.draw();
      }
    });

    this.makeMenu();
  }

  async init() {
    await this.bb.init();
  }

  initHtml() {
    return div({ class: 'initializing-win' },
      div({ class: 'title' }, 'PixelEditor 初期化中...'),
      div({ class: 'status' }, ' status')
    );
  }


  html() {
    return div({ class: 'whole' },
      div({ class: 'top' },
        div({ class: 'tool-box' },
          div({ class: 'menu-bar' }, ... this.menus.map(m => m.html())),
          this.tb.html(),
          div({ class: 'status' }),
        ),
        this.btw.html(),
      ),
      div({ id: 'canvas-frame' }));
  }

  bind() {
    let p = document.getElementById('canvas-frame');
    assert_not_null(p);
    p.appendChild(this.canvas);

    this.setDispBlockState();
    this.setDispImageState();

    this.btw.bind();
    this.tb.bind();
    this.menus.forEach(m => m.bind());

    $(this.canvas).on('mousedown', e => { this.currentMode?.onMouseDown(e); });
    $(this.canvas).on('mousemove', e => { this.currentMode?.onMouseMove(e); });
    $(this.canvas).on('mouseup', e => {
      if (e.button == 0)
        this.currentMode?.onMouseUp(e);
      else if (e.button == 1) {
        this.spoid(e);
        if (this.currentMode?.name != 'rect-fill') {
          if (this.btw.selected_bid)
            this.modeSet('paint');
          else
            this.modeSet('erase');
        }
        e.stopPropagation();
        e.preventDefault();
      }
    });
    $(this.canvas).on('click', e => { this.currentMode?.onClick(e); });
    $(this.canvas).on('wheel', e => { this.onWheel(e); })
    this.canvas.setAttribute('tabindex', '0');
    var old_mode_name: string | undefined;
    $(this.canvas).on('keydown', e => {
      let cur = this.currentMode?.name;
      if (e.key == 'Escape') {
        this.modeSet('select');
      } else if (e.ctrlKey && cur != 'select') {
        old_mode_name = cur;
        this.modeSet('select');
      } else if (e.key == ' ' && cur != 'pan') {
        old_mode_name = cur;
        this.modeSet('pan');
      }
    }).on('keyup', e => {
      if (old_mode_name) {
        this.modeSet(old_mode_name)
      }
    });
    this.canvas.focus();
    $('button').on('click', e => { this.canvas.focus(); });

    $('#input-load-picture').on('change', e => { this.tp.loadPicture(e.currentTarget as HTMLInputElement) });
    $('#input-load-file').on('change', e => { this.fileLoad(e.currentTarget as HTMLInputElement) });
  }

  onWheel(e: JQuery.TriggeredEvent<HTMLCanvasElement, undefined, HTMLCanvasElement, HTMLCanvasElement>) {
    let oe = e.originalEvent as WheelEvent;
    if (oe.deltaY > 0) this.zoomView(0.5, e);
    else if (oe.deltaY < 0) this.zoomView(2, e);
    e.preventDefault();
    e.stopPropagation();
  }


  spoid(e: JQuery.ClickEvent | JQuery.MouseUpEvent) {
    let { bx, by } = this.blockPos(e);
    let bid = this.bb.getPixel(bx, by);
    this.btw.selecteBlock(bid);
    this.draw();
  }

  drawEventPosition(e: JQuery.ClickEvent) {
    let sx = e.clientX - this.canvas.offsetLeft;
    let sy = e.clientY - this.canvas.offsetTop;
    let ctx = this.canvas.getContext('2d');
    if (!ctx) return;
    ctx.strokeStyle = 'red';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(sx - 3, sy - 3);
    ctx.lineTo(sx + 3, sy + 3);
    ctx.moveTo(sx - 3, sy + 3);
    ctx.lineTo(sx + 3, sy - 3);
    ctx.stroke();
  }


  blockPos(e: JQuery.ClickEvent | JQuery.MouseDownEvent | JQuery.MouseMoveEvent | JQuery.MouseUpEvent): { bx: number; by: number; } {
    let sx = e.clientX - this.canvas.offsetLeft;
    let sy = e.clientY - this.canvas.offsetTop;
    let bx = this.ct.fromX(sx);
    let by = this.ct.fromY(sy);
    return { bx, by };
  }

  onResize() {
    let h0 = $('#main .whole').height() as number;
    let w = $('#main .whole').width() as number;
    let h1 = $('#main .whole .top').height() as number;
    let h = h0 - h1;
    $('#main .whole .canvas-frame').height(h);
    this.canvas.width = w;
    this.canvas.height = h;
    $(this.canvas).width(w).height(h);
    this.draw();
  }

  draw() {
    let ctx = this.canvas.getContext('2d');
    assert_not_null(ctx);
    this.drawBackground(ctx);
    this.tp.draw(ctx, this.ct);
    this.bb.draw(ctx, this.ct);
  }

  drawBackground(ctx: CanvasRenderingContext2D) {
    if (this.backgroundType == 'check') {
      const grid_size = 13;
      const patternCanvas = document.createElement('canvas');
      patternCanvas.width = patternCanvas.height = grid_size * 2;
      const ctx2 = patternCanvas.getContext('2d');
      assert_not_null(ctx2);
      ctx2.fillStyle = 'lightgray';
      ctx2.fillRect(0, 0, grid_size * 2, grid_size * 2);
      ctx2.fillStyle = 'darkgray';
      ctx2.fillRect(0, grid_size, grid_size, grid_size);
      ctx2.fillRect(grid_size, 0, grid_size, grid_size);
      const pattern = ctx.createPattern(patternCanvas, 'repeat');
      assert_not_null(pattern);
      ctx.fillStyle = pattern;
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    } else {
      ctx.fillStyle = this.backgroundColor;
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }

  modeSet(n: string) {
    let handler = this.modes.find(m => m.name == n);
    if (handler) {
      if (this.currentMode)
        this.currentMode.onUnselect();

      $('#canvas-frame').attr('mode', n);
      handler.onSelect();
      this.currentMode = handler;
    } else {
      $('#canvas-frame').removeAttr('mode');
      console.error(`mode ${n} not defined`);
    }
  }

  save() {
    let s: IState = {
      backgroundType: this.backgroundType,
      backgroundColor: this.backgroundColor,
      block: this.bb.save(),
      templatePicture: this.tp.save(),
      ct: this.ct.save(),
      blockType: this.btw.save(),
    };
    let json = JSON.stringify(s);
    if (json != this.savedJsonStr) {
      localStorage.setItem('pixelEditor', json);
      this.savedJsonStr = json;
    }
  }

  load() {
    let str = localStorage.getItem('pixelEditor');
    if (str) {
      let s = JSON.parse(str) as IState;
      this.setState(s);
    }
    this.tp.loadPictureFromLocalStorage();
  }

  setState(s: IState) {
    this.bb.load(s.block);
    if (s.backgroundType) this.backgroundType = s.backgroundType;
    if (s.backgroundColor) this.backgroundColor = s.backgroundColor;
    if (s.ct)
      this.ct.load(s.ct);
    if (s.templatePicture)
      this.tp.load(s.templatePicture);
    if (s.blockType)
      this.btw.load(s.blockType);
    this.setDispBlockState();
    this.setDispImageState();
    this.draw();
  }

  fileSave() {
    let s: IStateFile = {
      state: {
        backgroundType: this.backgroundType,
        backgroundColor: this.backgroundColor,
        block: this.bb.save(),
        templatePicture: this.tp.save(),
        ct: this.ct.save()
      }
    };
    let data_url = localStorage.getItem('pixelEditor-picture');
    if (data_url)
      s.pictureData = data_url;
    let target = document.getElementById('anchor-file-save') as HTMLAnchorElement;
    let content = JSON.stringify(s);
    let blob = new Blob([content], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    target.download = 'pixel-edit-save.json';
    target.href = url;
    target.click();
    setTimeout(() => { URL.revokeObjectURL(url); }, 1E3);
  }

  fileLoadKick() {
    let fileElem = document.getElementById('input-load-file');
    if (fileElem)
      fileElem.click();
  }

  async fileLoad(elem: HTMLInputElement) {
    if (elem.files && elem.files.length > 0) {
      let file = elem.files[0];
      let json = await file.text();
      let s = JSON.parse(json) as IStateFile;
      if (s.pictureData) {
        localStorage.setItem('pixelEditor-picture', s.pictureData);
        this.tp.loadPictureFromLocalStorage();
      } else {
        this.tp.clearPicture();
        localStorage.removeItem('pixelEditor-picture');
      }
      this.setState(s.state);
    }
  }


  zoomView(factor: number, e: JQuery.TriggeredEvent) {
    let x = (e.clientX || 0) - e.currentTarget.offsetLeft;
    let y = (e.clientY || 0) - e.currentTarget.offsetTop;
    this.ct.zoom(factor, x, y);
    this.save();
    this.draw();
  }

  viewAll() {
    let area = (this.bb.getArea(this.ct));
    let area2 = this.tp.getArea(this.ct);
    let area3 = area ? area.or(area2) : area2;
    this.viewArea(area3);
  }

  viewArea(area: Rect | undefined) {
    this.ct.viewArea(area, this.bb.canvasRect());
    this.save();
    this.draw();
  }

  setDispBlockState() {
    if (this.bb.bDisp)
      $('.btn-disp-block').addClass('pushed')
    else
      $('.btn-disp-block').removeClass('pushed')
  }

  setDispImageState() {
    if (this.tp.bDisp)
      $('.btn-disp-image').addClass('pushed')
    else
      $('.btn-disp-image').removeClass('pushed')
  }

  status(mes: string) {
    $('.status').text(mes);
  }

  /**
   * クリアの実行を確認するダイアログ
   */
  clearDialog() {
    $.confirm({
      title: 'クリアの確認',
      content: div(
        div('ブロック及び背景画像のデータを全てクリアします。'),
        div('本当に実行しますか？')),
      buttons: {
        ok: {
          text: 'クリアを実行する',
          action: () => { this.clear() }
        },
        cancel: {
          text: '実行しない'
        }
      }
    });
  }

  /**
   * PixelEditを初期状態に戻す。
   * 
   * LocalStorageを空にして再起動する。
   */
  clear() {
    localStorage.removeItem('pixelEditor');
    localStorage.removeItem('pixelEditor-picture');
    document.location.reload();
  }

  // ------------------------------------------------------------------------------------------------
  //
  //     Make Menu
  //
  // ------------------------------------------------------------------------------------------------

  makeMenu() {
    this.menus.push(new Menu({
      name: 'ファイル',
      children: [
        { name: 'クリア', action: (e, m) => { this.clearDialog(); } },
        { separator: true },
        { name: '開く', action: (e, m) => { this.fileLoadKick(); } },
        { name: '保存', action: (e, m) => { this.fileSave(); } },
      ]
    }));

    this.menus.push(new Menu({
      'name': '表示',
      children: [{
        name: '全体表示',
        action: (e, m) => { this.viewAll(); }
      }, {
        name: '背景',
        action: (e, m) => { m.expand(e, true); },
        children: [{
          name: '単色背景',
          with_check: true,
          onBeforeExpand: m => { m.opt.checked = this.backgroundType == 'monochrome'; },
          action: (e, m) => { this.backgroundType = 'monochrome'; this.save(); this.draw(); }
        }, {
          name: 'チェック柄',
          onBeforeExpand: m => { m.opt.checked = this.backgroundType == 'check'; },
          action: (e, m) => { this.backgroundType = 'check'; this.save(); this.draw(); }
        }, {
          separator: true
        }, {
          name: '単色背景色設定',
          action: (e, m) => {
            $.confirm({
              title: '単色背景色設定',
              content: div({ class: 'monochrome-background-dlg' },
                div({ class: 'd-inline-block ms-4' },
                  div({ class: 'd-inline-block me-3 ' }, '背景色:'),
                  input({ type: 'color', value: this.backgroundColor, class: 'align-middle' }))
              ),
              buttons: {
                OK: () => {
                  this.backgroundColor = $('.monochrome-background-dlg input[type=color]').val() as string;
                  this.backgroundType = 'monochrome';
                  this.save();
                  this.draw();
                },
                Cancel: () => { }
              }
            })
          }
        }
        ]
      }]
    }));

    this.menus.push(this.bb.makeMenu());
    this.menus.push(this.tp.makeMenu());
    this.menus.push(new Menu({
      name: 'ヘルプ', children: [
        {
          name: 'このプログラムについて',
          action: async (e, m) => {
            let packageJson = await getPackageJson();
            $.confirm({
              title: 'このプログラムについて',
              columnClass: 'medium',
              content: div(
                div({ class: 'my-3 ms-1' },
                  span({ class: 'fs-3 fw-bold text-capitalize' }, packageJson.name),
                  div({ class: 'd-inline-block ms-2' }, ' version', packageJson.version)),
                div({ class: 'my-2' }, '作成者: @h_nari'),
                div({ class: 'my-2' }, 'ソースファイルは以下で公開されています。'),
                a({ href: 'https://github.com/h-nari/PixelEditor', target: '_blank' },
                  'https://github.com/h-nari/PixelEditor')
              )
            });
          }
        }, {
          name: '使い方',
          link_open: 'https://github.com/h-nari/PixelEditor/blob/main/README.md'
        }
      ]
    }));
  }
}


function getPackageJson(): Promise<any> {
  return new Promise((resolve, reject) => {
    $.ajax({
      type: 'get',
      url: 'package.json?' + Date.now(),
      dataType: 'json',
      success: (data, datatype) => {
        resolve(data);
      },
      error: (xhr, ts, et) => {
        reject(et);
      }
    })
  })
}

import cv, { Mat } from "opencv-ts";
import { assert_not_null } from "./asserts";
import { CoordinateTransformation, ICoordinateTransformationState } from "./ct";
import { marker, Marker } from "./marker";
import { Menu } from "./menu";
import { PixelEditor } from "./pixelEditor";
import { Point } from "./point";
import { Rect } from "./rect";
import { div, input, label } from "./tag";

const grip_size = 10;

export interface ITemplatePictureState {
  bDisp: boolean;
  bDispFrame: boolean;
  bDispInFrame?: boolean;
  dispImage?: 'src' | 'dst';
  trapezoid?: { x: number, y: number }[] | undefined;
  warpedRect?: { x: number, y: number, w: number, h: number } | undefined;
  srcCt?: ICoordinateTransformationState;
  dstCt?: ICoordinateTransformationState;
};

export class TemplatePicture {
  public parent: PixelEditor;
  public img: HTMLImageElement | undefined;
  public bDisp: boolean = true;
  public dispImage: 'src' | 'dst' = 'src';
  public bDispFrame: boolean = true;
  public bDispInFrame: boolean = false;        // フレーム内の画像のみ表示
  public trapezoid: Marker[] | undefined;
  public srcCt: CoordinateTransformation;
  public dstCt: CoordinateTransformation;
  public grabbing: number | undefined;
  public srcCanvas: HTMLCanvasElement;
  public dstCanvas: HTMLCanvasElement;
  public warpedRect: Rect | undefined;

  public srcImg: Mat | undefined;             // 元画像
  public dstImg: Mat | undefined;             // 透視ワープ後画像

  constructor(parent: PixelEditor) {
    this.parent = parent;
    this.srcCt = new CoordinateTransformation();
    this.srcCt.ax = this.srcCt.ay = 1 / 16;
    this.srcCanvas = document.getElementById('opencv-canvas-1') as HTMLCanvasElement;
    assert_not_null(this.srcCanvas);
    this.dstCt = new CoordinateTransformation();
    this.dstCt.ax = this.dstCt.ay = 1 / 16;
    this.dstCanvas = document.getElementById('opencv-canvas-2') as HTMLCanvasElement;
    assert_not_null(this.dstCanvas);
  }

  clear() {
    if (this.img) {
      this.clearPicture();
      localStorage.removeItem('pixelEditor-picture');
      this.parent.draw();
    }
  }

  save(): ITemplatePictureState {
    return {
      bDisp: this.bDisp,
      bDispFrame: this.bDispFrame,
      bDispInFrame: this.bDispInFrame,
      srcCt: this.srcCt.save(),
      dstCt: this.dstCt.save(),
      dispImage: this.dispImage,
      trapezoid: this.trapezoid,
      warpedRect: this.warpedRect,
    }
  }

  load(s: ITemplatePictureState) {
    this.bDisp = s.bDisp;
    this.bDispFrame = s.bDispFrame;
    this.bDispInFrame = s.bDispInFrame || false;
    this.dispImage = s.dispImage || 'src';
    if (s.trapezoid)
      this.trapezoid = s.trapezoid.map(p => marker(p.x, p.y));
    else
      this.trapezoid = undefined;
    if (s.warpedRect) {
      let r = s.warpedRect;
      this.warpedRect = new Rect(r.x, r.y, r.w, r.h);
    } else
      this.warpedRect = undefined;
    if (s.srcCt) this.srcCt.load(s.srcCt);
    if (s.dstCt) this.dstCt.load(s.dstCt);

    if (this.srcImg && this.trapezoid && this.warpedRect) {
      this.setPerspective(this.warpedRect.transform(this.srcCt))
    }
  }

  clearPicture() {
    if (this.img) {
      URL.revokeObjectURL(this.img.src);
      this.img = undefined;
    }
    if (this.srcImg) {
      this.srcImg.delete();
      this.srcImg = undefined;
    }
    if (this.dstImg) {
      this.dstImg.delete();
      this.dstImg = undefined;
    }
  }

  loadPictureFromLocalStorage() {
    let data_url = localStorage.getItem('pixelEditor-picture');
    if (data_url) {
      this.clearPicture();
      this.img = new Image();
      this.img.src = data_url;
      this.img.onload = () => {
        assert_not_null(this.img);
        this.srcImg = cv.imread(this.img);
        this.srcCanvas.width = this.srcImg.cols;
        this.dstCanvas.height = this.srcImg.rows;
        cv.imshow(this.srcCanvas, this.srcImg);
        if (this.trapezoid && this.warpedRect) {
          let target = this.warpedRect.transform(this.dstCt);
          this.setPerspective(target);
        }
        this.parent.draw();
      }
    }

  }

  kickLoadPicture() {
    let fileElem = document.getElementById('input-load-picture');
    if (fileElem) fileElem.click();
  }

  loadPicture(elem: HTMLInputElement) {
    if (elem.files && elem.files.length > 0) {
      let file = elem.files[0];
      this.clearPicture();
      this.img = new Image();
      this.img.src = URL.createObjectURL(file);
      this.img.onload = () => {
        this.bDisp = true;
        assert_not_null(this.img);
        this.srcImg = cv.imread(this.img);
        let w = this.img.width;
        let h = this.img.height;
        this.srcCanvas.width = w;
        this.srcCanvas.height = h;
        cv.imshow(this.srcCanvas, this.srcImg);
        this.trapezoid = [marker(0, 0), marker(0, h), marker(w, h), marker(w, 0)];
        this.srcCt = new CoordinateTransformation(1 / 16, 0, 1 / 16, 0);
        this.bDisp = true;
        this.bDispInFrame = false;
        this.dispImage = 'src';
        this.parent.viewAll();
        this.parent.save();
        this.parent.draw();
      }

      let reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (d) => {
        try {
          let s = reader.result as string;
          console.log('length:', s.length);
          if (s.length > 4000000)
            $.alert('画像ファイルが大きすぎて ブラウザに保存できません。<br/>1Mbyte未満の画像ファイルをご利用ください。');
          else
            localStorage.setItem('pixelEditor-picture', s);
        } catch (e) {
          console.log('error:', e);
          $.alert(e)
        }
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D, ct0: CoordinateTransformation) {
    if (this.bDisp) {
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      let ct = ct0.join(this.dispImage == 'src' ? this.srcCt : this.dstCt);
      let c = this.dispImage == 'src' ? this.srcCanvas : this.dstCanvas;
      let w = ct.ax * c.width;
      let h = ct.ay * c.height;
      if (this.bDispInFrame) {
        let t = this.trapezoid;
        if (this.dispImage == 'src' && t && t.length > 0) {
          ctx.beginPath();
          ctx.moveTo(ct.toX(t[0].x), ct.toY(t[0].y));
          for (let i = 1; i < t.length; i++)
            ctx.lineTo(ct.toX(t[i].x), ct.toY(t[i].y));
          ctx.clip();
        }
        if (this.dispImage == 'dst' && this.warpedRect) {
          let r = this.warpedRect.transform(ct);
          ctx.beginPath();
          r.path(ctx);
          ctx.clip();
        }
      }
      ctx.drawImage(c, ct.bx, ct.by, w, h);
      ctx.restore();

      if (this.bDispFrame) {
        if (this.dispImage == 'src')
          this.drawTrapezoid(ctx, ct0);
        if (this.dispImage == 'dst')
          this.drawWarpedRect(ctx, ct0);
      }
    }
  }

  drawWarpedRect(ctx: CanvasRenderingContext2D, ct0: CoordinateTransformation) {
    let ct = ct0.join(this.dstCt);
    let r = this.warpedRect;
    if (r) {
      let rr = r.transform(ct);
      ctx.save();
      ctx.beginPath();
      rr.path(ctx);
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 1;
      ctx.globalCompositeOperation = 'difference';
      ctx.stroke();
      ctx.restore();
    }
  }

  drawTrapezoid(ctx: CanvasRenderingContext2D, ct0: CoordinateTransformation) {
    if (this.trapezoid) {
      let ct = ct0.join(this.srcCt);
      ctx.save();
      ctx.globalCompositeOperation = 'difference';
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'white';
      ctx.beginPath();
      for (let p of this.trapezoid)
        ctx.lineTo(ct.toX(p.x), ct.toY(p.y));
      ctx.closePath();
      ctx.stroke();
      for (let m of this.trapezoid)
        m.draw(ctx, ct);

      let src = cv.matFromArray(4, 1, cv.CV_32FC2, [0, 0, 100, 0, 100, 100, 0, 100]);
      let a: number[] = [];
      for (let m of this.trapezoid) {
        a.push(m.x);
        a.push(m.y);
      }
      let dst = cv.matFromArray(4, 1, cv.CV_32FC2, a);
      let cnv = cv.getPerspectiveTransform(src, dst);
      src.delete();
      dst.delete();
      src = cv.matFromArray(12, 1, cv.CV_32FC2, [
        25, 0, 25, 100,
        50, 0, 50, 100,
        75, 0, 75, 100,
        0, 25, 100, 25,
        0, 50, 100, 50,
        0, 75, 100, 75
      ]);
      dst = new cv.Mat();
      cv.perspectiveTransform(src, dst, cnv);
      let d = dst.data32F;
      for (let i = 0; i < d.length; i += 4) {
        ctx.beginPath();
        ctx.moveTo(ct.toX(d[i + 0]), ct.toY(d[i + 1]));
        ctx.lineTo(ct.toX(d[i + 2]), ct.toY(d[i + 3]));
        ctx.stroke();
      }
      dst.delete();
      ctx.restore();
    }
  }

  hitTest(e: JQuery.MouseDownEvent | JQuery.MouseMoveEvent | JQuery.MouseUpEvent): number | undefined {
    let ct = this.parent.ct.join(this.srcCt);
    let mx = e.clientX - e.currentTarget.offsetLeft;
    let my = e.clientY - e.currentTarget.offsetTop;
    if (this.trapezoid) {
      for (let i = 0; i < this.trapezoid.length; i++) {
        if (this.trapezoid[i].isHit(ct, mx, my))
          return i;
      }
    }
    return undefined;
  }

  onMouseDown(e: JQuery.MouseDownEvent<HTMLCanvasElement, undefined, HTMLCanvasElement, HTMLCanvasElement>) {
    this.grabbing = this.hitTest(e);
  }

  onMouseMove(e: JQuery.MouseMoveEvent<HTMLCanvasElement, undefined, HTMLCanvasElement, HTMLCanvasElement>, dx0: number, dy0: number): boolean {
    if (this.grabbing !== undefined && this.trapezoid) {
      let ct = this.parent.ct;
      // let dx = (e.clientX - this.parent.x0) / (this.ct.ax * ct.ax);
      // let dy = (e.clientY - this.parent.y0) / (this.ct.ay * ct.ay);
      let dx = dx0 / (this.srcCt.ax * ct.ax);
      let dy = dy0 / (this.srcCt.ay * ct.ay);
      let m = this.trapezoid[this.grabbing];
      m.x += dx;
      m.y += dy;
      this.parent.draw();
      return true;
    }
    return false;
  }
  onMouseUp(e: JQuery.MouseUpEvent<HTMLCanvasElement, undefined, HTMLCanvasElement, HTMLCanvasElement>) {
    if (this.grabbing) {
      this.grabbing = undefined;
      this.parent.save();
    }
  }


  /**
   * 画面上で占める領域を画面座標(ctで変換)で返す
   * 
   * @param ct ブロック座標から画面座標への変換オブジェクト
   */

  getArea(ct0: CoordinateTransformation) {
    if (!this.img || !this.bDisp)
      return undefined;

    if (this.dispImage == 'src') {                  // 遠近法ワープ前画像
      let ct = ct0.join(this.srcCt);
      if (this.bDispInFrame && this.trapezoid) {
        let m0 = this.trapezoid[0];
        let r = new Rect(m0.x, m0.y, 0, 0);
        for (let i = 1; i < this.trapezoid.length; i++)
          r.or(this.trapezoid[i]);
        return r;
      }
      else {
        let r = new Rect(0, 0, this.img.width, this.img.height);
        return r.transform(ct);
      }
    } else if (this.dispImage == 'dst') {          // 遠近法ワープ変換後
      let ct = ct0.join(this.dstCt);
      if (this.bDispInFrame && this.warpedRect)
        return this.warpedRect.transform(ct);
      else if (this.dstImg)
        return new Rect(0, 0, this.dstImg.cols, this.dstImg.rows).transform(ct);
    }
    return undefined;
  }

  /**
   * 遠近法ワープダイアログ
   * @returns 
   */

  perspectiveDialog() {
    let w = this.parent.bb.col;
    let h = this.parent.bb.row;
    var jc = $.confirm({
      title: '遠近法ワープ',
      type: 'blue',
      columnClass: 'large',
      content: div({ class: 'perspective-dialog' },
        div({ class: 'line' },
          label('領域のサイズ'),
          div({ class: 'item d-inline-block' },
            label('幅'),
            input({ class: 'width', type: 'number', value: w })
          ),
          div({ class: 'item d-inline-block' },
            label('高さ'),
            input({ class: 'height', type: 'number', value: h })
          ),
        )
      ),
      onOpen: () => {
        let r = this.parent.bb.selectedRect;
        if (r) {
          $('.perspective-dialog input.width').val(r.w);
          $('.perspective-dialog input.height').val(r.h);
          jc.buttons.ok2.enable();
        } else {
          jc.buttons.ok2.disable();
        }
      },
      buttons: {
        ok1: {
          text: 'ブロック領域を新規生成',
          action: () => {
            let w = Number($('.perspective-dialog input.width').val() as string);
            let h = Number($('.perspective-dialog input.height').val() as string);
            this.parent.bb.resize(new Rect(0, 0, w, h));
            this.dispImage = 'dst';
            this.setPerspective(new Rect(0, 0, w, h));
          },
        },
        ok2: {
          text: '選択されたブロック領域に配置',
          action: () => {
            let r = this.parent.bb.selectedRect;
            assert_not_null(r);
            r.w = Number($('.perspective-dialog input.width').val() as string);
            r.h = Number($('.perspective-dialog input.height').val() as string);
            this.dispImage = 'dst';
            this.setPerspective(r);
          },
        },
        'Cancel': () => { }
      }
    })
  }

  /**
   * 遠近法ワープ画像を生成
   * 
   * @param target 変換先領域 (ブロック座標)
   */
  setPerspective(target: Rect) {
    if (!this.trapezoid) return;

    const targetArray = function (r: Rect, xoff: number = 0, yoff: number = 0) {
      let x0 = r.x + xoff;
      let y0 = r.y + yoff;
      let x1 = r.x1() + xoff;
      let y1 = r.y1() + yoff;
      return [x0, y0, x0, y1, x1, y1, x1, y0];
    };

    // 変換先画像サイズ、4頂点

    let rDst = this.trapezoid.reduce((r: Rect | undefined, m) => r ? r.or(m) : new Rect(m.x, m.y), undefined);
    assert_not_null(rDst);
    let dst = cv.matFromArray(4, 1, cv.CV_32FC2, targetArray(rDst));

    // 変換元 4頂点

    let a = this.trapezoid.reduce((acc: number[], m) => acc.concat([m.x, m.y]), []);
    let src = cv.matFromArray(4, 1, cv.CV_32FC2, a);

    // 変換行列を求める

    let cnv = cv.getPerspectiveTransform(src, dst);
    dst.delete();

    // 元画像の変換先座標を求める

    assert_not_null(this.srcImg);
    let w = this.srcImg.cols;
    let h = this.srcImg.rows;
    let mSrc = cv.matFromArray(4, 1, cv.CV_32FC2, [0, 0, 0, h, w, 0, w, h]);
    let mDst = new cv.Mat();
    cv.perspectiveTransform(mSrc, mDst, cnv);
    let d = mDst.data32F;
    let rDst2 = new Rect(d[0], d[1]);
    for (let i = 2; i < d.length; i += 2)
      rDst2 = rDst2.or(new Point(d[i], d[i + 1])) as Rect;
    mSrc.delete();
    mDst.delete();
    cnv.delete();

    // 変換先画像が切れないよう、オフセット計算

    let dst2 = cv.matFromArray(4, 1, cv.CV_32FC2, targetArray(rDst, -rDst2.x, -rDst2.y));
    let cnv2 = cv.getPerspectiveTransform(src, dst2);
    src.delete();
    dst2.delete();

    // 画像変換

    if (this.dstImg) this.dstImg.delete();
    this.dstImg = new cv.Mat();
    cv.warpPerspective(this.srcImg, this.dstImg, cnv2, new cv.Size(rDst2.w, rDst2.h), cv.INTER_LINEAR, cv.BORDER_CONSTANT, new cv.Scalar());
    this.dstCanvas.width = this.dstImg.cols;
    this.dstCanvas.height = this.dstImg.rows;
    cv.imshow(this.dstCanvas, this.dstImg);
    cnv2.delete();

    // 画像配置するため ctを設定
    // rDstが(-rDst2.x,-rDst2y)ずれたものが 
    // target:Rect に表示されるようにする

    this.dstCt.ax = target.w / rDst.w;
    this.dstCt.bx = target.x - (rDst.x - rDst2.x) * this.dstCt.ax;
    this.dstCt.ay = target.h / rDst.h;
    this.dstCt.by = target.y - (rDst.y - rDst2.y) * this.dstCt.ay;

    //
    // 表示
    //

    this.warpedRect = new Rect(rDst.x - rDst2.x, rDst.y - rDst2.y, rDst.w, rDst.h);
    this.parent.save();
    this.parent.draw();
  }

  /**
   * ブロック自動配置ダイアログ
   */
  blockPlaceDialog() {
    $.confirm({
      title: 'ブロック自動配置',
      content: '背景画像をもとにブロックを自動配置します',
      buttons: {
        place: {
          text: '自動配置',
          action: () => { this.blockPlace(); }
        },
        cancel: {
          text: '閉じる'
        }
      }
    })
  }

  /**
   * 背景画像を元にブロックを自動配置する。
   */
  blockPlace() {
    if (!this.dstImg) throw new Error('no dstImg');
    if (!this.warpedRect) throw new Error('no warpedRect');

    let wr = this.warpedRect;
    console.log('wr:', wr);
    let img1 = this.dstImg.roi(new cv.Rect(wr.x, wr.y, wr.w, wr.h));
    let img2 = new cv.Mat();
    let bw = this.parent.bb.col;
    let bh = this.parent.bb.row;
    cv.resize(img1, img2, new cv.Size(bw, bh), 0, 0, cv.INTER_AREA);
    this.showImg(img2);

    for(let y=0; y < bh; y++){
      for(let x=0; x < bw; x++){
        
      }
    }
    img1.delete();
    img2.delete();
  }

  /**
   * openCVの画像(Mat)を表示、デバッグ用
   * @param img 
   */
  showImg(img: Mat) {
    let c = document.getElementById('opencv-canvas-debug') as HTMLCanvasElement;
    if (c) {
      let w = img.cols;
      let h = img.rows;
      console.log(`img1: ${w} x ${h}`);
      c.width = w;
      c.height = h;
      $(c).width(w).height(h);
      cv.imshow(c, img);
    }
  }

  makeMenu(): Menu {
    return new Menu({
      name: '背景画像',
      children: [
        {
          name: '表示',
          with_check: true,
          onBeforeExpand: m => { m.opt.checked = this.bDisp; },
          action: (e, m) => {
            m.opt.checked = this.bDisp = !this.bDisp;
            this.parent.setDispImageState();
            this.parent.save();
            this.parent.draw();
          }
        }, {
          name: 'フレーム表示',
          with_check: true,
          onBeforeExpand: m => { m.opt.checked = this.bDispFrame },
          action: (e, m) => {
            m.opt.checked = this.bDispFrame = !this.bDispFrame;
            this.parent.save();
            this.parent.draw();
          }
        }, {
          name: 'フレーム内画像のみ表示',
          with_check: true,
          onBeforeExpand: m => { m.opt.checked = this.bDispInFrame; },
          action: (e, m) => {
            m.opt.checked = this.bDispInFrame = !this.bDispInFrame;
            this.parent.save();
            this.parent.draw();
          }
        }, {
          name: 'クリア',
          action: (e, m) => {
            this.clear();
          }
        }, {
          name: '背景画像読み込み',
          action: (e, menu) => { this.kickLoadPicture(); }
        },
        { separator: true },
        {
          name: '遠近法ワープ',
          action: (e, menu) => { this.perspectiveDialog(); }
        },
        {
          name: '遠近法ワープ表示',
          with_check: true,
          onBeforeExpand: m => {
            m.opt.disable = this.dstImg == undefined;
            m.opt.checked = this.dispImage == 'dst';
          },
          action: (e, m) => {
            if (this.dispImage == 'dst')
              this.dispImage = 'src';
            else
              this.dispImage = 'dst';
            this.parent.save();
            this.parent.draw();
          }
        }, {
          separator: true,
        }, {
          name: 'ブロック自動配置',
          action: (e, m) => { this.blockPlaceDialog(); }
        }
      ]
    });
  }

}
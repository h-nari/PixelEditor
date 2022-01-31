import { Rect } from "./rect";

export interface IPrimitiveBlockBufferState {
  width: number;
  height: number;
  buf: number[];
};

/**
 * uint16_t の2次元データを保持するオブジェクト
 * 
 *  固定サイズ,原始的
 */
export class PrimitiveBlockBuffer {
  public width: number;
  public height: number;
  public buf: Uint16Array;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.buf = new Uint16Array(width * height);
    this.clear();
  }

  clear() {
    for (let i = 0; i < this.buf.length; i++)
      this.buf[i] = 0;
  }

  inRange(x: number, y: number): boolean {
    return x >= 0 && x < this.width && y >= 0 && y < this.height;
  }

  set(x: number, y: number, value: number): boolean {
    if (!this.inRange(x, y)) throw new Error(`out of range (${x},${y})`);
    if (this.buf[y * this.width + x] == value)
      return false;
    else {
      this.buf[y * this.width + x] = value;
      return true;
    }
  }

  get(x: number, y: number): number {
    if (!this.inRange(x, y)) throw new Error(`out of range  (${x},${y})`);
    return this.buf[y * this.width + x];
  }

  save(): IPrimitiveBlockBufferState {
    return {
      width: this.width, height: this.height,
      buf: Array.from(this.buf.values())
    }
  }

  load(s: IPrimitiveBlockBufferState) {
    this.width = s.width;
    this.height = s.height;
    let len = this.width * this.height;
    this.buf = new Uint16Array(len);
    let i = 0;
    for (; i < Math.min(len, s.buf.length); i++)
      this.buf[i] = s.buf[i];
    for (; i < len; i++)
      this.buf[i] = 0;
  }

  tallyBlocks(rect: Rect | undefined = undefined) {
    let sum: { [idx: number]: number } = {};
    /*
    for (let idx of this.buf) {
      if (idx in sum)
        sum[idx]++;
      else
        sum[idx] = 1;
    }
    */

    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (rect && !rect.includes(x, y)) continue;
        let idx = this.get(x, y);
        if (idx in sum)
          sum[idx]++;
        else
          sum[idx] = 1;
      }
    }
    return sum;
  }

}


type ColorType = 'RGB';

type ColorValue = ColorRGB;

export interface ColorRGB {
  type: 'RGB';
  r: number;
  g: number;
  b: number;
  a?: number;
};

export class Color {
  public value: ColorValue;

  constructor(value: ColorValue) {
    this.value = value;
  }

  distance(color: Color): number {
    let v = this.value;
    let c = color.value;
    if (v.type == c.type) {
      let r = v.r - c.r;
      let g = v.g - c.g;
      let b = v.g - c.g;
      return r * r + g * g + b * b;
    } else {
      throw new Error('distance of different type color not implemented yet');
    }
  }

}
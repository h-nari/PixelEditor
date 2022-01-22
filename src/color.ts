
type ColorType = 'RGB';

type ColorValue = ColorRGB;

interface ColorRGB {
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
}
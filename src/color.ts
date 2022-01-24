
type ColorType = 'RGB' | 'LAB';

type ColorValue = ColorRGB | ColorLAB;

export interface ColorRGB {
  type: 'RGB';
  r: number;
  g: number;
  b: number;
  a?: number;
};

export interface ColorLAB {
  type: 'LAB';
  L: number;
  a: number;
  b: number;
};

export class Color {
  public value: ColorValue;

  constructor(value: ColorValue) {
    this.value = value;
  }

  to(type: ColorType) {
    if (this.value.type == type)
      return this;
    if (this.value.type == 'RGB') {
      if (type == 'LAB') {
        return new Color(rgb2lab(this.value));
      }
    }
    throw new Error(`color space conversion ${this.value.type} to ${type} not implemented yet`);
  }

  distance(color: Color): number {
    let v = this.value;
    let c = color.to(v.type).value;
    if (v.type == 'RGB' && c.type == 'RGB') {
      return (v.r - c.r) ** 2 + (v.g - c.g) ** 2 + (v.b - c.b) ** 2;
    } else if (v.type == 'LAB' && c.type == 'LAB') {
      return (v.L - c.L) ** 2 + (v.a - c.a) ** 2 + (v.b - c.b) ** 2;
    } else {
      throw new Error('distance of different type color not implemented yet');
    }
  }

}

function rgb2lab(src: ColorRGB): ColorLAB {
  var r = src.r / 255;
  var g = src.g / 255;
  var b = src.b / 255;

  r = r > 0.04045 ? Math.pow(((r + 0.055) / 1.055), 2.4) : (r / 12.92);
  g = g > 0.04045 ? Math.pow(((g + 0.055) / 1.055), 2.4) : (g / 12.92);
  b = b > 0.04045 ? Math.pow(((b + 0.055) / 1.055), 2.4) : (b / 12.92);

  var x = (r * 0.4124) + (g * 0.3576) + (b * 0.1805);
  var y = (r * 0.2126) + (g * 0.7152) + (b * 0.0722);
  var z = (r * 0.0193) + (g * 0.1192) + (b * 0.9505);

  //https://en.wikipedia.org/wiki/Lab_color_space#CIELAB-CIEXYZ_conversions

  x *= 100;
  y *= 100;
  z *= 100;

  x /= 95.047;
  y /= 100;
  z /= 108.883;

  x = x > 0.008856 ? Math.pow(x, 1 / 3) : (7.787 * x) + (4 / 29);
  y = y > 0.008856 ? Math.pow(y, 1 / 3) : (7.787 * y) + (4 / 29);
  z = z > 0.008856 ? Math.pow(z, 1 / 3) : (7.787 * z) + (4 / 29);

  return { type: 'LAB', L: (116 * y) - 16, a: 500 * (x - y), b: 200 * (y - z) };
}
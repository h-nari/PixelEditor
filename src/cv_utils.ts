import cv, { Mat } from "opencv-ts";
import { Color } from "./color";

/**
* openCVの画像(Mat)を表示、デバッグ用
* @param img 
*/
export function cvshow(img: Mat, canvas_id: string = 'opencv-canvas-debug') {
  let c = document.getElementById(canvas_id) as HTMLCanvasElement;
  if (c) {
    $(c).removeClass('d-none');
    let w = img.cols;
    let h = img.rows;
    c.width = w;
    c.height = h;
    $(c).width(w).height(h);
    cv.imshow(c, img);
  }
}

export function getPixel(img: Mat, x: number, y: number): Color {
  let w = img.cols;
  let h = img.rows;

  if (x < 0 || x >= w || y < 0 || y >= h)
    throw new Error(`(${x},${y}) is out of range, image is ${w}x${h})`);
  let p = img.ucharPtr(y,x);
  return new Color({ type: 'RGB', r: p[0], g: p[1], b: p[2], a: p[3] })
}
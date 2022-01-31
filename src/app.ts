import { PixelEditor } from "./pixelEditor";
import { Rect } from "./rect";
import { div } from "./tag";

declare global {
  interface Window {
    pe: PixelEditor;
  }
}

window.onresize = () => {
  window.pe.onResize();
};

$(async () => {
  let url = new URL(document.URL);
  if (url.searchParams.get('print') == 'tally') {
    let pe = new PixelEditor();
    window.pe = pe;
    await pe.init();
    pe.load();
    let r = url.searchParams.get('rect');
    console.log('r:', r);

    if (r) {
      let m = r.match(/(\d+),(\d+),(\d+),(\d+)/);
      console.log('m:', m);
      if (m) {
        let x = parseInt(m[1]);
        let y = parseInt(m[2]);
        let w = parseInt(m[3]);
        let h = parseInt(m[4]);
        let rect = new Rect(x, y, w, h);
        $('#main').html(pe.bb.tallyBlocksHtml(rect));
        window.print();
      } else {
        $('#main').html(div('rectパラメータが不正です:' + r))
      }
    } else {
      $('#main').html(pe.bb.tallyBlocksHtml());
      window.print();
    }
  } else {
    let pe = new PixelEditor();
    window.pe = pe;
    $('#main').html(pe.initHtml());
    await pe.init();
    pe.load();
    $('#main').html(pe.html());
    pe.bind();
    pe.onResize();
  }
});
import { PixelEditor } from "./pixelEditor";

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
    console.log('Print');
    let pe = new PixelEditor();
    await pe.init();
    pe.load();
    $('#main').html(pe.bb.tallyBlocksHtml());
    window.print();
  } else {
    let pe = new PixelEditor();
    window.pe = pe;
    await pe.init();
    pe.load();
    $('#main').html(pe.html());
    pe.bind();
    pe.onResize();
  }
});
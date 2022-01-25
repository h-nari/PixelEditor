import { a, div, li, selected, ul } from "./tag";

interface TabbedWindowOption {
  tabs: {
    name: string;
    content: string;
  }[],
  active?: string;
  class?: string;
}

export class TabbedWindow {
  private static sn = 0;
  private id: string;
  private opt: TabbedWindowOption;
  private name2id: { [name: string]: string } = {};

  constructor(opt: TabbedWindowOption) {
    this.opt = opt;
    this.id = 'tabwin-' + TabbedWindow.sn++;
    for (let t of this.opt.tabs)
      this.name2id[t.name] = 'tabpane-' + TabbedWindow.sn++;
  }

  html() {
    if (!this.opt.active) this.opt.active = this.opt.tabs[0].name;

    return div({ class: 'tabbed-window ' + (this.opt.class || ''), id: this.id },
      div({ class: 'tab-box' },
        ul({ class: 'nav nav-tabs' },
          ... this.opt.tabs.map(t =>
            li({ class: 'nav-item' },
              a({
                class: 'nav-link' + (t.name == this.opt.active ? ' active' : ''),
                href: '#',
                target: this.name2id[t.name],
              }, t.name))
          ))),
      div({ class: 'tab-body mx-3 my-3' },
        ... this.opt.tabs.map(t =>
          div({
            class: 'tab-pane' + (t.name != this.opt.active ? ' d-none' : ''),
            id: this.name2id[t.name]
          }, t.content))
      )
    )
  }

  bind() {
    $(`#${this.id} .nav-tabs .nav-item a.nav-link`).on('click', e => {
      $(`#${this.id} a.nav-link.active`).removeClass('active');
      $(e.currentTarget).addClass('active');

      let target = $(e.currentTarget).attr('target') as string;
      $(`#${this.id} .tab-pane`).addClass('d-none');
      $(`#${target}`).removeClass('d-none');

      e.preventDefault();
      e.stopImmediatePropagation();
    });
  }

}
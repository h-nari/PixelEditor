import { button, div, icon } from "./tag";

export class TreeControl {
  private static sn = 0;
  public id: string;
  public open_icon = 'caret-down-fill';
  public close_icon = 'caret-right-fill';
  // public nochild_icon = 'dot';
  // public nochild_icon = 'arrow-down-right';
  // public nochild_icon = 'arrow-bar-right';
  // public nochild_icon = 'caret-right';
  public nochild_icon = 'dash';
  public top: TreeNode;
  public initialNodeState: NodeState = 'open';

  constructor() {
    this.id = 'tree-control-' + TreeControl.sn++;
    this.top = new TreeNode(this);
    this.top.state = 'open';
  }

  html() {
    return div({ id: this.id, class: 'tree-control' },
      ... this.top.children.map(c => c.html())
    );
  }

  redraw() {
    $('#' + this.id).html(this.top.html());
    this.bind();
  }

  bind() {
    this.top.children.forEach(n => { n.bind(); })
  }

  add(node: TreeNode) {
    this.top.add(node);
  }

  newNode(...content: string[]) {
    let node = new TreeNode(this, ...content);
    node.state = this.initialNodeState;
    return node;
  }

};

type NodeState = 'open' | 'close';

export class TreeNode {
  static sn = 0;
  public id: string;
  public tc: TreeControl;
  public children: TreeNode[] = [];
  public content: string | ((node: TreeNode) => string);
  public state: NodeState = 'open';
  public onBindCB: ((node: TreeNode) => void) | undefined;

  constructor(tc: TreeControl, ...args: string[]) {
    this.id = 'treenode-' + TreeNode.sn++;
    this.tc = tc;
    this.content = args.join('');
  }

  html(): string {
    return div({ id: this.id, class: 'tree-node' }, this.innerHtml());
  }

  innerHtml(): string {
    let c = '';
    c += div({ class: 'tree-node-self d-flex' },
      button({ class: 'tree-node-btn' }, this.icon()),
      'string' == typeof this.content ? this.content : this.content(this));
    c += div({ class: 'tree-children' + (this.state == 'close' ? ' d-none' : '') },
      ... this.children.map(c => c.html()));
    return c;
  }

  redraw() {
    $('#' + this.id).html(this.innerHtml());
    this.bind();
  }

  bind() {
    $(`#${this.id} > .tree-node-self button.tree-node-btn`).on('click', e => {
      this.setState(this.state == 'open' ? 'close' : 'open');
      e.preventDefault();
      e.stopPropagation();
    })
    this.children.forEach(c => c.bind());
    if (this.onBindCB)
      this.onBindCB(this);
  }

  forEach(f: (n: TreeNode) => void) {
    f(this);
    this.children.forEach(c => c.forEach(f));
  }

  setContent(content: string) {
    this.content = content;
  }

  setState(state: NodeState) {
    this.state = state;
    let t = $(`#${this.id} > .tree-children`);
    if (this.state == 'open')
      t.removeClass('d-none');
    else
      t.addClass('d-none');
    $(`#${this.id} > .tree-node-self .tree-node-btn`).html(this.icon());
  }

  add(child: TreeNode) {
    this.children.push(child);
  }

  private icon() {
    if (this.children.length > 0) {
      if (this.state == 'open')
        return icon(this.tc.open_icon);
      else
        return icon(this.tc.close_icon);
    } else {
      return icon(this.tc.nochild_icon);
    }
  }
};
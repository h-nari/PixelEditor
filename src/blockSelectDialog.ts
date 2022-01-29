import { assert_not_null } from "./asserts";
import { blockGroups, IBlockGroup, IBlockType } from "./blockTypes";
import { PixelEditor } from "./pixelEditor";
import { TabbedWindow } from "./tabbedWindow";
import { div, icon, img } from "./tag";
import { TreeControl } from "./treeControl";

/**
 * 自動配置に使用するブロックを選択するダイアログ
 */
export function blockSelectDialog(parent: PixelEditor) {
  let tree = new TreeControl();
  tree.initialNodeState = 'close';
  for (let g of blockGroups) {
    let node = tree.newNode();
    node.content = n => {
      let c = '';
      c += div({ class: 'group-name flex-fill' }, g.name);
      c += div({ class: 'icon-frame' }, icon(blockGroupUseIcon(g)));
      return c;
    }
    node.onBindCB = () => {
      $(`#${node.id} >.tree-node-self`).on('click', e => {
        let state = blockGroupState(g);
        let next_state: BlockGroupState;
        switch (state) {
          case 'use_all': next_state = 'use_none'; break;
          case 'use_none': next_state = 'use_all'; break;
          default: next_state = 'use_none'; break;
        }
        for (let t of g.types)
          t.use = next_state == 'use_all';
        node.redraw();
        parent.save();
        e.stopPropagation();
      });
    }
    tree.add(node);
    for (let b of g.types) {
      let c = tree.newNode();
      c.content = n => {
        let c = '';
        c += div({ class: 'mx-1' }, img({ src: `./public/block/${b.id}.png` }));
        c += div({ class: 'block-name flex-fill' }, b.name);
        c += div({ class: 'icon-frame' }, icon(blockTypeUseIcon(b)));
        return c;
      }
      c.onBindCB = () => {
        $(`#${c.id}`).on('click', e => {
          b.use = !blockCanUse(b);
          node.redraw();
          parent.save();
          e.stopPropagation();
        });
      }
      node.add(c);
    }
  }

  let tab = new TabbedWindow({
    class: 'select-blocks-tab',
    tabs: [
      {
        name: 'ブロック一覧',
        content: div(
          div('ブロック一覧の中身'),
          tree.html()
        )
      }, {
        name: '使用されているブロック',
        content: '使用されているブロックの中身'
      }
    ]
  });
  $.confirm({
    title: '使用ブロック選択',
    columnClass: 'large',
    content: div({ class: 'select-blocks-dialog' },
      div({ class: 'my-3' }, '自動配置に使用するブロックを選択してください'),
      tab.html()
    ),
    onOpen: () => {
      tab.bind();
      tree.bind();
    },
    buttons: {
      '閉じる': () => { }
    }
  })
}

const icon_use = 'check-square';
const icon_not_use = 'square'
const icon_partial_use = 'dash-square';

const blockGroupIcon = {
  'use_all': icon_use,
  'use_none': icon_not_use,
  'use_partial': icon_partial_use,
};
type TBlockGroupIcon = typeof blockGroupIcon;
type BlockGroupState = keyof TBlockGroupIcon;

export function blockCanUse(t: IBlockType) {
  return t.use === undefined || t.use;
}

function blockTypeUseIcon(t: IBlockType): string {
  return blockCanUse(t) ? icon_use : icon_not_use;
}

function blockGroupState(g: IBlockGroup): BlockGroupState {
  let cUse = 0;
  let cNotUse = 0;
  for (let t of g.types) {
    if (blockCanUse(t))
      cUse++;
    else cNotUse++;
  }

  if (cUse > 0)
    return cNotUse > 0 ? 'use_partial' : 'use_all';
  else
    return 'use_none';
}

function blockGroupUseIcon(g: IBlockGroup): string {
  let s = blockGroupState(g);
  let icon = blockGroupIcon[s];
  assert_not_null(icon);
  return icon;
}





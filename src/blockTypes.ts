export interface IBlockType {
  id: string;
  name: string;
  idx?: number;
  imageBitmap?: ImageBitmap;
  use?: boolean;
};

interface IBlockGroup {
  name: string;
  use?: boolean;
  types: IBlockType[];
};

export var blockGroups: IBlockGroup[] = [{
  name: 'テラコッタ', types: [
    { name: '白色のテラコッタ', id: 'white_terracotta' },
    { name: '橙色のテラコッタ', id: 'orange_terracotta' },
    { name: '赤紫色のテラコッタ', id: 'magenta_terracotta' },
    { name: '空色のテラコッタ', id: 'light_blue_terracotta' },
    { name: '黄色のテラコッタ', id: 'yellow_terracotta' },
    { name: '黄緑色のテラコッタ', id: 'lime_terracotta' },
    { name: '桃色のテラコッタ', id: 'pink_terracotta' },
    { name: '灰色のテラコッタ', id: 'gray_terracotta' },
    { name: '薄灰色のテラコッタ', id: 'light_gray_terracotta' },
    { name: '青緑色のテラコッタ', id: 'cyan_terracotta' },
    { name: '紫色のテラコッタ', id: 'purple_terracotta' },
    { name: '青色のテラコッタ', id: 'blue_terracotta' },
    { name: '茶色のテラコッタ', id: 'brown_terracotta' },
    { name: '緑色のテラコッタ', id: 'green_terracotta' },
    { name: '赤色のテラコッタ', id: 'red_terracotta' },
    { name: '黒色のテラコッタ', id: 'black_terracotta' },
    { name: 'テラコッタ', id: 'terracotta' },
  ]
}, {
  name: '羊毛', types: [
    { name: '白色の羊毛', id: 'white_wool' },
    { name: '橙色の羊毛', id: 'orange_wool' },
    { name: '赤紫色の羊毛', id: 'magenta_wool' },
    { name: '空色の羊毛', id: 'light_blue_wool' },
    { name: '黄色の羊毛', id: 'yellow_wool' },
    { name: '黄緑色の羊毛', id: 'lime_wool' },
    { name: '桃色の羊毛', id: 'pink_wool' },
    { name: '灰色の羊毛', id: 'gray_wool' },
    { name: '薄灰色の羊毛', id: 'light_gray_wool' },
    { name: '青緑色の羊毛', id: 'cyan_wool' },
    { name: '紫色の羊毛', id: 'purple_wool' },
    { name: '青色の羊毛', id: 'blue_wool' },
    { name: '茶色の羊毛', id: 'brown_wool' },
    { name: '緑色の羊毛', id: 'green_wool' },
    { name: '赤色の羊毛', id: 'red_wool' },
    { name: '黒色の羊毛', id: 'black_wool' }]
}, {

  name: 'コンクリート', types: [
    { name: '白色のコンクリート', id: 'white_concrete' },
    { name: '橙色のコンクリート', id: 'orange_concrete' },
    { name: '赤紫色のコンクリート', id: 'magenta_concrete' },
    { name: '空色のコンクリート', id: 'light_blue_concrete' },
    { name: '黄色のコンクリート', id: 'yellow_concrete' },
    { name: '黄緑色のコンクリート', id: 'lime_concrete' },
    { name: '桃色のコンクリート', id: 'pink_concrete' },
    { name: '灰色のコンクリート', id: 'gray_concrete' },
    { name: '薄灰色のコンクリート', id: 'light_gray_concrete' },
    { name: '青緑色のコンクリート', id: 'cyan_concrete' },
    { name: '紫色のコンクリート', id: 'purple_concrete' },
    { name: '青色のコンクリート', id: 'blue_concrete' },
    { name: '茶色のコンクリート', id: 'brown_concrete' },
    { name: '緑色のコンクリート', id: 'green_concrete' },
    { name: '赤色のコンクリート', id: 'red_concrete' },
    { name: '黒色のコンクリート', id: 'black_concrete' }]
}, {
  name: 'ガラス', types: [
    { name: '白色のガラス', id: 'white_stained_glass' },
    { name: '橙色のガラス', id: 'orange_stained_glass' },
    { name: '赤紫色のガラス', id: 'magenta_stained_glass' },
    { name: '空色のガラス', id: 'light_blue_stained_glass' },
    { name: '黄色のガラス', id: 'yellow_stained_glass' },
    { name: '黄緑色のガラス', id: 'lime_stained_glass' },
    { name: '桃色のガラス', id: 'pink_stained_glass' },
    { name: '灰色のガラス', id: 'gray_stained_glass' },
    { name: '薄灰色のガラス', id: 'light_gray_stained_glass' },
    { name: '青緑色のガラス', id: 'cyan_stained_glass' },
    { name: '紫色のガラス', id: 'purple_stained_glass' },
    { name: '青色のガラス', id: 'blue_stained_glass' },
    { name: '茶色のガラス', id: 'brown_stained_glass' },
    { name: '緑色のガラス', id: 'green_stained_glass' },
    { name: '赤色のガラス', id: 'red_stained_glass' },
    { name: '黒色のガラス', id: 'black_stained_glass' },
    { name: 'ガラス', id: 'glass' },
  ]
}, {

  name: 'その他', types: [
    { name: '雪ブロック', id: 'snow' },
    { name: 'クォーツブロック', id: 'quartz_block_side' },
    { name: '砂', id: 'sand' },
    { name: '砂岩', id: 'sandstone' },

    // 灰色っぽいブロック

    { name: '石', id: 'stone' },
    { name: '丸石', id: 'cobblestone' },

    // 赤っぽいブロック

    { name: '赤い砂', id: 'red_sand' },
    { name: '赤い砂岩', id: 'red_sandstone' },
    { name: 'レッドストーンブロック', id: 'redstone_block' }],
}];

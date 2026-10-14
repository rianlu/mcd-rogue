export type School = "orb" | "tank" | "spell";
export type SkillId =
  | "orbit"
  | "auto"
  | "follow"
  | "pie"
  | "split"
  | "wing"
  | "bounce"
  | "soda"
  | "ice"
  | "sauce"
  | "spike"
  | "rain"
  | "milk"
  | "coffee"
  | "juice"
  | "tea"
  | "stomp"
  | "stand"
  | "rage"
  | "gen"
  | "drops"
  | "orbDmg"
  | "thick"
  | "armor"
  | "thorn"
  | "cola"
  | "water"
  | "magnet"
  | "swirl";

export type SkillDef = {
  id: SkillId;
  name: string;
  image: string;
  price: number;
  school: School;
  kind: "主动" | "被动";
  effect: string;
  branchA: string;
  branchB: string;
};

export const schoolLabel: Record<School, string> = {
  orb: "法球",
  tank: "肉盾",
  spell: "法术",
};

export const skills: SkillDef[] = [
  { id: "orbit", name: "巨无霸", image: "menu/1100.png", price: 25.5, school: "orb", kind: "主动", effect: "一颗汉堡绕着你转，碰到就打。", branchA: "再加一颗。", branchB: "碰到时再炸开一小圈。" },
  { id: "auto", name: "麦乐鸡", image: "menu/1401.png", price: 14, school: "orb", kind: "主动", effect: "麦乐鸡从天而降，砸向最近的怪。", branchA: "砸得更勤。", branchB: "一次砸两块。" },
  { id: "follow", name: "薯条", image: "menu/4810.png", price: 13.5, school: "orb", kind: "主动", effect: "甩出一把薯条，会拐向最近的怪。", branchA: "再拐向下一只。", branchB: "拐过去时更疼。" },
  { id: "pie", name: "派", image: "menu/9900008752.png", price: 8.5, school: "orb", kind: "主动", effect: "在前方放一块派，怪走进去会掉血。", branchA: "留得更久。", branchB: "范围更大。" },
  { id: "split", name: "板烧鸡腿堡", image: "menu/1406.png", price: 23.5, school: "orb", kind: "主动", effect: "球打中后裂成两颗小板烧。", branchA: "裂成三颗。", branchB: "小板烧还能再裂一次。" },
  { id: "wing", name: "麦辣鸡翅", image: "menu/1700.png", price: 15, school: "orb", kind: "主动", effect: "甩出几只鸡翅，能穿过怪继续飞。", branchA: "一次甩出更多。", branchB: "鸡翅更粗。" },
  { id: "bounce", name: "双层吉士汉堡", image: "menu/1120.png", price: 23, school: "orb", kind: "主动", effect: "球打中后，跳向旁边另一只怪。", branchA: "再跳一只。", branchB: "这一跳同样疼。" },
  { id: "soda", name: "雪碧", image: "menu/3010.png", price: 9.5, school: "spell", kind: "主动", effect: "朝面前喷出一道雪碧。", branchA: "喷得更远。", branchB: "喷得更宽。" },
  { id: "ice", name: "圆筒冰淇淋", image: "menu/515837.png", price: 5, school: "spell", kind: "主动", effect: "推出一圈冰淇淋，碰到的怪变慢。", branchA: "推得更远。", branchB: "脚下留一圈慢地。" },
  { id: "sauce", name: "北美招牌牧场酱", image: "menu/521797.png", price: 3, school: "spell", kind: "主动", effect: "在最近的怪脚下摊一块酱。", branchA: "怪更慢。", branchB: "酱更大。" },
  { id: "spike", name: "日式鲜磨山葵酱", image: "menu/521799.png", price: 3, school: "spell", kind: "主动", effect: "面前扇出一团山葵，怪走进去会变慢。", branchA: "扇得更开。", branchB: "留下一团绿酱。" },
  { id: "rain", name: "“我就喜欢”鸡薯双全盒", image: "menu/9900016076.png", price: 15.9, school: "spell", kind: "主动", effect: "前方下起鸡块和薯条雨。", branchA: "下得更多。", branchB: "落点再停一会儿。" },
  { id: "milk", name: "纯牛奶(盒装)", image: "menu/3755.png", price: 10.5, school: "tank", kind: "主动", effect: "每隔一会儿套上一层护盾。", branchA: "套得更勤。", branchB: "这层盾更厚。" },
  { id: "coffee", name: "浓缩咖啡", image: "menu/507389.png", price: 15, school: "tank", kind: "主动", effect: "挨过打之后，向身边弹开一圈。", branchA: "弹得更疼。", branchB: "圈子更大。" },
  { id: "juice", name: "100% 苹果汁(盒装)", image: "menu/6362.png", price: 11.5, school: "tank", kind: "主动", effect: "血不多时，再掉血会回一口。", branchA: "血量更高时就会回。", branchB: "回得更多。" },
  { id: "tea", name: "锡兰红茶", image: "menu/3505.png", price: 11.5, school: "tank", kind: "主动", effect: "每隔一会儿，短时间少掉血。", branchA: "持续更久。", branchB: "掉得更少。" },
  { id: "stomp", name: "那么大鸡排（椒盐风味）", image: "menu/521156.png", price: 14, school: "tank", kind: "主动", effect: "每隔一会儿踩一圈，把近处的怪推开。", branchA: "推得更远。", branchB: "被踩中的怪停一下。" },
  { id: "stand", name: "燕麦奶", image: "menu/510488.png", price: 21, school: "tank", kind: "主动", effect: "本局第一次要倒下时，会站起来。", branchA: "站起来时血更多。", branchB: "站起来后短时间不再掉血。" },
  { id: "rage", name: "龙焰鸡腿堡", image: "menu/521952.png", price: 24, school: "tank", kind: "主动", effect: "每隔一会儿，血越少打得越疼。", branchA: "持续更久。", branchB: "缺的血换来更多伤害。" },
  { id: "gen", name: "麦辣鸡腿汉堡", image: "menu/1440.png", price: 22.5, school: "spell", kind: "被动", effect: "巨无霸、麦乐鸡和派出现得更勤。", branchA: "", branchB: "" },
  { id: "drops", name: "苹果片", image: "menu/6102.png", price: 7, school: "spell", kind: "被动", effect: "地上更快长出血包和护盾。", branchA: "", branchB: "" },
  { id: "orbDmg", name: "不素之霸双层牛堡", image: "menu/4648.png", price: 26.5, school: "orb", kind: "被动", effect: "球打得更疼。", branchA: "", branchB: "" },
  { id: "thick", name: "【美汁源】“黄金橙橙”", image: "menu/2430.png", price: 13, school: "tank", kind: "被动", effect: "每层护盾都能多挡一些。", branchA: "", branchB: "" },
  { id: "armor", name: "怡泉+C", image: "menu/515520.png", price: 11.5, school: "tank", kind: "被动", effect: "受到的伤害变少。", branchA: "", branchB: "" },
  { id: "thorn", name: "卡布奇诺", image: "menu/507387.png", price: 21, school: "tank", kind: "被动", effect: "贴上来打你的怪会自己掉血。", branchA: "", branchB: "" },
  { id: "cola", name: "可乐", image: "menu/9900008751.png", price: 9.5, school: "tank", kind: "被动", effect: "血量过半以下，跑得更快。", branchA: "", branchB: "" },
  { id: "water", name: "纯悦", image: "menu/3757.png", price: 7.5, school: "tank", kind: "被动", effect: "护盾被打破时回一口血。", branchA: "", branchB: "" },
  { id: "magnet", name: "新地", image: "menu/9900008745.png", price: 12, school: "spell", kind: "被动", effect: "走近就能捡到的范围更大。", branchA: "", branchB: "" },
  { id: "swirl", name: "经典麦旋风", image: "menu/9900008754.png", price: 15.5, school: "spell", kind: "被动", effect: "金币、血包和护盾会自己飘过来。", branchA: "", branchB: "" },
];

export const skillById = Object.fromEntries(skills.map((skill) => [skill.id, skill])) as Record<SkillId, SkillDef>;

export type ComboId = "nugget-meal" | "bigmac-meal" | "grill-meal";

export type ComboDef = {
  id: ComboId;
  name: string;
  image: string;
  price: number;
  grants: [SkillId, SkillId];
};

export const combos: ComboDef[] = [
  { id: "nugget-meal", name: "麦乐鸡套餐", image: "menu/9900004835.png", price: 25, grants: ["auto", "follow"] },
  { id: "bigmac-meal", name: "巨无霸三件套", image: "menu/9900005466.png", price: 36.5, grants: ["orbit", "follow"] },
  { id: "grill-meal", name: "板烧鸡腿堡三件套", image: "menu/9900005462.png", price: 34.5, grants: ["split", "follow"] },
];

export const comboById = Object.fromEntries(combos.map((combo) => [combo.id, combo])) as Record<ComboId, ComboDef>;

export function recyclePrice(price: number, rank: number, branched: boolean) {
  const factor = rank >= 3 ? 0.5 : rank >= 2 || branched ? 0.4 : 0.3;
  return Math.max(1, Math.floor((price * factor) * 2) / 2);
}

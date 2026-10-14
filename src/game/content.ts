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
  | "swirl"
  | "haste"
  | "lock"
  | "twist"
  | "might"
  | "crit"
  | "lemon"
  | "cod"
  | "twin"
  | "ash"
  | "glaze"
  | "cocoa"
  | "hook"
  | "dash"
  | "roll"
  | "brand"
  | "whirl";

export type SkillKind = "技能" | "增益" | "神器";

export const kindLabel: Record<SkillKind, string> = {
  技能: "技能",
  增益: "增益",
  神器: "神器",
};

export type SkillDef = {
  id: SkillId;
  name: string;
  image: string;
  price: number;
  school: School;
  kind: SkillKind;
  effect: string;
  branchA: string;
  branchB: string;
};

export const schoolLabel: Record<School, string> = {
  orb: "法球",
  tank: "肉盾",
  spell: "佐料",
};

export const skills: SkillDef[] = [
  { id: "orbit", name: "巨无霸", image: "menu/1100.png", price: 25.5, school: "orb", kind: "增益", effect: "汉堡一直绕着你转，碰到就打。再买加一颗，三颗时碰到会炸开。", branchA: "", branchB: "" },
  { id: "orbDmg", name: "不素之霸双层牛堡", image: "menu/4648.png", price: 26.5, school: "orb", kind: "增益", effect: "外圈再绕一串更重的球，反着转，碰到更疼。再买加一颗。", branchA: "", branchB: "" },
  { id: "haste", name: "麦咖啡™美式", image: "menu/507411.png", price: 11.9, school: "orb", kind: "增益", effect: "攻速提高，普攻一下接一下。", branchA: "", branchB: "" },
  { id: "might", name: "培根蔬萃双层牛堡", image: "menu/1106.png", price: 24.5, school: "orb", kind: "增益", effect: "培根更厚，打出去的每一口都更重。", branchA: "", branchB: "" },
  { id: "crit", name: "芝士安格斯厚牛堡", image: "menu/511782.png", price: 31.5, school: "orb", kind: "增益", effect: "普攻有机会爆开：那一下双倍，并炸开一小圈。", branchA: "", branchB: "" },
  { id: "lock", name: "麦香鱼", image: "menu/1600.png", price: 22.5, school: "orb", kind: "增益", effect: "普攻变成鱼排，自己游向最近的怪。", branchA: "", branchB: "" },
  { id: "twin", name: "高达吉士双牛堡", image: "menu/521316.png", price: 22.5, school: "orb", kind: "增益", effect: "双层牛堡，普攻一下打出好几下。", branchA: "", branchB: "" },
  { id: "cod", name: "双层深海鳕鱼堡", image: "menu/9900003586.png", price: 24, school: "orb", kind: "增益", effect: "普攻变成鱼排，能滑过前面的怪。", branchA: "", branchB: "" },
  { id: "lemon", name: "阳光柠檬红茶", image: "menu/515280.png", price: 9.5, school: "tank", kind: "增益", effect: "柠檬茶提神，跑得更快。", branchA: "", branchB: "" },
  { id: "cola", name: "可乐", image: "menu/9900008751.png", price: 9.5, school: "tank", kind: "增益", effect: "血量掉到一半以下，跑得更快。", branchA: "", branchB: "" },
  { id: "cocoa", name: "浓浓黑巧（冰/热）", image: "menu/515946.png", price: 13.9, school: "tank", kind: "增益", effect: "喝下去更扛打，还会慢慢暖回来一点血。", branchA: "", branchB: "" },
  { id: "ash", name: "灰焰圆筒", image: "menu/521951.png", price: 5, school: "spell", kind: "增益", effect: "普攻变成火弹，打中后还会烧一会儿。", branchA: "", branchB: "" },
  { id: "glaze", name: "韩式烟熏芝士风味酱", image: "menu/521966.png", price: 3, school: "spell", kind: "增益", effect: "普攻变成毒酱弹，打中变慢，并持续中毒。", branchA: "", branchB: "" },
  { id: "auto", name: "麦乐鸡", image: "menu/1401.png", price: 14, school: "orb", kind: "技能", effect: "捡到后从天上砸向最近的怪，落地炸开一圈。", branchA: "一次砸三块。", branchB: "这一下更疼。" },
  { id: "follow", name: "薯条", image: "menu/4810.png", price: 13.5, school: "orb", kind: "技能", effect: "捡到后朝最近的怪扇出一排薯条，打中的怪变慢。", branchA: "扇得更开。", branchB: "打中的怪会停一下。" },
  { id: "pie", name: "派", image: "menu/9900008752.png", price: 8.5, school: "orb", kind: "技能", effect: "捡到后在前方铺一块区域，站进去的怪持续掉血。", branchA: "留得更久。", branchB: "铺得更大。" },
  { id: "wing", name: "麦辣鸡翅", image: "menu/1700.png", price: 15, school: "orb", kind: "技能", effect: "捡到后朝最近的怪飞出鸡翅，再飞回来，来回都打。", branchA: "一次甩出更多。", branchB: "鸡翅更粗。" },
  { id: "soda", name: "雪碧", image: "menu/3010.png", price: 9.5, school: "spell", kind: "技能", effect: "捡到后朝最近的怪喷出一条直线，穿过路上的怪。", branchA: "喷得更快。", branchB: "并排喷出三道。" },
  { id: "ice", name: "圆筒冰淇淋", image: "menu/515837.png", price: 5, school: "spell", kind: "技能", effect: "捡到后冻住身边的怪，它们走不动。", branchA: "冻住更大一圈。", branchB: "脚下留一圈冰。" },
  { id: "sauce", name: "北美招牌牧场酱", image: "menu/521797.png", price: 3, school: "spell", kind: "技能", effect: "捡到后在怪脚下铺一块泥潭，走不快。", branchA: "怪更慢。", branchB: "酱更大。" },
  { id: "spike", name: "日式鲜磨山葵酱", image: "menu/521799.png", price: 3, school: "spell", kind: "技能", effect: "捡到后朝最近的怪挥出扇形，打在外圈更疼。", branchA: "扇得更开。", branchB: "外圈打中会停更久。" },
  { id: "rain", name: "“我就喜欢”鸡薯双全盒", image: "menu/9900016076.png", price: 15.9, school: "spell", kind: "技能", effect: "捡到后朝最近的怪打下一条弹幕。", branchA: "落得更多。", branchB: "落点再停一会儿。" },
  { id: "milk", name: "纯牛奶(盒装)", image: "menu/3755.png", price: 10.5, school: "tank", kind: "技能", effect: "捡到后套上一层厚护盾，挡住的一下会亮出来。", branchA: "同时回一口血。", branchB: "这层盾更厚。" },
  { id: "coffee", name: "浓缩咖啡", image: "menu/507389.png", price: 15, school: "tank", kind: "技能", effect: "捡到后朝最近的怪喷出热咖啡，烫到的会继续烧，你自己也手快一会儿。", branchA: "手快得更久，咖啡更烫。", branchB: "并排喷出三道。" },
  { id: "tea", name: "锡兰红茶", image: "menu/3505.png", price: 11.5, school: "tank", kind: "技能", effect: "捡到后慢慢回血，像喝着热茶。", branchA: "喝得更久。", branchB: "每一口回得更多。" },
  { id: "stomp", name: "那么大鸡排（椒盐风味）", image: "menu/521156.png", price: 14, school: "tank", kind: "技能", effect: "捡到后砸在地上，近处的怪被击飞。", branchA: "推得更远。", branchB: "停得更久。" },
  { id: "rage", name: "龙焰鸡腿堡", image: "menu/521952.png", price: 24, school: "tank", kind: "技能", effect: "捡到后进入狂暴：攻得更快，血越少砍得越疼。", branchA: "持续更久。", branchB: "缺的血换来更多伤害。" },
  { id: "hook", name: "马苏里拉拉丝芝士条", image: "menu/521986.png", price: 11, school: "spell", kind: "技能", effect: "捡到后朝最近的怪射出钩子，慢慢拉到身边。", branchA: "拉得更远。", branchB: "拉过来后停更久。" },
  { id: "dash", name: "咖啡阿芙佳朵", image: "menu/514851.png", price: 15, school: "tank", kind: "技能", effect: "捡到后朝最近的怪冲锋，撞飞路上的怪。", branchA: "冲得更远。", branchB: "撞到的怪会停一下。" },
  { id: "roll", name: "黑洋酥小圆子风味派", image: "menu/521908.png", price: 5, school: "orb", kind: "技能", effect: "捡到后朝最近的怪扔出一块会弹的派，撞墙就拐弯。", branchA: "拐更多次。", branchB: "滚得更疼。" },
  { id: "brand", name: "龙焰芝士棒鸡腿堡", image: "menu/521953.png", price: 27, school: "tank", kind: "技能", effect: "捡到后标记一只怪，之后打它更疼。", branchA: "多标记一只，并持续更久。", branchB: "标记期间疼得更多。" },
  { id: "whirl", name: "蓝莓爆爆珠麦旋风", image: "menu/521950.png", price: 16.5, school: "spell", kind: "技能", effect: "捡到后原地转成旋风，把周围的怪吸进来。", branchA: "吸得更远。", branchB: "转得更久。" },
  { id: "split", name: "板烧鸡腿堡", image: "menu/1406.png", price: 23.5, school: "orb", kind: "神器", effect: "打中会溅出酱汁，旁边的怪也挨一下。", branchA: "", branchB: "" },
  { id: "bounce", name: "双层吉士汉堡", image: "menu/1120.png", price: 23, school: "orb", kind: "神器", effect: "芝士会拉丝，打中后再粘到旁边一只怪。", branchA: "", branchB: "" },
  { id: "twist", name: "月下相思扭扭薯", image: "menu/521901.png", price: 15, school: "orb", kind: "神器", effect: "扭扭薯打出去的东西撞到墙会拐弯。", branchA: "", branchB: "" },
  { id: "stand", name: "燕麦奶", image: "menu/510488.png", price: 21, school: "tank", kind: "神器", effect: "本局第一次倒下时，喝一口燕麦奶缓过来。", branchA: "", branchB: "" },
  { id: "juice", name: "100% 苹果汁(盒装)", image: "menu/6362.png", price: 11.5, school: "tank", kind: "神器", effect: "血少的时候挨打，会回一口。", branchA: "", branchB: "" },
  { id: "thorn", name: "卡布奇诺", image: "menu/507387.png", price: 21, school: "tank", kind: "神器", effect: "怪贴上来时被热奶泡烫到，还会变慢。", branchA: "", branchB: "" },
  { id: "armor", name: "怡泉+C", image: "menu/515520.png", price: 11.5, school: "tank", kind: "神器", effect: "挨打时汽水泡泡炸开，把身边的怪推开。", branchA: "", branchB: "" },
  { id: "thick", name: "【美汁源】“黄金橙橙”", image: "menu/2430.png", price: 13, school: "tank", kind: "神器", effect: "橙汁更浓，护盾能多挡一些。", branchA: "", branchB: "" },
  { id: "water", name: "纯悦", image: "menu/3757.png", price: 7.5, school: "tank", kind: "神器", effect: "护盾碎掉时，纯悦冲一下，回一口血。", branchA: "", branchB: "" },
  { id: "magnet", name: "新地", image: "menu/9900008745.png", price: 12, school: "spell", kind: "神器", effect: "新地很黏，靠近你的怪走得慢。", branchA: "", branchB: "" },
  { id: "swirl", name: "经典麦旋风", image: "menu/9900008754.png", price: 15.5, school: "spell", kind: "神器", effect: "附近的金币、血包、护盾和技能会飘过来。", branchA: "", branchB: "" },
  { id: "gen", name: "麦辣鸡腿汉堡", image: "menu/1440.png", price: 22.5, school: "spell", kind: "神器", effect: "普攻变成辣油弹，打中的怪会继续辣。", branchA: "", branchB: "" },
  { id: "drops", name: "苹果片", image: "menu/6102.png", price: 7, school: "spell", kind: "神器", effect: "苹果片掉得更勤，地上更快出现补给和技能。", branchA: "", branchB: "" },
];

export const skillById = Object.fromEntries(skills.map((skill) => [skill.id, skill])) as Record<SkillId, SkillDef>;

export type ComboId =
  | "nugget-meal"
  | "bigmac-meal"
  | "grill-meal"
  | "spicy-meal"
  | "fish-meal"
  | "cheese-meal"
  | "cod-meal"
  | "bacon-meal"
  | "double-meal"
  | "flame-meal"
  | "flame-cheese-meal"
  | "angus-meal";

export type ComboDef = {
  id: ComboId;
  name: string;
  image: string;
  price: number;
  grants: [SkillId, SkillId, SkillId];
};

export const combos: ComboDef[] = [
  { id: "nugget-meal", name: "麦乐鸡套餐", image: "menu/9900004835.png", price: 25, grants: ["auto", "follow", "cola"] },
  { id: "bigmac-meal", name: "巨无霸三件套", image: "menu/9900005466.png", price: 36.5, grants: ["orbit", "follow", "cola"] },
  { id: "grill-meal", name: "板烧鸡腿堡三件套", image: "menu/9900005462.png", price: 34.5, grants: ["split", "follow", "cola"] },
  { id: "spicy-meal", name: "麦辣鸡腿汉堡三件套", image: "menu/9900005456.png", price: 33.5, grants: ["gen", "follow", "cola"] },
  { id: "fish-meal", name: "麦香鱼套餐", image: "menu/9900005460.png", price: 33.5, grants: ["lock", "follow", "cola"] },
  { id: "cheese-meal", name: "双层吉士汉堡套餐", image: "menu/9900005464.png", price: 34, grants: ["bounce", "follow", "cola"] },
  { id: "cod-meal", name: "双层深海鳕鱼堡三件套", image: "menu/9900005413.png", price: 35, grants: ["cod", "follow", "cola"] },
  { id: "bacon-meal", name: "培根蔬萃双层牛堡三件套", image: "menu/9900005468.png", price: 35.5, grants: ["might", "follow", "cola"] },
  { id: "double-meal", name: "不素之霸双层牛堡三件套", image: "menu/9900005411.png", price: 37.5, grants: ["orbDmg", "follow", "cola"] },
  { id: "flame-meal", name: "龙焰鸡腿堡三件套", image: "menu/9900016073.png", price: 26.9, grants: ["rage", "follow", "cola"] },
  { id: "flame-cheese-meal", name: "龙焰芝士棒鸡腿堡三件套", image: "menu/9900016075.png", price: 29.9, grants: ["brand", "follow", "cola"] },
  { id: "angus-meal", name: "芝士安格斯厚牛堡三件套", image: "menu/9900005430.png", price: 42.5, grants: ["crit", "follow", "cola"] },
];

export const comboById = Object.fromEntries(combos.map((combo) => [combo.id, combo])) as Record<ComboId, ComboDef>;

export function pickCombos(count = 3) {
  const pool = [...combos].sort(() => Math.random() - 0.5);
  const picked: ComboDef[] = [];
  const seen = new Set<string>();
  for (const combo of pool) {
    const kind = skillById[combo.grants[0]].kind;
    if (seen.has(kind)) continue;
    picked.push(combo);
    seen.add(kind);
    if (picked.length >= count) return picked.map((combo) => combo.id);
  }
  for (const combo of pool) {
    if (picked.includes(combo)) continue;
    picked.push(combo);
    if (picked.length >= count) break;
  }
  return picked.map((combo) => combo.id);
}

export function recyclePrice(price: number, rank: number, branched: boolean) {
  const factor = rank >= 3 ? 0.5 : rank >= 2 || branched ? 0.4 : 0.3;
  return Math.max(1, Math.floor((price * factor) * 2) / 2);
}

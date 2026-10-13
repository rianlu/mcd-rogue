export type School = "orb" | "tank" | "spell";
export type SkillId =
  | "orbit"
  | "auto"
  | "follow"
  | "pie"
  | "split"
  | "soda"
  | "ice"
  | "milk"
  | "coffee"
  | "juice"
  | "tea"
  | "gen"
  | "drops";

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
  { id: "orbit", name: "巨无霸", image: "menu/1100.png", price: 25.5, school: "orb", kind: "主动", effect: "一颗球绕着角色转，碰到怪造成 8 点。", branchA: "再加一颗绕行的球。", branchB: "碰到时爆开一小圈。" },
  { id: "auto", name: "麦乐鸡", image: "menu/1401.png", price: 14, school: "orb", kind: "主动", effect: "约每 1.4 秒朝最近的怪射一颗球。", branchA: "间隔改成约 0.9 秒。", branchB: "一次射两颗，左右岔开。" },
  { id: "follow", name: "薯条", image: "menu/4810.png", price: 13.5, school: "orb", kind: "主动", effect: "普攻先飞向最近的球，再弹向怪。", branchA: "弹完再弹一只怪。", branchB: "弹射这段伤害 +6。" },
  { id: "pie", name: "派", image: "menu/9900008752.png", price: 8.5, school: "orb", kind: "主动", effect: "在前方丢一颗停住的球，走进去的怪持续掉血。", branchA: "停留改成 4 秒。", branchB: "半径更大。" },
  { id: "split", name: "板烧鸡腿堡", image: "menu/1406.png", price: 23.5, school: "orb", kind: "主动", effect: "球第一次命中后裂成两颗小球。", branchA: "裂成三颗。", branchB: "小球还能再裂一次。" },
  { id: "soda", name: "雪碧", image: "menu/3010.png", price: 9.5, school: "spell", kind: "主动", effect: "身前喷一条直线汽水。", branchA: "喷得更长。", branchB: "喷得更宽。" },
  { id: "ice", name: "圆筒冰淇淋", image: "menu/515837.png", price: 5, school: "spell", kind: "主动", effect: "一圈冰推开，碰到的怪变慢。", branchA: "推得更远。", branchB: "留下一圈减速地面。" },
  { id: "milk", name: "纯牛奶(盒装)", image: "menu/3755.png", price: 10.5, school: "tank", kind: "主动", effect: "每隔一段时间套一层护盾。", branchA: "间隔改成约 5 秒。", branchB: "这层盾吸收更多。" },
  { id: "coffee", name: "浓缩咖啡", image: "menu/507389.png", price: 15, school: "tank", kind: "主动", effect: "挨打之后向身边弹一圈。", branchA: "弹得更疼。", branchB: "圈子更大。" },
  { id: "juice", name: "100% 苹果汁(盒装)", image: "menu/6362.png", price: 11.5, school: "tank", kind: "主动", effect: "生命低于一半时，掉血会回一口。", branchA: "触发线改成 65%。", branchB: "回复更多。" },
  { id: "tea", name: "锡兰红茶", image: "menu/3505.png", price: 11.5, school: "tank", kind: "主动", effect: "短时间里受到的伤害变成一半。", branchA: "持续更久。", branchB: "减伤更高。" },
  { id: "gen", name: "麦辣鸡腿汉堡", image: "menu/1440.png", price: 22.5, school: "spell", kind: "被动", effect: "环绕、自动和驻留出现得更勤。", branchA: "", branchB: "" },
  { id: "drops", name: "苹果片", image: "menu/6102.png", price: 7, school: "spell", kind: "被动", effect: "战场上更快长出血包、护盾和技能。", branchA: "", branchB: "" },
];

export const skillById = Object.fromEntries(skills.map((skill) => [skill.id, skill])) as Record<SkillId, SkillDef>;

export function recyclePrice(price: number, rank: number, branched: boolean) {
  const factor = rank >= 3 ? 0.5 : rank >= 2 || branched ? 0.4 : 0.3;
  return Math.max(1, Math.floor((price * factor) * 2) / 2);
}

import { stackedBonus } from "./balance";
import { cards, type MenuCard } from "./catalog";

export type School = "attack" | "spell" | "tank";
export type TalentId = "heavy" | "pierce" | "split" | "leech" | "vitality" | "aegis" | "guard" | "thorns";
export type SpellId = "burger" | "fries" | "nugget" | "pie" | "cola";
export type Branch = "a" | "b";

export type Offer =
  | { kind: "spell"; spell: SpellId; card: MenuCard }
  | { kind: "branch"; spell: SpellId; branch: Branch; card: MenuCard }
  | { kind: "talent"; talent: TalentId; card: MenuCard };

const talentInfo: Record<TalentId, { school: School; max: number }> = {
  heavy: { school: "attack", max: 8 },
  pierce: { school: "attack", max: 3 },
  split: { school: "attack", max: 3 },
  leech: { school: "attack", max: 3 },
  vitality: { school: "tank", max: 6 },
  aegis: { school: "tank", max: 3 },
  guard: { school: "tank", max: 3 },
  thorns: { school: "tank", max: 3 },
};

export const schoolName: Record<School, string> = {
  attack: "攻击",
  spell: "法术",
  tank: "肉盾",
};

export function schoolChrome(school: School): { fill: number; text: string } {
  if (school === "attack") return { fill: 0xdb0007, text: "#ffffff" };
  if (school === "spell") return { fill: 0xffbc0d, text: "#000000" };
  return { fill: 0x2d2d2d, text: "#ffffff" };
}

export function emptyRanks(): Record<TalentId, number> {
  return { heavy: 0, pierce: 0, split: 0, leech: 0, vitality: 0, aegis: 0, guard: 0, thorns: 0 };
}

export function hpGain(price: number) {
  if (price <= 12) return 12;
  if (price <= 25) return 20;
  return 32;
}

export const spells: Record<
  SpellId,
  { name: string; school: School; match: RegExp; cast: string; branches: Record<Branch, string> }
> = {
  burger: {
    name: "堡击",
    school: "attack",
    match: /堡|饭|卷|麦满分|猪柳|安格斯/,
    cast: "每隔一会掷出一只慢速大堡，伤害高。",
    branches: { a: "再掷一只", b: "这一击更重" },
  },
  fries: {
    name: "薯雨",
    school: "spell",
    match: /薯/,
    cast: "朝前方撒出一串细薯条，每根伤害低。",
    branches: { a: "扇面更宽", b: "薯条落地留下黏酱" },
  },
  nugget: {
    name: "鸡块环",
    school: "spell",
    match: /麦乐鸡|鸡块|翅/,
    cast: "鸡块绕着角色转，碰到敌人就掉血。",
    branches: { a: "再多一颗", b: "碰到时爆开一小圈" },
  },
  pie: {
    name: "派雷",
    school: "spell",
    match: /派|蛋挞/,
    cast: "在最近的敌人脚下砸一个圈，稍后再炸开。",
    branches: { a: "连续砸两下", b: "圈子更大" },
  },
  cola: {
    name: "可乐渍",
    school: "spell",
    match: /可乐|雪碧|汁|茶|咖啡|奶|水/,
    cast: "在敌人脚下留下一块渍，站在里面会变慢。",
    branches: { a: "渍停留更久", b: "渍的范围更大" },
  },
};

const talentName: Record<TalentId, string> = {
  heavy: "重击",
  pierce: "穿透",
  split: "分裂",
  leech: "吸血",
  vitality: "加血",
  aegis: "护盾",
  guard: "硬皮",
  thorns: "反震",
};

const talentText: Record<TalentId, string> = {
  heavy: "普通子弹伤害提高。菜单价越高，加得越多。",
  pierce: "普通子弹可以再穿过 1 个敌人。",
  split: "普通射击同一轮多打出 1 发。",
  leech: "普通子弹每次命中回复生命。",
  vitality: "生命上限提高，并立刻回复同样的量。",
  aegis: "立刻获得护盾，之后的护盾更厚。",
  guard: "受到的伤害降低 15%，可以叠层。",
  thorns: "受伤时，身边敌人被震一下并掉血。",
};

function examples(match: RegExp) {
  const names = cards.filter((card) => match.test(card.name)).slice(0, 4).map((card) => card.name);
  return names.length > 0 ? names.join("、") : "当前菜单里的对应餐品";
}

function pickFood(pool: MenuCard[], match: RegExp) {
  const found = pool.filter((card) => match.test(card.name));
  const source = found.length > 0 ? found : pool;
  return source[Math.floor(Math.random() * source.length)];
}

export function effectText(offer: Offer, ranks: Record<TalentId, number>) {
  if (offer.kind === "spell") return `${spells[offer.spell].name}  ${spells[offer.spell].cast}`;
  if (offer.kind === "branch") return `${spells[offer.spell].name}·${spells[offer.spell].branches[offer.branch]}`;
  if (offer.talent === "heavy") {
    return `重击  伤害 +${stackedBonus(offer.card.price, "damage", ranks.heavy + 1, false)}`;
  }
  if (offer.talent === "vitality") return `加血  上限 +${hpGain(offer.card.price)}`;
  return talentText[offer.talent];
}

export function offerTitle(offer: Offer) {
  if (offer.kind === "spell") return `法术 · ${spells[offer.spell].name}`;
  if (offer.kind === "branch") return `分支 · ${spells[offer.spell].name}`;
  return `天赋 · ${talentName[offer.talent]}`;
}

export function offerChrome(offer: Offer) {
  if (offer.kind === "spell") return { fill: 0xffbc0d, text: "#000000" };
  if (offer.kind === "branch") return { fill: 0xdb0007, text: "#ffffff" };
  return schoolChrome(talentInfo[offer.talent].school);
}

export function handbook() {
  const spellRows = (Object.keys(spells) as SpellId[]).map((spell) => ({
    tone: "spell" as const,
    title: spells[spell].name,
    tag: "法术",
    products: examples(spells[spell].match),
    detail: `${spells[spell].cast} 分支：${spells[spell].branches.a}，或 ${spells[spell].branches.b}。`,
  }));
  const talentRows = (Object.keys(talentInfo) as TalentId[]).map((talent) => ({
    tone: talentInfo[talent].school,
    title: talentName[talent],
    tag: `天赋 · ${schoolName[talentInfo[talent].school]}`,
    products: "不绑定某一种餐，升级时随机配一张图。",
    detail: talentText[talent],
  }));
  return { spells: spellRows, talents: talentRows };
}

function shuffle<T>(list: T[]) {
  const copy = [...list];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    const current = copy[index];
    copy[index] = copy[swap];
    copy[swap] = current;
  }
  return copy;
}

export function dealOffers(
  pool: MenuCard[],
  ranks: Record<TalentId, number>,
  owned: Record<SpellId, number>,
  taken: Record<SpellId, Branch | "">,
): Offer[] {
  const offers: Offer[] = [];
  for (const spell of Object.keys(spells) as SpellId[]) {
    if (owned[spell] === 0) offers.push({ kind: "spell", spell, card: pickFood(pool, spells[spell].match) });
    else if (taken[spell] === "") {
      const branch: Branch = Math.random() < 0.5 ? "a" : "b";
      offers.push({ kind: "branch", spell, branch, card: pickFood(pool, spells[spell].match) });
    }
  }
  for (const talent of Object.keys(talentInfo) as TalentId[]) {
    if (ranks[talent] < talentInfo[talent].max) {
      offers.push({ kind: "talent", talent, card: pool[Math.floor(Math.random() * pool.length)] });
    }
  }
  return shuffle(offers).slice(0, 3);
}

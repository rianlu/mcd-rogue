import menuData from "./data/menu.json";
import { stackedBonus } from "./balance";

export type Lane = "main" | "side" | "drink" | "other";

export type MenuCard = {
  code: string;
  name: string;
  price: number;
  image: string;
  lane: Lane;
};

const rules: Array<[Lane, RegExp]> = [
  ["main", /堡|卷|饭|粥|麦满分|鸡腿|板烧|猪柳|安格斯/],
  ["side", /薯|翅|块|派|玉米|蛋挞|麦乐鸡|鸡块|洋葱/],
  ["drink", /可乐|咖啡|茶|汁|奶|水|雪碧|优品|圆筒|圣代|奶昔/],
];

export const storeName = menuData.storeName;

function laneOf(name: string): Lane {
  return rules.find(([, pattern]) => pattern.test(name))?.[0] ?? "other";
}

export const cards: MenuCard[] = menuData.cards.map((card) => ({
  code: card.code,
  name: card.name,
  price: card.price,
  image: card.image,
  lane: laneOf(card.name),
}));

export function offerPool(): MenuCard[] {
  const picked: MenuCard[] = [];
  for (const lane of ["main", "side", "drink"] as const) {
    picked.push(...cards.filter((card) => card.lane === lane).slice(0, 8));
  }
  return picked;
}

export function dealThree(pool: MenuCard[], layers: Record<Lane, number>): MenuCard[] {
  const hand: MenuCard[] = [];
  for (const lane of ["main", "side", "drink"] as const) {
    const options = pool.filter((card) => card.lane === lane && layers[lane] < 8);
    if (options.length > 0) hand.push(options[Math.floor(Math.random() * options.length)]);
  }
  const rest = pool.filter((card) => !hand.includes(card));
  while (hand.length < 3 && rest.length > 0) {
    hand.push(rest.splice(Math.floor(Math.random() * rest.length), 1)[0]);
  }
  return hand.slice(0, 3);
}

export function bonusLabel(card: MenuCard, layer: number): string {
  if (card.lane === "drink") return "攻击间隔 ×0.90";
  if (card.lane === "side") return `范围 +${stackedBonus(card.price, "radius", layer, false)}`;
  return `伤害 +${stackedBonus(card.price, "damage", layer, card.lane === "other")}`;
}

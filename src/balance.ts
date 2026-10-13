export const world = {
  width: 960,
  height: 540,
  playerSpeed: 200,
  pickupRadius: 56,
  iframe: 0.45,
  maxHp: 100,
  baseDamage: 8,
  baseInterval: 0.42,
  minInterval: 0.18,
  maxVolley: 4,
  baseRadius: 6,
  maxRadius: 72,
  shieldAbsorb: 24,
  healAmount: 30,
  maxOnScreen: 16,
};

export function tierBonus(price: number, kind: "damage" | "radius"): number {
  if (kind === "damage") {
    if (price <= 12) return 3;
    if (price <= 25) return 5;
    return 8;
  }
  if (price <= 12) return 8;
  if (price <= 25) return 12;
  return 18;
}

export function stackedBonus(price: number, kind: "damage" | "radius", layer: number, unclassified: boolean): number {
  const raw = tierBonus(unclassified ? 20 : price, kind);
  const halved = layer >= 5 ? Math.floor(raw / 2) : raw;
  return unclassified ? Math.floor(halved / 2) : halved;
}

export function attackInterval(drinkLayers: number): number {
  return Math.max(world.minInterval, world.baseInterval * 0.9 ** drinkLayers);
}

export function xpToNext(level: number): number {
  return 12 + 6 * (level - 1);
}

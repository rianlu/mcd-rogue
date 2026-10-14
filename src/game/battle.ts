import { Sfx } from "../sfx";
import { prefs } from "../settings";
import { comboById, pickCombos, recyclePrice, skillById, skills, type ComboId, type SkillId } from "./content";
import mapLayout from "./map-layout.json";

type MapObstacle = { file: string; x: number; y: number; w: number; h: number };
type MapDef = { stage: number; background: string; obstacles: MapObstacle[] };
const stageMaps = (mapLayout as { maps: MapDef[] }).maps;

export type SlotState = { id: SkillId; rank: number; branch: "a" | "b" | null };

export type Hud = {
  hp: number;
  maxHp: number;
  shield: number;
  gold: number;
  wave: number;
  scene: 1 | 2;
  slots: Array<SlotState | null>;
  relics: SlotState[];
  offers: SkillId[];
  refreshes: number;
  refreshCost: number;
  pending: SkillId | null;
  over: "" | "dead" | "clear";
  banner: string;
};

type Rect = { x: number; y: number; w: number; h: number };
type Enemy = {
  id: number;
  x: number;
  y: number;
  r: number;
  hp: number;
  max: number;
  kind: "walker" | "turret" | "boss";
  elite: boolean;
  trick: "split" | "boom" | "burst" | "dash" | "nova" | "bomb" | null;
  minion: boolean;
  cd: number;
  slow: number;
  flash: number;
  orbCd: number;
  skillCd: number;
  dashLeft: number;
  dashAngle: number;
  pace: number;
  steer: number;
  root: number;
  burn: number;
  burnDmg: number;
  burnTick: number;
  poison: number;
  poisonDmg: number;
  poisonTick: number;
  mark: number;
  haul: number;
  hx: number;
  hy: number;
  hasWay: boolean;
  wayX: number;
  wayY: number;
};
type Shot = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  dmg: number;
  life: number;
  good: boolean;
  pierce: number;
  hit: Set<number>;
  kind: "basic" | "orb" | "soda";
  splitGen: number;
  homing: number;
  icon?: string;
  jump?: number;
  chill?: boolean;
  wall?: number;
  flown?: number;
  back?: boolean;
  pull?: number;
  snare?: number;
  fx?: "fries" | "wasabi" | "nugget" | "patty" | "wing" | "double" | "fillet" | "cheese" | "steam";
  fish?: boolean;
  flame?: boolean;
  chili?: boolean;
  venom?: boolean;
  foe?: "cup" | "fan" | "boss";
};
type Zone = { x: number; y: number; r: number; life: number; span: number; tick: number; dmg: number; slow: boolean; once?: boolean; icon?: string; aim?: number; fan?: number; pull?: boolean; follow?: boolean; fx?: "ice" | "frost" | "sauce" | "pie" | "rain" | "wasabi" | "coffee" | "slam" | "paste" | "whirl" | "pop" };
type Bomb = { x: number; y: number; fuse: number; r: number; dmg: number };
type Drop = { x: number; y: number; kind: "gold" | "heal" | "shield" | "spell"; amount: number; skill?: SkillId };
type Floater = { x: number; y: number; text: string; life: number; color: string; size: number };
type Bit = { x: number; y: number; vx: number; vy: number; life: number; color: string; size: number; shape?: "dot" | "dash" | "chunk"; rot?: number };

const W = 960;
const H = 540;
const waves: Array<{ normal: number; elite: number; boss: number }> = [
  { normal: 8, elite: 0, boss: 0 },
  { normal: 10, elite: 0, boss: 0 },
  { normal: 10, elite: 2, boss: 0 },
  { normal: 12, elite: 2, boss: 0 },
  { normal: 8, elite: 0, boss: 1 },
  { normal: 14, elite: 2, boss: 0 },
  { normal: 14, elite: 3, boss: 0 },
  { normal: 16, elite: 3, boss: 0 },
  { normal: 16, elite: 4, boss: 0 },
  { normal: 0, elite: 0, boss: 1 },
];

const pictures = new Map<string, HTMLImageElement>();

function picture(src: string) {
  let image = pictures.get(src);
  if (!image) {
    image = new Image();
    image.src = src;
    pictures.set(src, image);
  }
  return image.complete && image.naturalWidth > 0 ? image : null;
}

const cutouts = new Map<string, HTMLCanvasElement>();

function cutout(src: string) {
  const image = picture(src);
  if (!image) return null;
  const cached = cutouts.get(src);
  if (cached) return cached;
  const temp = document.createElement("canvas");
  temp.width = image.naturalWidth;
  temp.height = image.naturalHeight;
  const context = temp.getContext("2d");
  if (!context) return null;
  context.drawImage(image, 0, 0);
  const pixels = context.getImageData(0, 0, temp.width, temp.height).data;
  let minX = temp.width;
  let minY = temp.height;
  let maxX = 0;
  let maxY = 0;
  for (let y = 0; y < temp.height; y += 1) {
    for (let x = 0; x < temp.width; x += 1) {
      if (pixels[(y * temp.width + x) * 4 + 3] <= 16) continue;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
  const canvas = document.createElement("canvas");
  if (maxX < minX) {
    canvas.width = temp.width;
    canvas.height = temp.height;
    canvas.getContext("2d")?.drawImage(temp, 0, 0);
  } else {
    canvas.width = Math.max(1, maxX - minX + 1);
    canvas.height = Math.max(1, maxY - minY + 1);
    canvas.getContext("2d")?.drawImage(temp, minX, minY, canvas.width, canvas.height, 0, 0, canvas.width, canvas.height);
  }
  cutouts.set(src, canvas);
  return canvas;
}

function paintFx(ctx: CanvasRenderingContext2D, file: string, x: number, y: number, w: number, h: number, rot = 0) {
  const image = picture(file);
  if (!image) return false;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.drawImage(image, -w / 2, -h / 2, w, h);
  ctx.restore();
  return true;
}

function drawStamp(ctx: CanvasRenderingContext2D, src: string, x: number, y: number, size: number) {
  const image = cutout(src);
  if (!image) return;
  const scale = Math.min(size / image.width, size / image.height);
  const w = image.width * scale;
  const h = image.height * scale;
  ctx.drawImage(image, x - w / 2, y - h / 2, w, h);
}

export class Battle {
  paused = true;
  private speed: 1 | 2 | 3 = 1;
  private charge: { x: number; y: number; sx: number; sy: number; left: number; span: number; hit: Set<number>; dmg: number; root: number } | null = null;
  onShop: (() => void) | null = null;
  onPending: (() => void) | null = null;
  onDead: (() => void) | null = null;
  onChange: (() => void) | null = null;

  hp = 100;
  maxHp = 100;
  shield = 0;
  private shieldMax = 0;
  private shieldFlash = 0;
  gold = 0;
  wave = 1;
  scene: 1 | 2 = 1;
  slots: Array<SlotState | null> = Array.from({ length: 8 }, () => null);
  relics: SlotState[] = [];
  offers: SkillId[] = [];
  meals: ComboId[] = pickCombos();
  refreshes = 0;
  pending: SkillId | null = null;
  over: Hud["over"] = "";
  banner = "第 1 关";

  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private sfx = new Sfx();
  private running = false;
  private last = 0;
  private keys = new Set<string>();
  private stickX = 0;
  private stickY = 0;
  private stickOn = false;
  private px = 280;
  private py = 340;
  private camX = W / 2;
  private camY = H / 2;
  private face = 0;
  private shotCd = 0.8;
  private hurtCd = 0;
  private hurting = false;
  private iframe = 0;
  private shake = 0;
  private juicePool = 0;
  private juiceCd = 0;
  private teaLeft = 0;
  private teaTick = 0;
  private coffeeLeft = 0;
  private cocoaCd = 0;
  private rageLeft = 0;
  private stood = false;
  private pops: Array<{ x: number; y: number; life: number }> = [];
  private spawnCd = 0.4;
  private leftNormal = 8;
  private leftElite = 0;
  private leftBoss = 0;
  private fieldCd = 16;
  private nextId = 1;
  private enemies: Enemy[] = [];
  private shots: Shot[] = [];
  private zones: Zone[] = [];
  private drops: Drop[] = [];
  private bombs: Bomb[] = [];
  private floaters: Floater[] = [];
  private bits: Bit[] = [];
  private orbitAngle = 0;
  private blocks: Rect[] = [];
  private mapStage = 1;
  private endless = false;
  private endlessWave = 0;
  private clearing = false;
  private sweepLeft = 0;
  private eliteCursor = 0;
  private bossCursor = 0;
  private images = new Map<string, HTMLImageElement>();

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas");
    this.ctx = ctx;
    this.bindKeys();
    this.useMap(1);
    this.resize();
    window.addEventListener("resize", this.resize);
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    const loop = (now: number) => {
      if (!this.running) return;
      const frame = Math.min(0.033, (now - this.last) / 1000);
      this.last = now;
      this.resize();
      if (!this.paused && !this.over) {
        for (let step = 0; step < this.speed; step += 1) this.update(frame);
      }
      this.draw();
      this.onChange?.();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  stop() {
    this.running = false;
    window.removeEventListener("resize", this.resize);
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
  }

  setStick(x: number, y: number, on: boolean) {
    this.stickX = x;
    this.stickY = y;
    this.stickOn = on;
  }

  cycleSpeed() {
    this.speed = this.speed === 1 ? 2 : this.speed === 2 ? 3 : 1;
    return this.speed;
  }

  hud(): Hud {
    return {
      hp: Math.max(0, Math.ceil(this.hp)),
      maxHp: this.maxHp,
      shield: Math.ceil(this.shield),
      gold: Math.round(this.gold * 10) / 10,
      wave: this.wave,
      scene: this.scene,
      slots: this.slots.map((slot) => (slot ? { ...slot } : null)),
      relics: this.relics.map((slot) => ({ ...slot })),
      offers: [...this.offers],
      refreshes: this.refreshes,
      refreshCost: this.refreshCost(),
      pending: this.pending,
      over: this.over,
      banner: this.banner,
    };
  }

  buy(id: SkillId) {
    const def = skillById[id];
    if (this.gold < def.price) return false;
    const owned = this.slot(id);
    if (owned) {
      if (def.kind === "增益" || def.kind === "神器") {
        if (owned.rank >= 3) return false;
        owned.rank += 1;
      } else if (!owned.branch) {
        return false;
      } else return false;
    } else if (def.kind === "神器") {
      this.relics.push({ id, rank: 1, branch: null });
    } else {
      const index = this.slots.findIndex((slot) => !slot);
      if (index < 0) return false;
      this.slots[index] = { id, rank: 1, branch: null };
    }
    this.gold = Math.round((this.gold - def.price) * 10) / 10;
    this.sfx.levelUp();
    this.burst(this.px, this.py, "#ffbc0d");
    this.syncVitals();
    return true;
  }

  chooseMeal(id: ComboId) {
    const combo = comboById[id];
    if (this.slots.some((slot) => slot) || this.relics.length) return false;
    const gear = combo.grants.filter((skillId) => skillById[skillId].kind !== "神器");
    if (this.slots.filter((slot) => !slot).length < gear.length) return false;
    for (const skillId of gear) {
      const index = this.slots.findIndex((slot) => !slot);
      this.slots[index] = { id: skillId, rank: 1, branch: null };
    }
    for (const skillId of combo.grants) {
      if (skillById[skillId].kind === "神器") this.relics.push({ id: skillId, rank: 1, branch: null });
    }
    this.beginWave();
    this.paused = false;
    this.sfx.levelUp();
    return true;
  }

  needsBranch(id: SkillId) {
    const slot = this.slots.find((item) => item?.id === id);
    return Boolean(slot && skillById[id].kind === "技能" && !slot.branch);
  }

  chooseBranch(id: SkillId, branch: "a" | "b") {
    const slot = this.slots.find((item) => item?.id === id);
    if (!slot || slot.branch) return;
    this.gold = Math.round((this.gold - skillById[id].price) * 10) / 10;
    if (this.gold < 0) {
      this.gold += skillById[id].price;
      return;
    }
    slot.branch = branch;
    this.sfx.levelUp();
  }

  recycleRelic(index: number) {
    const slot = this.relics[index];
    if (!slot) return 0;
    const gain = recyclePrice(skillById[slot.id].price, slot.rank, Boolean(slot.branch));
    this.relics.splice(index, 1);
    this.gold = Math.round((this.gold + gain) * 10) / 10;
    this.sfx.pick();
    this.syncVitals();
    return gain;
  }

  recycle(index: number) {
    const slot = this.slots[index];
    if (!slot) return 0;
    const gain = recyclePrice(skillById[slot.id].price, slot.rank, Boolean(slot.branch));
    this.slots[index] = null;
    this.gold = Math.round((this.gold + gain) * 10) / 10;
    this.sfx.pick();
    this.syncVitals();
    return gain;
  }

  takePending() {
    const id = this.pending;
    if (!id) return false;
    const index = this.slots.findIndex((slot) => !slot);
    if (index < 0) return false;
    this.slots[index] = { id, rank: 1, branch: null };
    this.pending = null;
    this.paused = false;
    this.sfx.levelUp();
    return true;
  }

  skipPending() {
    if (!this.pending) return;
    this.pending = null;
    this.gold += 6;
    this.paused = false;
    this.float(this.px, this.py - 20, "+6", "#2d2d2d");
  }

  refreshCost() {
    if (this.refreshes <= 0) return 0;
    if (this.refreshes === 1) return 8;
    if (this.refreshes === 2) return 12;
    return 18;
  }

  refreshShop() {
    if (this.refreshes >= 4) return false;
    const cost = this.refreshCost();
    if (this.gold < cost) return false;
    this.gold = Math.round((this.gold - cost) * 10) / 10;
    this.refreshes += 1;
    this.rollOffers();
    return true;
  }

  continueShop() {
    this.paused = false;
    this.refreshes = 0;
    if (this.wave === 10 && !this.endless) {
      this.endless = true;
      this.endlessWave = 1;
      this.beginWave();
      return;
    }
    if (this.endless) this.endlessWave += 1;
    else this.wave += 1;
    this.beginWave();
  }

  restart() {
    this.hp = 100;
    this.shield = 0;
    this.shieldMax = 0;
    this.gold = 0;
    this.wave = 1;
    this.scene = 1;
    this.endless = false;
    this.endlessWave = 0;
    this.clearing = false;
    this.sweepLeft = 0;
    this.eliteCursor = 0;
    this.bossCursor = 0;
    this.slots = Array.from({ length: 8 }, () => null);
    this.relics = [];
    this.pending = null;
    this.over = "";
    this.paused = true;
    this.enemies = [];
    this.shots = [];
    this.zones = [];
    this.drops = [];
    this.bombs = [];
    this.px = 280;
    this.py = 340;
    this.banner = "第 1 关";
    this.stood = false;
    this.pops = [];
    this.charge = null;
    this.rageLeft = 0;
    this.maxHp = 100;
    this.meals = pickCombos();
    this.syncVitals();
  }

  private resize = () => {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const width = Math.max(1, Math.round(rect.width * dpr));
    const height = Math.max(1, Math.round(rect.height * dpr));
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
  };

  private bindKeys() {
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
  }

  private onKeyDown = (event: KeyboardEvent) => {
    this.keys.add(event.key.toLowerCase());
  };

  private onKeyUp = (event: KeyboardEvent) => {
    this.keys.delete(event.key.toLowerCase());
  };

  private has(id: SkillId) {
    return Boolean(this.slot(id));
  }

  private slot(id: SkillId) {
    return this.slots.find((item) => item?.id === id) ?? this.relics.find((item) => item.id === id) ?? null;
  }

  private bolt(shot: Shot) {
    shot.life = Math.max(shot.life, 8);
    shot.wall = (shot.wall ?? 0) + (this.slot("twist")?.rank ?? 0);
    return shot;
  }

  private attackGap() {
    const haste = (this.slot("haste")?.rank ?? 0) * 0.22;
    const rage = this.rageLeft > 0 ? 0.4 : 0;
    const coffee = this.coffeeLeft > 0 ? 0.45 : 0;
    return 1.05 / (1 + haste + rage + coffee);
  }

  private syncVitals() {
    const next = 100 + (this.slot("cocoa")?.rank ?? 0) * 18;
    if (next > this.maxHp) this.hp += next - this.maxHp;
    this.maxHp = next;
    this.hp = Math.min(this.hp, this.maxHp);
  }

  private beginWave() {
    if (this.endless) {
      this.useMap(11);
      this.leftNormal = 8;
      this.leftElite = 2;
      this.leftBoss = 1;
      this.spawnCd = 0.35;
      this.fieldCd = 3.2;
      this.banner = `无尽 第 ${this.endlessWave} 波`;
      this.scene = 2;
      this.float(W / 2, 70, this.banner, "#2d2d2d");
      return;
    }
    const plan = waves[this.wave - 1] ?? waves[0];
    this.useMap(this.wave);
    this.leftNormal = plan.normal;
    this.leftElite = plan.elite;
    this.leftBoss = plan.boss;
    this.spawnCd = 0.35;
    this.fieldCd = 3.2;
    this.banner = `第 ${this.wave} 关`;
    this.scene = 1;
    this.float(W / 2, 70, this.banner, "#2d2d2d");
  }

  private useMap(stage: number) {
    const map = stageMaps.find((item) => item.stage === stage) ?? stageMaps[0];
    this.mapStage = map.stage;
    this.blocks = map.obstacles.map((item) => ({ x: item.x, y: item.y, w: item.w, h: item.h }));
    this.prepareImage(map.background);
    for (const item of map.obstacles) this.prepareImage(item.file);
    if (this.blocked(this.px, this.py, 16)) {
      this.px = 480;
      this.py = 270;
    }
  }

  private prepareImage(src: string) {
    if (this.images.has(src)) return;
    const image = new Image();
    image.src = src;
    this.images.set(src, image);
  }

  private currentMap() {
    return stageMaps.find((item) => item.stage === this.mapStage) ?? stageMaps[0];
  }

  private update(dt: number) {
    this.hurtCd = Math.max(0, this.hurtCd - dt);
    this.iframe = Math.max(0, this.iframe - dt);
    this.juiceCd = Math.max(0, this.juiceCd - dt);
    this.teaLeft = Math.max(0, this.teaLeft - dt);
    this.coffeeLeft = Math.max(0, this.coffeeLeft - dt);
    this.shieldFlash = Math.max(0, this.shieldFlash - dt);
    if (this.teaLeft > 0) {
      this.teaTick -= dt;
      if (this.teaTick <= 0) {
        this.teaTick = 0.5;
        const heal = this.slot("tea")?.branch === "b" ? 4 : 2;
        this.hp = Math.min(this.maxHp, this.hp + heal);
        this.bits.push({ x: this.px, y: this.py - 20, vx: (Math.random() - 0.5) * 12, vy: -28, life: 0.4, color: "#fff", size: 2.5 });
      }
    }
    const cocoa = this.slot("cocoa");
    if (cocoa && this.hp > 0 && this.hp < this.maxHp) {
      this.cocoaCd -= dt;
      if (this.cocoaCd <= 0) {
        this.cocoaCd = 2.4;
        this.hp = Math.min(this.maxHp, this.hp + 1 + cocoa.rank);
        this.bits.push({ x: this.px + 10, y: this.py - 8, vx: 8, vy: -16, life: 0.35, color: "#6b3a1f", size: 2.2 });
      }
    }
    this.shake = Math.max(0, this.shake - dt);
    if (this.clearing) {
      this.sweepLeft -= dt;
      this.pullDrops(dt);
      this.updateDrops(dt);
      this.floaters.forEach((item) => (item.life -= dt));
      this.floaters = this.floaters.filter((item) => item.life > 0);
      if (this.sweepLeft <= 0) this.openShop();
      return;
    }
    if (this.charge) this.updateCharge(dt);
    else this.movePlayer(dt);
    this.cast(dt);
    this.spawn(dt);
    this.updateShots(dt);
    this.updateZones(dt);
    this.updateEnemies(dt);
    this.updateDrops(dt);
    this.floaters.forEach((item) => (item.life -= dt));
    this.bits.forEach((item) => {
      item.life -= dt;
      item.x += item.vx * dt;
      item.y += item.vy * dt;
    });
    this.pops.forEach((pop) => (pop.life -= dt));
    this.pops = this.pops.filter((pop) => pop.life > 0);
    this.floaters = this.floaters.filter((item) => item.life > 0);
    this.bits = this.bits.filter((item) => item.life > 0);
    if (this.leftNormal + this.leftElite + this.leftBoss === 0 && this.enemies.length === 0) this.startSweep();
    if (this.hp <= 0 && !this.over) {
      const stand = this.slot("stand");
      if (stand && !this.stood) {
        this.stood = true;
        this.hp = this.maxHp * (stand.rank >= 2 ? 0.5 : 0.3);
        this.giveShield(22);
        if (stand.rank >= 3) this.iframe = 1.5;
        this.puff(this.px, this.py, "#f3e6c8", 16, 80);
        this.float(this.px, this.py - 30, "喝一口", "#6b3a1f");
        return;
      }
      this.over = "dead";
      this.paused = true;
      this.onDead?.();
    }
  }

  private movePlayer(dt: number) {
    let x = 0;
    let y = 0;
    if (this.keys.has("a") || this.keys.has("arrowleft")) x -= 1;
    if (this.keys.has("d") || this.keys.has("arrowright")) x += 1;
    if (this.keys.has("w") || this.keys.has("arrowup")) y -= 1;
    if (this.keys.has("s") || this.keys.has("arrowdown")) y += 1;
    const keyboard = x !== 0 || y !== 0;
    if (!keyboard && this.stickOn) {
      x = this.stickX;
      y = this.stickY;
    }
    const mag = Math.hypot(x, y);
    if (mag > 0) {
      const stickScale = keyboard ? 1 : Math.min(1, mag);
      x /= mag;
      y /= mag;
      this.face = Math.atan2(y, x);
      const cola = this.slot("cola");
      const lemon = this.slot("lemon");
      const pace = 200 * stickScale * (cola && this.hp < this.maxHp * 0.5 ? 1 + 0.18 * cola.rank : 1) * (lemon ? 1 + 0.1 * lemon.rank : 1) * (this.coffeeLeft > 0 ? 1.12 : 1);
      const next = this.collide(this.px + x * pace * dt, this.py + y * pace * dt, 16);
      this.px = next.x;
      this.py = next.y;
    }
  }

  private collide(x: number, y: number, r: number) {
    x = Math.max(r, Math.min(W - r, x));
    y = Math.max(r, Math.min(H - r, y));
    for (const block of this.blocks) {
      const moved = pushOut(x, y, r, block);
      x = moved.x;
      y = moved.y;
    }
    return { x, y };
  }

  private puff(x: number, y: number, color: string, count = 8, speed = 80) {
    for (let i = 0; i < count; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const pace = speed * (0.35 + Math.random() * 0.8);
      this.bits.push({
        x,
        y,
        vx: Math.cos(angle) * pace,
        vy: Math.sin(angle) * pace,
        life: 0.28 + Math.random() * 0.28,
        color,
        size: 2 + Math.random() * 3,
      });
    }
  }

  private updateCharge(dt: number) {
    const charge = this.charge;
    if (!charge) return;
    charge.left -= dt;
    const t = 1 - Math.max(0, charge.left) / charge.span;
    const x = charge.sx + (charge.x - charge.sx) * t;
    const y = charge.sy + (charge.y - charge.sy) * t;
    this.bits.push({
      x: this.px,
      y: this.py,
      vx: (this.px - x) * 2,
      vy: (this.py - y) * 2,
      life: 0.32,
      color: Math.random() < 0.5 ? "#fff" : "#c4a574",
      size: 5,
    });
    this.px = x;
    this.py = y;
    for (const enemy of this.enemies) {
      if (charge.hit.has(enemy.id)) continue;
      if (Math.hypot(enemy.x - this.px, enemy.y - this.py) > enemy.r + 22) continue;
      charge.hit.add(enemy.id);
      this.hitEnemy(enemy, charge.dmg);
      const angle = Math.atan2(charge.y - charge.sy, charge.x - charge.sx);
      const next = this.collide(enemy.x + Math.cos(angle) * 42, enemy.y + Math.sin(angle) * 42, enemy.r);
      enemy.x = next.x;
      enemy.y = next.y;
      if (charge.root > 0) enemy.root = Math.max(enemy.root, charge.root);
      this.puff(enemy.x, enemy.y, "#6b3a1f", 6, 60);
    }
    if (charge.left <= 0) {
      this.px = charge.x;
      this.py = charge.y;
      this.charge = null;
      this.puff(this.px, this.py, "#fff", 12, 90);
    }
  }

  private cast(dt: number) {
    this.rageLeft = Math.max(0, this.rageLeft - dt);
    this.orbitAngle += dt * 2.2;
    this.shotCd -= dt;
    if (this.shotCd <= 0) {
      this.shotCd = this.attackGap();
      const target = this.nearest(this.px, this.py);
      if (target) this.fireBasic(target);
    }
    this.fieldCd -= dt;
    if (this.fieldCd <= 0) {
      const rank = this.slot("drops")?.rank ?? 0;
      this.fieldCd = [11, 9, 7, 6][rank];
      this.spawnField();
    }
  }

  private unlockedSpells() {
    return this.slots.flatMap((slot) => (slot && skillById[slot.id].kind === "技能" ? [slot.id] : []));
  }

  private release(id: SkillId) {
    const branch = this.slot(id)?.branch;
    const name = skillById[id].name;
    if (id === "auto") {
      this.fireOrb(branch === "a" ? "triple" : branch === "b" ? "heavy" : "single");
      this.puff(this.px, this.py, "#ffbc0d", 10, 90);
      this.float(this.px, this.py - 34, name, "#2d2d2d");
      return;
    }
    if (id === "follow") {
      const target = this.nearest(this.px, this.py);
      const base = target ? Math.atan2(target.y - this.py, target.x - this.px) : this.face;
      const count = branch === "a" ? 7 : 5;
      const spread = branch === "a" ? 0.2 : 0.14;
      for (let i = 0; i < count; i += 1) {
        const offset = (i - (count - 1) / 2) * spread;
        this.shots.push(this.bolt({
          x: this.px,
          y: this.py,
          vx: Math.cos(base + offset) * 420,
          vy: Math.sin(base + offset) * 420,
          r: 8,
          dmg: 9 + this.rageBonus(),
          life: 8,
          good: true,
          pierce: 1,
          hit: new Set(),
          kind: "basic",
          splitGen: 0,
          homing: 0,
          fx: "fries",
          snare: branch === "b" ? 0.45 : 0,
        }));
      }
      this.sfx.shoot();
      this.puff(this.px, this.py, "#ffbc0d", 10, 90);
      this.float(this.px, this.py - 34, name, "#2d2d2d");
      return;
    }
    if (id === "pie") {
      const aim = this.nearest(this.px, this.py);
      const angle = aim ? Math.atan2(aim.y - this.py, aim.x - this.px) : this.face;
      const stay = branch === "a" ? 4.2 : 2.6;
      this.zones.push({
        x: this.px + Math.cos(angle) * 86,
        y: this.py + Math.sin(angle) * 86,
        r: branch === "b" ? 92 : 58,
        life: stay,
        span: stay,
        tick: 0,
        dmg: 8,
        slow: true,
        fx: "pie",
      });
      this.puff(this.px, this.py, "#ffbc0d", 10, 90);
      this.float(this.px, this.py - 34, name, "#2d2d2d");
      return;
    }
    if (id === "wing") {
      this.aimAt();
      const count = branch === "a" ? 5 : 3;
      for (let i = 0; i < count; i += 1) {
        const offset = (i - (count - 1) / 2) * 0.32;
        this.shots.push(this.bolt({
          x: this.px,
          y: this.py,
          vx: Math.cos(this.face + offset) * 340,
          vy: Math.sin(this.face + offset) * 340,
          r: branch === "b" ? 14 : 9,
          dmg: 14 + this.rageBonus(),
          life: 8,
          good: true,
          pierce: 5,
          hit: new Set(),
          kind: "basic",
          splitGen: 0,
          homing: 0,
          fx: "wing",
          back: false,
          flown: 0,
        }));
      }
      this.sfx.shoot();
      this.puff(this.px, this.py, "#ffbc0d", 10, 90);
      this.float(this.px, this.py - 34, name, "#2d2d2d");
      return;
    }
    if (id === "soda") {
      this.aimAt();
      const speed = branch === "a" ? 620 : 460;
      const spread = 0.2;
      for (const offset of branch === "b" ? [-spread, 0, spread] : [0]) {
        this.shots.push(this.bolt({
          x: this.px + Math.cos(this.face) * 20,
          y: this.py + Math.sin(this.face) * 20,
          vx: Math.cos(this.face + offset) * speed,
          vy: Math.sin(this.face + offset) * speed,
          r: 12,
          dmg: 18 + this.rageBonus(),
          life: 8,
          good: true,
          pierce: 8,
          hit: new Set(),
          kind: "soda",
          splitGen: 0,
          homing: 0,
        }));
      }
      this.sfx.shoot();
      this.puff(this.px, this.py, "#ffbc0d", 10, 90);
      this.float(this.px, this.py - 34, name, "#2d2d2d");
      return;
    }
    if (id === "ice") {
      const radius = branch === "a" ? 188 : 140;
      this.zones.push({
        x: this.px,
        y: this.py,
        r: radius,
        life: 0.7,
        span: 0.7,
        tick: 0,
        dmg: 12,
        slow: true,
        once: true,
        fx: "ice",
      });
      this.shove(this.px, this.py, radius, 16, 1.8, branch === "a" ? 1.35 : 0.95);
      this.puff(this.px, this.py, "#ffffff", 16, 120);
      if (branch === "b") {
        this.zones.push({ x: this.px, y: this.py, r: 96, life: 2.2, span: 2.2, tick: 0.25, dmg: 3, slow: true, fx: "frost" });
      }
      this.float(this.px, this.py - 46, name, "#2d2d2d");
      return;
    }
    if (id === "sauce") {
      const target = this.nearest(this.px, this.py);
      const x = target?.x ?? this.px + Math.cos(this.face) * 110;
      const y = target?.y ?? this.py + Math.sin(this.face) * 110;
      this.zones.push({
        x,
        y,
        r: branch === "b" ? 96 : 58,
        life: 2.2,
        span: 2.2,
        tick: 0,
        dmg: 6,
        slow: true,
        fx: "sauce",
      });
      if (target && branch === "a") target.slow = Math.max(target.slow, 1.8);
      this.puff(this.px, this.py, "#ffbc0d", 10, 90);
      this.float(this.px, this.py - 34, name, "#2d2d2d");
      return;
    }
    if (id === "spike") {
      this.aimAt();
      const reach = 196;
      const width = branch === "a" ? 0.95 : 0.5;
      this.zones.push({ x: this.px, y: this.py, r: reach, life: 0.28, span: 0.28, tick: 0, dmg: 0, slow: false, once: true, aim: this.face, fan: width, fx: "wasabi" });
      for (const enemy of this.enemies) {
        const angle = Math.atan2(enemy.y - this.py, enemy.x - this.px);
        const diff = Math.atan2(Math.sin(angle - this.face), Math.cos(angle - this.face));
        const dist = Math.hypot(enemy.x - this.px, enemy.y - this.py);
        if (Math.abs(diff) > width || dist > reach + enemy.r) continue;
        const outer = dist > reach * 0.62;
        this.hitEnemy(enemy, (outer ? 28 : 14) + this.rageBonus());
        if (outer) enemy.root = Math.max(enemy.root, branch === "b" ? 0.75 : 0.35);
        enemy.slow = Math.max(enemy.slow, 0.5);
      }
      if (branch === "b") {
        this.zones.push({
          x: this.px + Math.cos(this.face) * 90,
          y: this.py + Math.sin(this.face) * 90,
          r: 52,
          life: 1.6,
          span: 1.6,
          tick: 0.3,
          dmg: 4,
          slow: true,
          fx: "paste",
        });
      }
      this.puff(this.px, this.py, "#8fd14f", 12, 100);
      this.float(this.px, this.py - 34, name, "#5a9a22");
      return;
    }
    if (id === "rain") {
      this.aimAt();
      const count = branch === "a" ? 9 : 6;
      for (let i = 1; i <= count; i += 1) {
        const spread = (i - (count + 1) / 2) * 0.18;
        const dist = 40 + i * 24;
        this.zones.push({
          x: this.px + Math.cos(this.face + spread) * dist,
          y: this.py + Math.sin(this.face + spread) * dist,
          r: 30,
          life: branch === "b" ? 1.05 : 0.4,
          span: branch === "b" ? 1.05 : 0.4,
          tick: 0,
          dmg: 9,
          slow: false,
          once: branch !== "b",
          fx: "rain",
        });
      }
      this.puff(this.px, this.py, "#ffbc0d", 10, 90);
      this.float(this.px, this.py - 34, name, "#2d2d2d");
      return;
    }
    if (id === "milk") {
      this.giveShield(branch === "b" ? 72 : 48);
      if (branch === "a") {
        const heal = 16;
        this.hp = Math.min(this.maxHp, this.hp + heal);
        this.float(this.px, this.py - 52, `+${heal}`, "#db0007");
      }
      this.sfx.shield();
      this.puff(this.px, this.py, "#ffbc0d", 10, 90);
      this.float(this.px, this.py - 34, name, "#2d2d2d");
      return;
    }
    if (id === "coffee") {
      this.aimAt();
      this.coffeeLeft = Math.max(this.coffeeLeft, branch === "a" ? 4.2 : 2.8);
      const offsets = branch === "b" ? [-0.22, 0, 0.22] : [0];
      for (const offset of offsets) {
        this.shots.push(this.bolt({
          x: this.px + Math.cos(this.face) * 18,
          y: this.py + Math.sin(this.face) * 18,
          vx: Math.cos(this.face + offset) * 480,
          vy: Math.sin(this.face + offset) * 480,
          r: 11,
          dmg: (branch === "a" ? 16 : 12) + this.rageBonus(),
          life: 8,
          good: true,
          pierce: 6,
          hit: new Set(),
          kind: "basic",
          splitGen: 0,
          homing: 0,
          fx: "steam",
        }));
      }
      this.sfx.shoot();
      this.puff(this.px, this.py, "#6b3a1f", 12, 80);
      this.float(this.px, this.py - 34, name, "#6b3a1f");
      return;
    }
    if (id === "tea") {
      this.teaLeft = Math.max(this.teaLeft, branch === "a" ? 6 : 3.6);
      this.puff(this.px, this.py, "#ffbc0d", 10, 90);
      this.float(this.px, this.py - 34, name, "#2d2d2d");
      return;
    }
    if (id === "stomp") {
      const radius = branch === "a" ? 168 : 112;
      this.pulse(this.px, this.py, radius, 16 + this.rageBonus(), "slam");
      this.shove(this.px, this.py, radius, branch === "a" ? 110 : 62, branch === "b" ? 0.9 : 0.35, branch === "b" ? 0.85 : 0.4);
      this.puff(this.px, this.py, "#ffbc0d", 10, 90);
      this.float(this.px, this.py - 34, name, "#2d2d2d");
      return;
    }
    if (id === "rage") {
      this.rageLeft = Math.max(this.rageLeft, branch === "a" ? 8 : 5);
      this.puff(this.px, this.py, "#ff7a18", 14, 120);
      this.float(this.px, this.py - 34, name, "#db0007");
      return;
    }
    if (id === "hook") {
      this.aimAt();
      const speed = branch === "a" ? 300 : 220;
      this.shots.push(this.bolt({
        x: this.px,
        y: this.py,
        vx: Math.cos(this.face) * speed,
        vy: Math.sin(this.face) * speed,
        r: 11,
        dmg: 14 + this.rageBonus(),
        life: 8,
        good: true,
        pierce: 0,
        hit: new Set(),
        kind: "basic",
        splitGen: 0,
        homing: 0,
        fx: "cheese",
        pull: branch === "a" ? 260 : 180,
        snare: branch === "b" ? 1.1 : 0.55,
      }));
      this.sfx.shoot();
      this.puff(this.px, this.py, "#ffbc0d", 8, 70);
      this.float(this.px, this.py - 34, name, "#ffbc0d");
      return;
    }
    if (id === "dash") {
      this.aimAt();
      const dist = branch === "a" ? 220 : 150;
      let x = this.px;
      let y = this.py;
      const step = dist / 14;
      for (let i = 0; i < 14; i += 1) {
        const next = this.collide(x + Math.cos(this.face) * step, y + Math.sin(this.face) * step, 16);
        if (Math.hypot(next.x - x, next.y - y) < 3) break;
        x = next.x;
        y = next.y;
      }
      const travel = Math.hypot(x - this.px, y - this.py);
      const span = Math.max(0.18, travel / 680);
      this.charge = {
        sx: this.px,
        sy: this.py,
        x,
        y,
        left: span,
        span,
        hit: new Set(),
        dmg: 18 + this.rageBonus(),
        root: branch === "b" ? 0.75 : 0,
      };
      this.iframe = Math.max(this.iframe, span);
      this.puff(this.px, this.py, "#c4a574", 10, 70);
      this.float(this.px, this.py - 34, name, "#6b3a1f");
      return;
    }
    if (id === "roll") {
      this.aimAt();
      this.shots.push(this.bolt({
        x: this.px + Math.cos(this.face) * 22,
        y: this.py + Math.sin(this.face) * 22,
        vx: Math.cos(this.face) * 280,
        vy: Math.sin(this.face) * 280,
        r: branch === "b" ? 18 : 13,
        dmg: (branch === "b" ? 22 : 14) + this.rageBonus(),
        life: 8,
        good: true,
        pierce: 8,
        hit: new Set(),
        kind: "basic",
        splitGen: 0,
        homing: 0,
        fx: "patty",
        wall: branch === "a" ? 5 : 3,
      }));
      this.sfx.shoot();
      this.puff(this.px, this.py, "#e2a04a", 10, 80);
      this.float(this.px, this.py - 34, name, "#e2a04a");
      return;
    }
    if (id === "brand") {
      const targets = this.nearestFew(this.px, this.py, branch === "a" ? 2 : 1);
      for (const enemy of targets) {
        enemy.mark = branch === "a" ? 6 : 4.2;
        this.puff(enemy.x, enemy.y, "#db0007", 8, 50);
      }
      this.float(this.px, this.py - 34, name, "#db0007");
      return;
    }
    if (id === "whirl") {
      const stay = branch === "b" ? 2.6 : 1.6;
      this.zones.push({
        x: this.px,
        y: this.py,
        r: branch === "a" ? 176 : 124,
        life: stay,
        span: stay,
        tick: 0,
        dmg: 8,
        slow: true,
        pull: true,
        follow: false,
        fx: "whirl",
      });
      this.puff(this.px, this.py, "#9b6bff", 14, 100);
      this.float(this.px, this.py - 34, name, "#7b3fe4");
    }
  }

  private season(shot: Shot) {
    shot.fish = this.has("cod") || this.has("lock");
    shot.flame = this.has("ash");
    shot.chili = this.has("gen");
    shot.venom = this.has("glaze");
    if (shot.fish || shot.flame || shot.chili || shot.venom) shot.r = 8;
    if (this.has("might")) shot.r += 1 + (this.slot("might")?.rank ?? 1);
    return shot;
  }

  private shove(x: number, y: number, radius: number, push: number, slow: number, root = 0) {
    for (const enemy of this.enemies) {
      const dist = Math.hypot(enemy.x - x, enemy.y - y);
      if (dist > radius + enemy.r || dist === 0) continue;
      const next = this.collide(enemy.x + ((enemy.x - x) / dist) * push, enemy.y + ((enemy.y - y) / dist) * push, enemy.r);
      enemy.x = next.x;
      enemy.y = next.y;
      if (slow > 0) enemy.slow = Math.max(enemy.slow, slow);
      if (root > 0) enemy.root = Math.max(enemy.root, root);
    }
  }

  private fireBasic(target: Enemy) {
    const twin = this.slot("twin");
    const count = twin ? twin.rank + 1 : 1;
    const lock = this.slot("lock");
    const base = Math.atan2(target.y - this.py, target.x - this.px);
    for (let i = 0; i < count; i += 1) {
      const offset = count === 1 ? 0 : (i - (count - 1) / 2) * 0.18;
      const angle = base + offset;
      this.shots.push(this.season(this.bolt({
        x: this.px,
        y: this.py,
        vx: Math.cos(angle) * 420,
        vy: Math.sin(angle) * 420,
        r: 6,
        dmg: 6 + this.rageBonus(),
        life: 8,
        good: true,
        pierce: this.slot("cod")?.rank ?? 0,
        hit: new Set(),
        kind: "basic",
        splitGen: 0,
        homing: lock ? (lock.rank >= 3 ? 6 : lock.rank) : 0,
      })));
    }
    this.sfx.shoot();
  }

  private fireOrb(mode: "single" | "triple" | "heavy") {
    const target = this.nearest(this.px, this.py);
    const aim = target ?? { x: this.px + Math.cos(this.face) * 140, y: this.py + Math.sin(this.face) * 140 };
    const spots = mode === "triple" ? [-36, 0, 36] : [0];
    for (const offset of spots) {
      this.shots.push(this.bolt({
        x: aim.x + offset,
        y: Math.max(12, aim.y - 140),
        vx: 0,
        vy: 460,
        r: mode === "heavy" ? 18 : 13,
        dmg: (mode === "heavy" ? 32 : 20) + this.rageBonus(),
        life: 8,
        good: true,
        pierce: 0,
        hit: new Set(),
        kind: "orb",
        splitGen: 0,
        homing: 0,
        fx: "nugget",
      }));
    }
  }

  private orbitBalls() {
    const balls: Array<{ x: number; y: number; dmg: number; explode: boolean; heavy: boolean; slow: boolean }> = [];
    const mac = this.slot("orbit");
    if (mac) {
      for (let index = 0; index < mac.rank; index += 1) {
        const angle = this.orbitAngle + (Math.PI * 2 * index) / mac.rank;
        balls.push({
          x: this.px + Math.cos(angle) * 52,
          y: this.py + Math.sin(angle) * 52,
          dmg: 10 + this.rageBonus(),
          explode: mac.rank >= 3,
          heavy: false,
          slow: true,
        });
      }
    }
    const heavy = this.slot("orbDmg");
    if (heavy) {
      for (let index = 0; index < heavy.rank; index += 1) {
        const angle = -this.orbitAngle * 0.72 + (Math.PI * 2 * index) / heavy.rank;
        balls.push({
          x: this.px + Math.cos(angle) * 86,
          y: this.py + Math.sin(angle) * 86,
          dmg: 16 + this.rageBonus(),
          explode: false,
          heavy: true,
          slow: false,
        });
      }
    }
    return balls;
  }

  private orbitPoints() {
    return this.orbitBalls().map((ball) => ({ x: ball.x, y: ball.y }));
  }

  private turretChance() {
    if (this.endless) return 0.3;
    if (this.wave <= 2 || this.wave === 5) return 0;
    if (this.wave <= 4) return 0.12;
    if (this.wave <= 6) return 0.22;
    return 0.35;
  }

  private spawn(dt: number) {
    if (this.enemies.length >= 12) return;
    this.spawnCd -= dt;
    if (this.spawnCd > 0) return;
    if (this.leftBoss > 0) {
      this.leftBoss -= 1;
      this.enemies.push(this.makeBoss());
    } else if (this.leftElite > 0) {
      this.leftElite -= 1;
      this.enemies.push(this.makeElite());
    } else if (this.leftNormal > 0) {
      this.leftNormal -= 1;
      this.enemies.push(this.makeEnemy(false, Math.random() < this.turretChance() ? "turret" : "walker"));
    }
    this.spawnCd = 0.72;
  }

  private makeEnemy(elite: boolean, kind: Enemy["kind"]): Enemy {
    const edge = Math.random() * 4;
    const x = edge < 1 ? 30 : edge < 2 ? W - 30 : 40 + Math.random() * (W - 80);
    const y = edge < 2 ? 40 + Math.random() * (H - 80) : edge < 3 ? 30 : H - 30;
    const hp = kind === "boss" ? 520 : elite ? 72 : kind === "turret" ? 16 : 24;
    const hpScale = this.endless ? Math.min(3.2, 1.35 + Math.max(0, this.endlessWave - 1) * 0.16) : 1;
    const scaled = hp * hpScale;
    return {
      id: this.nextId++,
      x,
      y,
      r: kind === "boss" ? 28 : elite ? 20 : 14,
      hp: scaled,
      max: scaled,
      kind: kind === "boss" ? "boss" : kind,
      elite: elite || kind === "boss",
      cd: 0.6,
      slow: 0,
      flash: 0,
      orbCd: 0,
      skillCd: 1.2,
      dashLeft: 0,
      dashAngle: 0,
      trick: null,
      minion: false,
      pace: this.endless ? Math.min(1.55, 1 + Math.max(0, this.endlessWave - 1) * 0.05) : 1,
      steer: 0,
      root: 0,
      burn: 0,
      burnDmg: 0,
      burnTick: 0,
      poison: 0,
      poisonDmg: 0,
      poisonTick: 0,
      mark: 0,
      haul: 0,
      hx: 0,
      hy: 0,
      hasWay: false,
      wayX: 0,
      wayY: 0,
    };
  }

  private makeElite() {
    const tricks = ["split", "boom", "burst", "dash"] as const;
    const trick = tricks[this.eliteCursor % tricks.length];
    this.eliteCursor += 1;
    const enemy = this.makeEnemy(true, trick === "burst" ? "turret" : "walker");
    enemy.trick = trick;
    return enemy;
  }

  private makeBoss() {
    const tricks = ["nova", "split", "bomb", "dash"] as const;
    const mid = this.wave === 5 && !this.endless;
    const trick = this.wave === 10 && !this.endless ? "nova" : mid ? "dash" : tricks[this.bossCursor % tricks.length];
    if (!(this.wave === 10 && !this.endless) && !mid) this.bossCursor += 1;
    const enemy = this.makeEnemy(true, "boss");
    enemy.trick = trick;
    if (mid) {
      enemy.hp = enemy.max = 280;
      enemy.r = 24;
    }
    return enemy;
  }

  private startSweep() {
    if (this.clearing || this.paused) return;
    this.clearing = true;
    this.sweepLeft = 0.8;
    this.float(this.px, this.py - 40, "收走", "#2d2d2d");
  }

  private openShop() {
    const leftover = [...this.drops];
    this.drops = [];
    for (const drop of leftover) this.applyDrop(drop);
    this.clearing = false;
    this.gold += 2;
    this.paused = true;
    this.rollOffers();
    this.onShop?.();
  }

  private pullDrops(dt: number) {
    for (const drop of this.drops) {
      const dx = this.px - drop.x;
      const dy = this.py - drop.y;
      const dist = Math.hypot(dx, dy) || 1;
      const step = Math.min(dist, 1100 * dt);
      drop.x += (dx / dist) * step;
      drop.y += (dy / dist) * step;
    }
  }

  private rollOffers() {
    const seen = new Set(this.offers);
    const pool = skills.map((skill) => skill.id).filter((id) => this.offerable(id) && !seen.has(id));
    const source = pool.length >= 4 ? pool : skills.map((skill) => skill.id).filter((id) => this.offerable(id));
    const shuffled = [...source].sort(() => Math.random() - 0.5);
    const picked: SkillId[] = [];
    for (const kind of ["技能", "增益", "神器"] as const) {
      const found = shuffled.find((id) => skillById[id].kind === kind && !picked.includes(id));
      if (found) picked.push(found);
    }
    for (const id of shuffled) {
      if (picked.length >= 4) break;
      if (!picked.includes(id)) picked.push(id);
    }
    this.offers = picked.slice(0, 4);
  }

  private offerable(id: SkillId) {
    const slot = this.slot(id);
    if (!slot) return skillById[id].kind === "神器" || this.slots.some((item) => !item);
    if (skillById[id].kind !== "技能") return slot.rank < 3;
    return !slot.branch;
  }

  private updateShots(dt: number) {
    for (const shot of this.shots) {
      if (shot.homing > 0 && shot.kind === "basic") {
        const orbit = shot.fx === "fries" ? null : this.orbitPoints().length ? nearestPoint(shot.x, shot.y, this.orbitPoints()) : null;
        const enemy = this.nearest(shot.x, shot.y);
        const mark = orbit ?? enemy;
        if (mark && Math.hypot(mark.x - shot.x, mark.y - shot.y) < 18) {
          shot.homing -= 1;
          if (shot.fx === "fries" && this.slot("follow")?.branch === "b") shot.dmg += 6;
          if (orbit) {
            shot.x = orbit.x;
            shot.y = orbit.y;
          }
        }
        const target = orbit && Math.hypot(orbit.x - shot.x, orbit.y - shot.y) > 18 ? orbit : enemy;
        if (target) {
          const angle = Math.atan2(target.y - shot.y, target.x - shot.x);
          shot.vx = Math.cos(angle) * 420;
          shot.vy = Math.sin(angle) * 420;
        }
      }
      const stepX = shot.vx * dt;
      const stepY = shot.vy * dt;
      shot.x += stepX;
      shot.y += stepY;
      shot.life -= dt;
      shot.flown = (shot.flown ?? 0) + Math.hypot(stepX, stepY);
      if (shot.fx === "wing" && !shot.back && (shot.flown ?? 0) > 280) {
        shot.vx *= -1;
        shot.vy *= -1;
        shot.back = true;
        shot.hit.clear();
      }
      if (shot.fx === "wing" && shot.back && Math.hypot(shot.x - this.px, shot.y - this.py) < 20 && (shot.flown ?? 0) > 320) shot.life = 0;
      this.trail(shot);
      if (this.blocked(shot.x, shot.y, shot.r) || shot.x < shot.r || shot.y < shot.r || shot.x > W - shot.r || shot.y > H - shot.r) {
        this.rebound(shot, dt);
      }
      if (shot.life <= 0) continue;
      if (!shot.good) {
        if (Math.hypot(shot.x - this.px, shot.y - this.py) < shot.r + 16) {
          this.hurt(shot.dmg);
          shot.life = 0;
        }
        continue;
      }
      for (const enemy of this.enemies) {
        if (shot.hit.has(enemy.id)) continue;
        if (Math.hypot(shot.x - enemy.x, shot.y - enemy.y) > shot.r + enemy.r) continue;
        shot.hit.add(enemy.id);
        const critHit = this.hitEnemy(enemy, shot.dmg);
        if (shot.fx === "steam") {
          enemy.burn = Math.max(enemy.burn, 2.4);
          enemy.burnDmg = Math.max(enemy.burnDmg, Math.max(4, Math.round(shot.dmg * 0.4)));
          enemy.burnTick = 0.15;
        }
        if (shot.fx === "fries") enemy.slow = Math.max(enemy.slow, 1);
        if (shot.snare) enemy.root = Math.max(enemy.root, shot.snare);
        if (!shot.fx && shot.kind === "basic") {
          if (shot.venom) this.envenom(enemy);
          if (shot.flame) {
            const ash = this.slot("ash");
            if (ash) {
              enemy.burn = Math.max(enemy.burn, 2.2);
              enemy.burnDmg = Math.max(enemy.burnDmg, 2 + ash.rank * 2);
              if (enemy.burnTick <= 0) enemy.burnTick = 0.1;
            }
          }
          if (critHit && this.has("crit")) {
            const rank = this.slot("crit")?.rank ?? 1;
            this.pulse(enemy.x, enemy.y, 30 + rank * 8, 4 + rank * 2, "pop");
          }
        }
        if (shot.fx === "cheese") {
          const angle = Math.atan2(this.py - enemy.y, this.px - enemy.x);
          const dist = Math.hypot(this.px - enemy.x, this.py - enemy.y);
          const pull = Math.min(Math.max(0, dist - 42), shot.pull ?? 160);
          enemy.hx = enemy.x + Math.cos(angle) * pull;
          enemy.hy = enemy.y + Math.sin(angle) * pull;
          enemy.haul = 0.7;
          enemy.root = Math.max(enemy.root, (shot.snare ?? 0.55) + 0.28);
          this.puff(enemy.x, enemy.y, "#ffbc0d", 8, 50);
        }
        if (shot.fx === "nugget") this.pulse(enemy.x, enemy.y, 46, Math.max(6, shot.dmg * 0.4));
        if (shot.kind === "orb" || shot.good) this.bounceFrom(shot, enemy);
        if (shot.pierce <= 0) shot.life = 0;
        else shot.pierce -= 1;
        break;
      }
    }
    for (const ball of this.orbitBalls()) {
      for (const enemy of this.enemies) {
        if (enemy.orbCd > 0) continue;
        if (Math.hypot(ball.x - enemy.x, ball.y - enemy.y) > 14 + enemy.r) continue;
        enemy.orbCd = 0.35;
        this.hitEnemy(enemy, ball.dmg);
        if (ball.slow) enemy.slow = Math.max(enemy.slow, 0.7);
        const touch = this.touchShot(ball.x, ball.y, ball.dmg);
        this.bounceFrom(touch, enemy);
        if (ball.explode) this.pulse(ball.x, ball.y, 40, 8);
      }
    }
    this.shots = this.shots.filter((shot) => shot.life > 0);
  }

  private touchShot(x: number, y: number, dmg: number): Shot {
    return { x, y, vx: 0, vy: 0, r: 8, dmg, life: 1, good: true, pierce: 0, hit: new Set(), kind: "orb", splitGen: 0, homing: 0 };
  }

  private rebound(shot: Shot, dt: number) {
    const walls = shot.wall ?? 0;
    if (walls <= 0) {
      shot.life = 0;
      return;
    }
    shot.wall = walls - 1;
    const prevX = shot.x - shot.vx * dt;
    const prevY = shot.y - shot.vy * dt;
    const hitX = shot.x < shot.r || shot.x > W - shot.r || this.blocked(shot.x, prevY, shot.r * 0.6);
    const hitY = shot.y < shot.r || shot.y > H - shot.r || this.blocked(prevX, shot.y, shot.r * 0.6);
    if (hitX) shot.vx *= -1;
    if (hitY) shot.vy *= -1;
    if (!hitX && !hitY) {
      shot.vx *= -1;
      shot.vy *= -1;
    }
    shot.x = Math.max(shot.r + 1, Math.min(W - shot.r - 1, prevX));
    shot.y = Math.max(shot.r + 1, Math.min(H - shot.r - 1, prevY));
    shot.hit.clear();
    this.bits.push({ x: shot.x, y: shot.y, vx: (Math.random() - 0.5) * 40, vy: (Math.random() - 0.5) * 40, life: 0.22, color: "#ffbc0d", size: 3 });
  }

  private updateZones(dt: number) {
    for (const zone of this.zones) {
      zone.life -= dt;
      if (zone.follow) {
        zone.x = this.px;
        zone.y = this.py;
      }
      if (zone.fx === "whirl" || zone.fx === "pie" || zone.fx === "sauce") {
        const angle = this.orbitAngle * 4 + zone.x;
        this.bits.push({
          x: zone.x + Math.cos(angle) * zone.r * 0.7,
          y: zone.y + Math.sin(angle) * zone.r * 0.7,
          vx: Math.cos(angle) * 20,
          vy: Math.sin(angle) * 20,
          life: 0.25,
          color: zone.fx === "whirl" ? "#c4b5fd" : zone.fx === "pie" ? "#e7b043" : "#c48a4a",
          size: 3,
        });
      }
      if (zone.pull) {
        for (const enemy of this.enemies) {
          const dx = zone.x - enemy.x;
          const dy = zone.y - enemy.y;
          const dist = Math.hypot(dx, dy);
          if (dist > zone.r + enemy.r || dist < 10) continue;
          const step = Math.min(dist - 10, 110 * dt);
          const next = this.collide(enemy.x + (dx / dist) * step, enemy.y + (dy / dist) * step, enemy.r);
          enemy.x = next.x;
          enemy.y = next.y;
        }
      }
      zone.tick -= dt;
      if (zone.tick > 0) continue;
      zone.tick = zone.once ? 99 : 0.4;
      for (const enemy of this.enemies) {
        if (Math.hypot(zone.x - enemy.x, zone.y - enemy.y) > zone.r + enemy.r) continue;
        this.hitEnemy(enemy, zone.dmg, "zone");
        if (zone.slow) enemy.slow = Math.max(enemy.slow, 0.8);
      }
    }
    this.zones = this.zones.filter((zone) => zone.life > 0);
  }

  private lineBlock(x1: number, y1: number, x2: number, y2: number, r: number) {
    const dist = Math.hypot(x2 - x1, y2 - y1);
    const steps = Math.max(1, Math.ceil(dist / 10));
    for (let i = 1; i <= steps; i += 1) {
      const t = i / steps;
      const x = x1 + (x2 - x1) * t;
      const y = y1 + (y2 - y1) * t;
      const hit = this.blocks.find((block) => circleHits(x, y, r * 0.7, block));
      if (hit) return hit;
    }
    return null;
  }

  private clearLine(x1: number, y1: number, x2: number, y2: number, r: number) {
    const dist = Math.hypot(x2 - x1, y2 - y1);
    const steps = Math.max(1, Math.ceil(dist / 10));
    for (let i = 1; i <= steps; i += 1) {
      const t = i / steps;
      const x = x1 + (x2 - x1) * t;
      const y = y1 + (y2 - y1) * t;
      if (this.blocks.some((block) => circleHits(x, y, r * 0.7, block))) return false;
    }
    return true;
  }

  private walkPoint(x: number, y: number, r: number) {
    const clamp = (px: number, py: number) => ({
      x: Math.max(r + 8, Math.min(W - r - 8, px)),
      y: Math.max(r + 8, Math.min(H - r - 8, py)),
    });
    const point = clamp(x, y);
    if (!this.blocked(point.x, point.y, r)) return point;
    for (const dist of [18, 36, 54, 72]) {
      for (let i = 0; i < 8; i += 1) {
        const angle = (Math.PI * 2 * i) / 8;
        const next = clamp(x + Math.cos(angle) * dist, y + Math.sin(angle) * dist);
        if (!this.blocked(next.x, next.y, r)) return next;
      }
    }
    return point;
  }

  private stepChase(enemy: Enemy, speed: number, dt: number) {
    const step = speed * dt;
    if (this.clearLine(enemy.x, enemy.y, this.px, this.py, enemy.r)) {
      enemy.hasWay = false;
      const direct = Math.atan2(this.py - enemy.y, this.px - enemy.x);
      const next = this.collide(enemy.x + Math.cos(direct) * step, enemy.y + Math.sin(direct) * step, enemy.r);
      enemy.x = next.x;
      enemy.y = next.y;
      return;
    }
    if (!enemy.hasWay || Math.hypot(enemy.x - enemy.wayX, enemy.y - enemy.wayY) < 14) {
      const block = this.lineBlock(enemy.x, enemy.y, this.px, this.py, enemy.r);
      if (block) {
        const pad = enemy.r + 12;
        const corners = [
          this.walkPoint(block.x - pad, block.y - pad, enemy.r),
          this.walkPoint(block.x + block.w + pad, block.y - pad, enemy.r),
          this.walkPoint(block.x - pad, block.y + block.h + pad, enemy.r),
          this.walkPoint(block.x + block.w + pad, block.y + block.h + pad, enemy.r),
        ];
        const seen = corners.filter((point) => this.clearLine(enemy.x, enemy.y, point.x, point.y, 5));
        const pool = (seen.length ? seen : corners).sort((a, b) => {
          const cost = (point: { x: number; y: number }) => Math.hypot(point.x - enemy.x, point.y - enemy.y) + Math.hypot(this.px - point.x, this.py - point.y);
          return cost(a) - cost(b);
        });
        const open = pool.filter((point) => Math.hypot(point.x - enemy.x, point.y - enemy.y) > 36);
        const pick = (open.length ? open : pool)[Math.abs(enemy.steer) % (open.length ? open.length : pool.length)];
        enemy.wayX = pick.x;
        enemy.wayY = pick.y;
        enemy.hasWay = true;
      }
    }
    const aimX = enemy.hasWay ? enemy.wayX : this.px;
    const aimY = enemy.hasWay ? enemy.wayY : this.py;
    const angle = Math.atan2(aimY - enemy.y, aimX - enemy.x);
    const next = this.collide(enemy.x + Math.cos(angle) * step, enemy.y + Math.sin(angle) * step, enemy.r);
    if (Math.hypot(next.x - enemy.x, next.y - enemy.y) < step * 0.3) {
      enemy.steer += 1;
      enemy.hasWay = false;
    }
    enemy.x = next.x;
    enemy.y = next.y;
  }

  private updateEnemies(dt: number) {
    for (const enemy of this.enemies) {
      enemy.flash = Math.max(0, enemy.flash - dt);
      enemy.slow = Math.max(0, enemy.slow - dt);
      enemy.root = Math.max(0, enemy.root - dt);
      enemy.mark = Math.max(0, enemy.mark - dt);
      const sticky = this.slot("magnet");
      if (sticky && Math.hypot(enemy.x - this.px, enemy.y - this.py) < 48 + sticky.rank * 16 + enemy.r) enemy.slow = Math.max(enemy.slow, 0.25);
      if (enemy.burn > 0) {
        enemy.burn -= dt;
        enemy.burnTick -= dt;
        if (enemy.burnTick <= 0) {
          enemy.burnTick = 0.45;
          this.hitEnemy(enemy, enemy.burnDmg, "side");
          this.bits.push({ x: enemy.x, y: enemy.y - enemy.r, vx: (Math.random() - 0.5) * 16, vy: -24, life: 0.28, color: "#ff7a18", size: 2.4 });
        }
      }
      if (enemy.poison > 0) {
        enemy.poison -= dt;
        enemy.poisonTick -= dt;
        if (enemy.poisonTick <= 0) {
          enemy.poisonTick = 0.5;
          this.hitEnemy(enemy, enemy.poisonDmg, "side");
          this.bits.push({ x: enemy.x, y: enemy.y - enemy.r, vx: (Math.random() - 0.5) * 20, vy: -30, life: 0.35, color: "#7dbe3a", size: 3, shape: "dot" });
        }
      }
      if (enemy.haul > 0) {
        const step = Math.min(1, dt / Math.max(0.02, enemy.haul));
        enemy.x += (enemy.hx - enemy.x) * step;
        enemy.y += (enemy.hy - enemy.y) * step;
        enemy.haul = Math.max(0, enemy.haul - dt);
        this.bits.push({ x: enemy.x, y: enemy.y, vx: (Math.random() - 0.5) * 40, vy: (Math.random() - 0.5) * 40, life: 0.22, color: "#ffbc0d", size: 3 });
      }
      if (enemy.root > 0 || enemy.haul > 0) continue;
      enemy.orbCd = Math.max(0, enemy.orbCd - dt);
      enemy.cd -= dt;
      enemy.skillCd = Math.max(0, enemy.skillCd - dt);
      const slow = enemy.slow > 0 ? 0.55 : 1;
      if (enemy.dashLeft > 0) {
        enemy.dashLeft -= dt;
        const speed = enemy.kind === "boss" ? 340 : 280;
        const next = this.collide(enemy.x + Math.cos(enemy.dashAngle) * speed * dt, enemy.y + Math.sin(enemy.dashAngle) * speed * dt, enemy.r);
        enemy.x = next.x;
        enemy.y = next.y;
        if (Math.hypot(enemy.x - this.px, enemy.y - this.py) < enemy.r + 16) this.hurt(enemy.kind === "boss" ? 16 : 12);
      } else if (enemy.trick === "dash" && enemy.skillCd <= 0) {
        enemy.skillCd = enemy.kind === "boss" ? 2.4 : 3.2;
        enemy.dashLeft = enemy.kind === "boss" ? 0.42 : 0.28;
        enemy.dashAngle = Math.atan2(this.py - enemy.y, this.px - enemy.x);
      } else if (enemy.kind === "walker" || enemy.kind === "boss") {
        const speed = (enemy.kind === "boss" ? 62 : enemy.elite ? 100 : 80) * slow * enemy.pace;
        this.stepChase(enemy, speed, dt);
        if (Math.hypot(enemy.x - this.px, enemy.y - this.py) < enemy.r + 16 && enemy.cd <= 0) {
          enemy.cd = 0.5;
          this.hurt(enemy.kind === "boss" ? 18 : enemy.elite ? 16 : 10);
          const thorn = this.slot("thorn");
          if (thorn) {
            enemy.burn = Math.max(enemy.burn, 1.6);
            enemy.burnDmg = Math.max(enemy.burnDmg, 2 + thorn.rank * 2);
            enemy.burnTick = 0.2;
            enemy.slow = Math.max(enemy.slow, 0.7 + thorn.rank * 0.25);
            this.puff(enemy.x, enemy.y, "#f3e2c8", 8, 40);
          }
        }
      }
      if (enemy.kind === "turret" && enemy.cd <= 0) {
        enemy.cd = (enemy.trick === "burst" ? 1.35 : 1.7) / enemy.pace;
        this.enemyShot(enemy);
      }
      if (enemy.kind === "boss" && enemy.trick === "nova" && enemy.cd <= 0) {
        enemy.cd = 2.2;
        this.enemyShot(enemy);
      }
      if (enemy.kind === "boss" && enemy.trick === "bomb" && enemy.skillCd <= 0) {
        enemy.skillCd = 2.6;
        this.bombs.push({ x: this.px, y: this.py, fuse: 0.85, r: 64, dmg: 16 });
      }
    }
    this.enemies = this.enemies.filter((enemy) => enemy.hp > 0);
    this.updateBombs(dt);
  }

  private enemyShot(enemy: Enemy) {
    const aim = Math.atan2(this.py - enemy.y, this.px - enemy.x);
    const shots = enemy.trick === "burst"
      ? [aim - 0.28, aim, aim + 0.28]
      : enemy.kind === "boss"
        ? [0, 45, 90, 135, 180, 225, 270, 315].map((degree) => (degree * Math.PI) / 180)
        : [aim];
    for (const angle of shots) {
      this.shots.push({
        x: enemy.x,
        y: enemy.y,
        vx: Math.cos(angle) * (enemy.kind === "boss" ? 150 : 200) * Math.min(enemy.pace, 1.4),
        vy: Math.sin(angle) * (enemy.kind === "boss" ? 150 : 200) * Math.min(enemy.pace, 1.4),
        r: 5,
        dmg: enemy.kind === "boss" ? 12 : 8,
        life: 8,
        good: false,
        pierce: 0,
        hit: new Set(),
        kind: "basic",
        splitGen: 0,
        homing: 0,
        foe: enemy.kind === "boss" ? "boss" : enemy.trick === "burst" ? "fan" : "cup",
      });
    }
  }

  private updateBombs(dt: number) {
    for (const bomb of this.bombs) bomb.fuse -= dt;
    const ripe = this.bombs.filter((bomb) => bomb.fuse <= 0);
    this.bombs = this.bombs.filter((bomb) => bomb.fuse > 0);
    for (const bomb of ripe) this.boom(bomb.x, bomb.y, bomb.r, bomb.dmg);
  }

  private boom(x: number, y: number, radius: number, dmg: number) {
    this.zones.push({ x, y, r: radius, life: 0.28, span: 0.28, tick: 1, dmg: 0, slow: false });
    this.burst(x, y, "#ff8a00");
    if (Math.hypot(x - this.px, y - this.py) < radius + 16) this.hurt(dmg);
  }

  private hurt(amount: number) {
    if (this.iframe > 0 || this.hurting) return;
    this.hurting = true;
    let left = amount;
    const hadShield = this.shield;
    let blocked = 0;
    if (this.shield > 0) {
      blocked = Math.min(this.shield, left);
      this.shield -= blocked;
      left -= blocked;
      this.shieldFlash = 0.22;
      this.float(this.px, this.py - 16, `挡${Math.round(blocked)}`, "#7ec8ff", 16);
      this.burst(this.px, this.py, "#d7f4ff");
      if (left <= 0) this.iframe = Math.max(this.iframe, 0.18);
    }
    if (hadShield > 0 && this.shield <= 0) {
      this.shieldMax = 0;
      this.burst(this.px, this.py, "#fff");
      this.shieldBreak();
    }
    if (left > 0) {
      this.hp -= left;
      this.iframe = 0.45;
      this.hurtCd = 0.12;
      this.sfx.hurt();
      if (prefs.shake) this.shake = 0.08;
      this.juice(left);
    }
    const armor = this.slot("armor");
    if (armor) this.fizz(armor.rank);
    this.hurting = false;
  }

  private fizz(rank: number) {
    const radius = 64 + rank * 16;
    this.puff(this.px, this.py, "#d7f4ff", 8 + rank * 2, 110);
    this.shove(this.px, this.py, radius, 24 + rank * 12, 0.5 + rank * 0.15);
    for (const enemy of this.enemies) {
      if (Math.hypot(enemy.x - this.px, enemy.y - this.py) > radius + enemy.r) continue;
      this.hitEnemy(enemy, 2 + rank * 2, "side");
    }
  }

  private rageBonus() {
    const rage = this.slot("rage");
    if (!rage || this.rageLeft <= 0) return 0;
    const missing = Math.floor((1 - this.hp / this.maxHp) * 10);
    return missing * (rage.branch === "b" ? 3 : 2);
  }

  private giveShield(base: number) {
    const value = this.shieldValue(base);
    this.shield = Math.max(this.shield, value);
    this.shieldMax = Math.max(this.shieldMax, this.shield);
    this.shieldFlash = 0.28;
  }

  private shieldValue(base: number) {
    return base + (this.slot("thick")?.rank ?? 0) * 12;
  }

  private shieldBreak() {
    const water = this.slot("water");
    if (!water) return;
    const heal = [0, 10, 18, 26][water.rank];
    this.hp = Math.min(this.maxHp, this.hp + heal);
    this.float(this.px, this.py - 28, `+${heal}`, "#2d7dff");
    this.burst(this.px, this.py, "#7ec8ff");
  }

  private bounceFrom(shot: Shot, enemy: Enemy) {
    const bounce = this.slot("bounce");
    if (!bounce) return;
    const jumps = shot.jump ?? 0;
    if (jumps >= (bounce.rank >= 2 ? 2 : 1)) return;
    const next = this.enemies
      .filter((other) => other !== enemy && other.hp > 0)
      .sort((a, b) => Math.hypot(a.x - enemy.x, a.y - enemy.y) - Math.hypot(b.x - enemy.x, b.y - enemy.y))[0];
    if (!next || Math.hypot(next.x - enemy.x, next.y - enemy.y) > 240) return;
    const angle = Math.atan2(next.y - enemy.y, next.x - enemy.x);
    this.shots.push(this.bolt({
      x: enemy.x,
      y: enemy.y,
      vx: Math.cos(angle) * 260,
      vy: Math.sin(angle) * 260,
      r: 8,
      dmg: bounce.rank >= 3 ? shot.dmg : 7,
      life: 8,
      good: true,
      pierce: 0,
      hit: new Set([enemy.id]),
      kind: "orb",
      splitGen: 99,
      homing: 0,
      fx: "double",
      jump: jumps + 1,
    }));
  }

  private trail(shot: Shot) {
    const spray = shot.kind === "soda" || shot.fx === "fries" || shot.fx === "wasabi" || shot.fx === "nugget" || shot.fx === "cheese" || shot.fx === "steam";
    if (!spray || (shot.fx !== "cheese" && shot.fx !== "steam" && Math.random() > 0.7)) return;
    const color = shot.fx === "steam" ? "#c4a574" : shot.kind === "soda" ? "#d7f4ff" : shot.fx === "wasabi" ? "#8fd14f" : shot.fx === "cheese" ? "#ffbc0d" : shot.fx === "fries" ? "#ffbc0d" : "#f0c14a";
    this.bits.push({
      x: shot.x,
      y: shot.y,
      vx: (Math.random() - 0.5) * 30,
      vy: (Math.random() - 0.5) * 30,
      life: 0.28,
      color,
      size: shot.kind === "soda" ? 4 : 2,
    });
  }

  private juice(amount: number) {
    const juice = this.slot("juice");
    if (!juice) return;
    const line = juice.rank >= 2 ? 0.65 : 0.5;
    if (this.hp / this.maxHp > line || this.juiceCd > 0) return;
    this.juicePool += amount;
    if (this.juicePool < 15) return;
    this.juicePool = 0;
    this.juiceCd = 3;
    const heal = juice.rank >= 3 ? 16 : 8;
    this.hp = Math.min(this.maxHp, this.hp + heal);
    this.float(this.px, this.py - 28, `+${heal}`, "#db0007");
    this.burst(this.px, this.py, "#c23b22");
    this.sfx.heal();
  }

  private hitEnemy(enemy: Enemy, amount: number, source: "hit" | "zone" | "side" = "hit") {
    if (enemy.hp <= 0) return false;
    let dmg = amount * (1 + (this.slot("might")?.rank ?? 0) * 0.12);
    if (enemy.mark > 0 && source !== "side") dmg *= this.slot("brand")?.branch === "b" ? 2 : 1.5;
    const crit = this.slot("crit");
    const isCrit = Boolean(source === "hit" && crit && Math.random() < 0.12 * crit.rank);
    if (isCrit) dmg *= 2;
    enemy.hp -= dmg;
    enemy.flash = source === "side" ? 0.08 : 0.12;
    if (source !== "side") {
      this.pops.push({ x: enemy.x, y: enemy.y, life: 0.22 });
      this.float(enemy.x, enemy.y - enemy.r - 8, String(Math.round(dmg)), isCrit ? "#db0007" : "#2d2d2d", isCrit ? 26 : 16);
      this.burst(enemy.x, enemy.y, isCrit ? "#db0007" : "#ffbc0d");
      this.shake = Math.max(this.shake, isCrit ? 0.1 : 0.035);
      this.sfx.hit();
      this.spice(enemy);
      if (source === "hit") this.sauceSplash(enemy, dmg);
    }
    if (enemy.hp <= 0) this.kill(enemy);
    return isCrit;
  }

  private envenom(enemy: Enemy) {
    const glaze = this.slot("glaze");
    if (!glaze) return;
    enemy.slow = Math.max(enemy.slow, 0.5 + 0.25 * glaze.rank);
    enemy.poison = Math.max(enemy.poison, 2 + glaze.rank * 0.4);
    enemy.poisonDmg = Math.max(enemy.poisonDmg, 1 + glaze.rank);
    if (enemy.poisonTick <= 0) enemy.poisonTick = 0.2;
  }

  private spice(enemy: Enemy) {
    const gen = this.slot("gen");
    if (!gen) return;
    enemy.burn = Math.max(enemy.burn, 1.5 + gen.rank * 0.45);
    enemy.burnDmg = Math.max(enemy.burnDmg, 2 + gen.rank * 2);
    if (enemy.burnTick <= 0) enemy.burnTick = 0.2;
  }

  private sauceSplash(from: Enemy, amount: number) {
    const split = this.slot("split");
    if (!split) return;
    const count = split.rank >= 2 ? 2 : 1;
    const reach = 72 + split.rank * 18;
    const near = this.nearestFew(from.x, from.y, count + 4).filter((other) => other.id !== from.id && other.hp > 0 && Math.hypot(other.x - from.x, other.y - from.y) <= reach + other.r);
    for (const other of near.slice(0, count)) {
      this.hitEnemy(other, Math.max(4, amount * (split.rank >= 3 ? 0.45 : 0.32)), "side");
      this.puff(other.x, other.y, "#c48a4a", 5, 36);
    }
  }

  private kill(enemy: Enemy) {
    if (enemy.minion) {
      this.drops.push({ x: enemy.x, y: enemy.y, kind: "gold", amount: 1 });
      return;
    }
    if (enemy.kind === "boss" && (enemy.trick === "bomb" || enemy.trick === "nova")) this.ringShots(enemy.x, enemy.y, 12, 14);
    if (enemy.trick === "boom") {
      this.boom(enemy.x, enemy.y, 74, 12);
      if (this.wave >= 7 || this.endless) this.ringShots(enemy.x, enemy.y, 8, 8);
    }
    if (enemy.trick === "split") {
      for (const side of [-1, 1]) {
        const baby = this.makeEnemy(enemy.kind === "boss", "walker");
        baby.x = enemy.x + side * 22;
        baby.y = enemy.y;
        baby.r = enemy.kind === "boss" ? 16 : 10;
        baby.hp = baby.max = enemy.kind === "boss" ? 70 : 14;
        baby.minion = true;
        baby.trick = null;
        baby.elite = enemy.kind === "boss";
        this.enemies.push(baby);
      }
    }
    const gold = enemy.kind === "boss" ? 25 : enemy.elite ? 5 : 2;
    this.drops.push({ x: enemy.x, y: enemy.y, kind: "gold", amount: gold });
    const roll = Math.random();
    const spot = { x: enemy.x + 16, y: enemy.y };
    const spellChance = enemy.kind === "boss" ? 1 : enemy.elite ? 0.48 : 0.24;
    const spelled = this.dropSpell(spot.x, spot.y, spellChance);
    if (enemy.kind === "boss" || roll < (enemy.elite ? 0.45 : 0.22)) this.drops.push({ x: enemy.x - 16, y: enemy.y, kind: "heal", amount: 28 });
    else if (!spelled && roll < (enemy.elite ? 0.7 : 0.38)) this.drops.push({ x: enemy.x - 16, y: enemy.y, kind: "shield", amount: 24 });
  }

  private ringShots(x: number, y: number, count: number, dmg: number) {
    for (let i = 0; i < count; i += 1) {
      const angle = (Math.PI * 2 * i) / count;
      this.shots.push({
        x,
        y,
        vx: Math.cos(angle) * 160,
        vy: Math.sin(angle) * 160,
        r: 5,
        dmg,
        life: 8,
        good: false,
        pierce: 0,
        hit: new Set(),
        kind: "basic",
        splitGen: 0,
        homing: 0,
      });
    }
  }

  private dropSpell(x: number, y: number, chance: number) {
    const spells = this.unlockedSpells();
    if (!spells.length || Math.random() > chance) return false;
    const skill = spells[Math.floor(Math.random() * spells.length)];
    this.drops.push({ x, y, kind: "spell", amount: 0, skill });
    return true;
  }

  private spawnField() {
    let spot = { x: 120, y: 270 };
    for (let i = 0; i < 12; i += 1) {
      const next = { x: 70 + Math.random() * (W - 140), y: 70 + Math.random() * (H - 140) };
      spot = next;
      if (!this.blocked(next.x, next.y, 18)) break;
    }
    const hasSpell = this.unlockedSpells().length > 0;
    if (this.dropSpell(spot.x, spot.y, hasSpell ? 1 : 0)) {
      if (this.has("drops")) this.burst(spot.x, spot.y, "#7dbe3a");
      return;
    }
    const roll = Math.random();
    if (roll < 0.45) this.drops.push({ ...spot, kind: "heal", amount: 28 });
    else if (roll < 0.72) this.drops.push({ ...spot, kind: "shield", amount: 24 });
    else this.drops.push({ ...spot, kind: "gold", amount: 6 });
    if (this.has("drops")) this.burst(spot.x, spot.y, "#7dbe3a");
  }

  private updateDrops(dt: number) {
    for (const drop of [...this.drops]) {
      const swirl = this.slot("swirl");
      const reach = 36;
      if (swirl) {
        const dx = this.px - drop.x;
        const dy = this.py - drop.y;
        const dist = Math.hypot(dx, dy) || 1;
        const limit = 90 + swirl.rank * 70;
        if (dist < limit) {
          const step = Math.min(dist, (140 + swirl.rank * 80) * dt);
          drop.x += (dx / dist) * step;
          drop.y += (dy / dist) * step;
        }
      }
      if (Math.hypot(drop.x - this.px, drop.y - this.py) > reach) continue;
      this.drops.splice(this.drops.indexOf(drop), 1);
      this.applyDrop(drop);
    }
  }

  private applyDrop(drop: Drop) {
    if (drop.kind === "gold") {
      this.gold += drop.amount;
      this.float(drop.x, drop.y, `+${drop.amount}`, "#2d2d2d");
      this.sfx.pick();
    } else if (drop.kind === "heal") {
      if (this.hp >= this.maxHp) this.gold += 6;
      else {
        this.hp = Math.min(this.maxHp, this.hp + drop.amount);
        this.sfx.heal();
      }
    } else if (drop.kind === "shield") {
      this.giveShield(drop.amount);
      this.sfx.shield();
    } else if (drop.kind === "spell" && drop.skill && this.has(drop.skill)) {
      this.release(drop.skill);
      this.sfx.pick();
    }
  }

  private pulse(x: number, y: number, radius: number, dmg: number, fx?: Zone["fx"]) {
    const life = fx === "coffee" ? 0.45 : 0.3;
    this.zones.push({ x, y, r: radius, life, span: life, tick: 0, dmg, slow: false, once: true, fx });
    this.burst(x, y, fx === "coffee" ? "#6b3a1f" : fx === "slam" ? "#c4a574" : "#db0007");
  }

  private burst(x: number, y: number, color: string) {
    for (let i = 0; i < 6; i += 1) {
      const angle = (Math.PI * 2 * i) / 6 + Math.random() * 0.4;
      const speed = 50 + Math.random() * 70;
      const shape = i % 2 === 0 ? "chunk" : "dot";
      this.bits.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.22 + Math.random() * 0.12,
        color,
        size: shape === "chunk" ? 4 : 2.5,
        shape,
        rot: angle,
      });
    }
  }

  private float(x: number, y: number, text: string, color: string, size = 18) {
    this.floaters.push({ x, y, text, life: 0.7, color, size });
  }

  private aimAt() {
    const target = this.nearest(this.px, this.py);
    if (!target) return this.face;
    this.face = Math.atan2(target.y - this.py, target.x - this.px);
    return this.face;
  }

  private nearest(x: number, y: number) {
    return this.nearestFew(x, y, 1)[0] ?? null;
  }

  private nearestFew(x: number, y: number, count: number) {
    return [...this.enemies].sort((a, b) => Math.hypot(a.x - x, a.y - y) - Math.hypot(b.x - x, b.y - y)).slice(0, count);
  }

  private blocked(x: number, y: number, r: number) {
    return this.blocks.some((block) => circleHits(x, y, r, block));
  }

  private frame() {
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) {
      return { rect, scale: 1, viewW: W, viewH: H, follow: false };
    }
    const follow = rect.width < 900 || rect.height > rect.width * 1.05;
    if (!follow) {
      const scale = Math.min(rect.width / W, rect.height / H);
      return { rect, scale, viewW: W, viewH: H, follow: false };
    }
    const aspect = rect.width / Math.max(rect.height, 1);
    let viewH = H;
    let viewW = Math.min(W, viewH * aspect);
    if (viewW >= W - 1) {
      viewW = W;
      viewH = Math.min(H, viewW / Math.max(aspect, 0.01));
    } else if (aspect < 1) {
      viewW = Math.min(W * 0.48, viewW * 1.32);
      viewH = H;
    }
    const scale = Math.min(rect.width / viewW, rect.height / viewH);
    return { rect, scale, viewW, viewH, follow: true };
  }

  private aimCamera(viewW: number, viewH: number, follow: boolean) {
    if (!follow) {
      this.camX = W / 2;
      this.camY = H / 2;
      return;
    }
    const tx = Math.max(viewW / 2, Math.min(W - viewW / 2, this.px));
    const ty = Math.max(viewH / 2, Math.min(H - viewH / 2, this.py));
    this.camX += (tx - this.camX) * 0.18;
    this.camY += (ty - this.camY) * 0.18;
  }

  private drawMini(rect: DOMRect, viewW: number, viewH: number) {
    const ctx = this.ctx;
    const mw = Math.min(128, Math.max(96, rect.width * 0.34));
    const mh = mw * (H / W);
    const x = rect.width - mw - 8;
    const y = 8;
    const sx = mw / W;
    const sy = mh / H;
    ctx.save();
    roundRect(ctx, x - 4, y - 4, mw + 8, mh + 8, 10, "#fff7d6");
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, mw, mh);
    ctx.clip();
    ctx.translate(x, y);
    ctx.fillStyle = "#ffe7a3";
    ctx.fillRect(0, 0, mw, mh);
    ctx.fillStyle = "#c4a574";
    for (const block of this.blocks) ctx.fillRect(block.x * sx, block.y * sy, Math.max(2, block.w * sx), Math.max(2, block.h * sy));
    for (const enemy of this.enemies) {
      ctx.fillStyle = enemy.kind === "boss" ? "#ff7a18" : "#db0007";
      ctx.beginPath();
      ctx.arc(enemy.x * sx, enemy.y * sy, enemy.kind === "boss" ? 4 : enemy.elite ? 3 : 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
    const left = this.camX - viewW / 2;
    const top = this.camY - viewH / 2;
    ctx.strokeStyle = "#2d2d2d";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(left * sx, top * sy, viewW * sx, viewH * sy);
    ctx.fillStyle = "#fff";
    ctx.strokeStyle = "#2d2d2d";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(this.px * sx, this.py * sy, 3.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    ctx.restore();
  }

  private draw() {
    const ctx = this.ctx;
    const frame = this.frame();
    if (frame.rect.width < 2 || frame.rect.height < 2) return;
    this.aimCamera(frame.viewW, frame.viewH, frame.follow);
    const { rect, scale } = frame;
    ctx.setTransform(this.canvas.width / rect.width, 0, 0, this.canvas.height / rect.height, 0, 0);
    ctx.clearRect(0, 0, rect.width, rect.height);
    const kick = this.shake > 0 ? (Math.random() - 0.5) * this.shake * 48 : 0;
    const ox = (rect.width - frame.viewW * scale) / 2 + kick;
    const oy = (rect.height - frame.viewH * scale) / 2 + kick * 0.65;
    ctx.save();
    ctx.translate(ox, oy);
    ctx.scale(scale, scale);
    ctx.translate(-(this.camX - frame.viewW / 2), -(this.camY - frame.viewH / 2));
    const map = this.currentMap();
    const background = this.images.get(map.background);
    if (background?.complete && background.naturalWidth > 0) {
      ctx.drawImage(background, 0, 0, W, H);
    } else {
      ctx.fillStyle = "#ffe7a3";
      ctx.fillRect(0, 0, W, H);
    }
    for (const item of map.obstacles) {
      const sprite = this.images.get(item.file);
      if (sprite?.complete && sprite.naturalWidth > 0) ctx.drawImage(sprite, item.x - 4, item.y - 4, item.w + 8, item.h + 8);
    }
    for (const zone of this.zones) this.drawZone(zone);
    for (const bomb of this.bombs) {
      ctx.beginPath();
      ctx.strokeStyle = "#ff8a00";
      ctx.lineWidth = 3;
      ctx.arc(bomb.x, bomb.y, bomb.r * (1 - bomb.fuse / 0.85), 0, Math.PI * 2);
      ctx.stroke();
    }
    for (const enemy of this.enemies) this.drawEnemy(enemy);
    for (const shot of this.shots) this.drawShot(shot);
    for (const drop of this.drops) this.drawDrop(drop);
    for (const pop of this.pops) {
      paintFx(ctx, "fx/fx-hit.png", pop.x, pop.y, 36 + (0.28 - pop.life) * 90, 36 + (0.28 - pop.life) * 90);
      this.drawHitPop(pop);
    }
    for (const ball of this.orbitBalls()) drawBurger(this.ctx, ball.x, ball.y, ball.heavy ? 1.4 : 1, ball.heavy);
    this.drawPlayer();
    for (const bit of this.bits) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, bit.life * 2.6));
      ctx.translate(bit.x, bit.y);
      ctx.rotate(bit.rot ?? 0);
      ctx.fillStyle = bit.color;
      if (bit.shape === "dash") {
        ctx.fillRect(-bit.size * 1.8, -1.6, bit.size * 3.6, 3.2);
      } else if (bit.shape === "chunk") {
        ctx.beginPath();
        ctx.roundRect(-bit.size / 2, -bit.size * 0.36, bit.size, bit.size * 0.72, 2);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, bit.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
    ctx.textAlign = "center";
    for (const floater of this.floaters) {
      ctx.font = `700 ${floater.size}px Fredoka, sans-serif`;
      ctx.lineWidth = floater.size > 22 ? 6 : 4;
      ctx.strokeStyle = "#fff";
      ctx.strokeText(floater.text, floater.x, floater.y - (0.7 - floater.life) * 28);
      ctx.fillStyle = floater.color;
      ctx.fillText(floater.text, floater.x, floater.y - (0.7 - floater.life) * 28);
    }
    ctx.restore();
    if (frame.follow) this.drawMini(rect, frame.viewW, frame.viewH);
  }

  private carriedImage() {
    for (let index = this.slots.length - 1; index >= 0; index -= 1) {
      const slot = this.slots[index];
      if (slot) return skillById[slot.id].image;
    }
    return "";
  }

  private drawZone(zone: Zone) {
    const ctx = this.ctx;
    if (zone.fx === "pop") {
      const t = 1 - zone.life / Math.max(0.01, zone.span);
      ctx.globalAlpha = Math.max(0, 1 - t);
      ctx.strokeStyle = "#ffbc0d";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(zone.x, zone.y, Math.max(8, zone.r * t), 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
      return;
    }
    if (zone.fx === "ice") {
      const shown = Math.max(20, zone.r * (1 - zone.life / zone.span));
      ctx.beginPath();
      ctx.fillStyle = "rgba(220,246,255,.35)";
      ctx.arc(zone.x, zone.y, shown, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 6;
      ctx.stroke();
      for (let i = 0; i < 10; i += 1) {
        const angle = (Math.PI * 2 * i) / 10;
        drawShard(ctx, zone.x + Math.cos(angle) * shown, zone.y + Math.sin(angle) * shown, angle);
      }
      return;
    }
    if (zone.fx === "frost") {
      ctx.beginPath();
      ctx.fillStyle = "rgba(210,240,255,.4)";
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 3;
      ctx.arc(zone.x, zone.y, zone.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      return;
    }
    if (zone.fx === "sauce" || zone.fx === "paste") {
      ctx.beginPath();
      ctx.fillStyle = zone.fx === "paste" ? "rgba(126,190,48,.7)" : "rgba(166,92,46,.72)";
      ctx.ellipse(zone.x, zone.y, zone.r, zone.r * 0.62, 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.fillStyle = zone.fx === "paste" ? "rgba(220,255,160,.5)" : "rgba(255,220,160,.55)";
      ctx.ellipse(zone.x - zone.r * 0.2, zone.y - zone.r * 0.12, zone.r * 0.28, zone.r * 0.12, -0.4, 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    if (zone.fx === "pie") {
      ctx.beginPath();
      ctx.fillStyle = "#f2c14e";
      ctx.strokeStyle = "#8a4b12";
      ctx.lineWidth = 5;
      ctx.arc(zone.x, zone.y, zone.r * 0.72, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.fillStyle = "#db0007";
      ctx.moveTo(zone.x, zone.y);
      ctx.arc(zone.x, zone.y, zone.r * 0.42, -0.4, 1.1);
      ctx.closePath();
      ctx.fill();
      return;
    }
    if (zone.fx === "wasabi" && zone.aim !== undefined) {
      const width = zone.fan ?? 0.45;
      const reach = zone.r;
      if (!paintFx(ctx, "fx/fx-wasabi.png", zone.x + Math.cos(zone.aim) * reach * 0.45, zone.y + Math.sin(zone.aim) * reach * 0.45, reach * 0.9, reach * 0.7, zone.aim)) {
        ctx.save();
        ctx.translate(zone.x, zone.y);
        ctx.rotate(zone.aim);
        ctx.fillStyle = "rgba(126,190,48,.55)";
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, zone.r, -width, width);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = "#e8ffb0";
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.restore();
      }
      return;
    }
    if (zone.fx === "coffee") {
      const shown = Math.max(16, zone.r * (1 - zone.life / zone.span));
      ctx.beginPath();
      ctx.strokeStyle = "#6b3a1f";
      ctx.lineWidth = 8;
      ctx.arc(zone.x, zone.y, shown, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = "#f3e2c4";
      for (let i = 0; i < 6; i += 1) {
        const angle = (Math.PI * 2 * i) / 6;
        ctx.beginPath();
        ctx.arc(zone.x + Math.cos(angle) * shown, zone.y + Math.sin(angle) * shown, 4, 0, Math.PI * 2);
        ctx.fill();
      }
      return;
    }
    if (zone.fx === "slam") {
      ctx.beginPath();
      ctx.fillStyle = "rgba(196,165,116,.45)";
      ctx.ellipse(zone.x, zone.y, zone.r, zone.r * 0.42, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#e2b15a";
      ctx.strokeStyle = "#8a5a10";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(zone.x, zone.y, 22, 12, 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      return;
    }
    if (zone.fx === "rain") {
      const nugget = Math.round(zone.x + zone.y) % 2 === 0;
      ctx.beginPath();
      ctx.fillStyle = "rgba(45,45,45,.18)";
      ctx.ellipse(zone.x, zone.y + 14, nugget ? 10 : 6, 3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.save();
      ctx.translate(zone.x, zone.y);
      if (nugget) {
        ctx.fillStyle = "#f0b429";
        ctx.strokeStyle = "#8a5a10";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(0, 0, 9, 6, 0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } else {
        ctx.rotate(-0.6);
        ctx.fillStyle = "#ffbc0d";
        ctx.strokeStyle = "#2d2d2d";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(-3, -10, 6, 18, 2);
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();
      return;
    }
    if (zone.fx === "whirl") {
      ctx.save();
      ctx.translate(zone.x, zone.y);
      ctx.rotate(this.orbitAngle * 3);
      ctx.strokeStyle = "rgba(123,63,228,.85)";
      ctx.lineWidth = 4;
      for (let i = 0; i < 3; i += 1) {
        ctx.beginPath();
        ctx.arc(0, 0, zone.r * (0.45 + i * 0.18), i, i + 1.4);
        ctx.stroke();
      }
      ctx.restore();
      ctx.beginPath();
      ctx.fillStyle = "rgba(123,63,228,.16)";
      ctx.arc(zone.x, zone.y, zone.r, 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    ctx.beginPath();
    ctx.fillStyle = zone.slow ? "rgba(255,188,13,.28)" : "rgba(219,0,7,.16)";
    ctx.arc(zone.x, zone.y, zone.r, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawShot(shot: Shot) {
    const ctx = this.ctx;
    const speed = Math.hypot(shot.vx, shot.vy);
    if (speed > 40) {
      const ux = shot.vx / speed;
      const uy = shot.vy / speed;
      const len = 12;
      const trail = ctx.createLinearGradient(shot.x, shot.y, shot.x - ux * len, shot.y - uy * len);
      const head = shot.venom ? "rgba(90,160,40,.8)" : shot.flame ? "rgba(255,122,24,.85)" : shot.chili ? "rgba(219,0,7,.8)" : shot.fish ? "rgba(226,160,74,.85)" : shot.fx === "steam" ? "rgba(107,58,31,.75)" : shot.kind === "soda" ? "rgba(190,230,255,.8)" : "rgba(255,188,13,.7)";
      trail.addColorStop(0, head);
      trail.addColorStop(1, "rgba(255,188,13,0)");
      ctx.strokeStyle = trail;
      ctx.lineWidth = 2.5;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(shot.x, shot.y);
      ctx.lineTo(shot.x - ux * len, shot.y - uy * len);
      ctx.stroke();
    }
    if (shot.kind === "soda") {
      drawSoda(ctx, shot);
      return;
    }
    if (shot.fx === "fries") {
      drawFries(ctx, shot);
      return;
    }
    if (shot.fx === "wasabi") {
      drawWasabi(ctx, shot);
      return;
    }
    if (shot.fx === "nugget") {
      drawNugget(ctx, shot);
      return;
    }
    if (shot.fx === "wing") {
      drawWing(ctx, shot);
      return;
    }
    if (shot.fx === "double") {
      drawDouble(ctx, shot);
      return;
    }
    if (shot.fx === "fillet") {
      drawFillet(ctx, shot);
      return;
    }
    if (shot.fx === "patty") {
      drawPatty(ctx, shot);
      return;
    }
    if (shot.fx === "steam") {
      ctx.save();
      ctx.translate(shot.x, shot.y);
      ctx.rotate(Math.atan2(shot.vy, shot.vx));
      ctx.fillStyle = "#6b3a1f";
      ctx.beginPath();
      ctx.ellipse(-6, 0, 16, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,.7)";
      ctx.beginPath();
      ctx.arc(8, -6, 3, 0, Math.PI * 2);
      ctx.arc(12, -10, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }
    if (shot.fx === "cheese") {
      ctx.strokeStyle = "#ffbc0d";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(this.px, this.py);
      ctx.lineTo(shot.x, shot.y);
      ctx.stroke();
      ctx.save();
      ctx.translate(shot.x, shot.y);
      ctx.rotate(Math.atan2(shot.vy, shot.vx));
      ctx.strokeStyle = "#ffbc0d";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(-28, 0);
      ctx.quadraticCurveTo(-8, -8, 10, 0);
      ctx.quadraticCurveTo(-8, 8, -28, 0);
      ctx.stroke();
      ctx.fillStyle = "#fff2b0";
      ctx.beginPath();
      ctx.arc(12, 0, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }
    if (shot.kind === "basic" && shot.good && !shot.fx) {
      drawSeasonShot(ctx, shot);
      return;
    }
    if (!shot.good) {
      drawFoeShot(ctx, shot);
      return;
    }
    ctx.save();
    ctx.translate(shot.x, shot.y);
    ctx.rotate(Math.atan2(shot.vy, shot.vx));
    roundRect(ctx, -10, -shot.r, 16, shot.r * 2, 4, shot.good ? "#db0007" : "#2d2d2d");
    ctx.restore();
  }

  private drawPlayer() {
    const ctx = this.ctx;
    this.drawAuras();
    if (this.has("gen")) {
      ctx.fillStyle = "#db0007";
      for (let i = 0; i < 3; i += 1) {
        const angle = this.orbitAngle * 5 + i * 2;
        ctx.beginPath();
        ctx.arc(this.px + Math.cos(angle) * 20, this.py - 16 + Math.sin(angle) * 4, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    if (this.rageLeft > 0) {
      ctx.strokeStyle = "#ff7a18";
      ctx.lineWidth = 3;
      for (let i = 0; i < 5; i += 1) {
        const angle = this.orbitAngle * 3 + (Math.PI * 2 * i) / 5;
        ctx.beginPath();
        ctx.moveTo(this.px + Math.cos(angle) * 18, this.py + Math.sin(angle) * 18);
        ctx.lineTo(this.px + Math.cos(angle) * 28, this.py + Math.sin(angle) * 28 - 8);
        ctx.stroke();
      }
    }
    if (this.teaLeft > 0) {
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(this.px - 6, this.py - 22, 6, Math.PI, 0);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(this.px + 6, this.py - 26, 5, Math.PI, 0);
      ctx.stroke();
    }
    const cola = this.slot("cola");
    if (cola && this.hp < this.maxHp * 0.5) {
      ctx.strokeStyle = "#6b3a1f";
      ctx.lineWidth = 2;
      for (let i = 1; i <= cola.rank + 1; i += 1) {
        ctx.beginPath();
        ctx.moveTo(this.px - Math.cos(this.face) * (16 + i * 7), this.py - Math.sin(this.face) * (16 + i * 7));
        ctx.lineTo(this.px - Math.cos(this.face) * (22 + i * 7), this.py - Math.sin(this.face) * (22 + i * 7));
        ctx.stroke();
      }
    }
    if (this.coffeeLeft > 0) {
      ctx.strokeStyle = "#6b3a1f";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(this.px + 8, this.py - 24, 5, Math.PI, 0);
      ctx.stroke();
    }
    if (this.has("magnet")) {
      const reach = 48 + (this.slot("magnet")?.rank ?? 1) * 16;
      ctx.beginPath();
      ctx.strokeStyle = "rgba(196,138,74,.8)";
      ctx.lineWidth = 3;
      ctx.arc(this.px, this.py, reach, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (this.has("swirl")) {
      ctx.beginPath();
      ctx.strokeStyle = "rgba(139,94,60,.55)";
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 5]);
      ctx.arc(this.px, this.py, 90 + (this.slot("swirl")?.rank ?? 1) * 70, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    if (this.has("armor")) {
      const rank = this.slot("armor")?.rank ?? 1;
      ctx.fillStyle = "rgba(180,230,255,.8)";
      for (let i = 0; i < rank + 1; i += 1) {
        const angle = this.orbitAngle + (Math.PI * 2 * i) / (rank + 1);
        ctx.beginPath();
        ctx.arc(this.px + Math.cos(angle) * 22, this.py + Math.sin(angle) * 22, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    const carried = this.carriedImage();
    if (this.shield > 0 && this.has("milk") && carried !== skillById.milk.image) drawStamp(ctx, skillById.milk.image, this.px - 18, this.py - 20, 22);
    if (this.hurtCd > 0) {
      ctx.save();
      ctx.translate(this.px, this.py);
      ctx.scale(1.06, 0.94);
      ctx.translate(-this.px, -this.py);
    }
    ctx.beginPath();
    ctx.fillStyle = "rgba(45,45,45,.2)";
    ctx.ellipse(this.px, this.py + 14, 12, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffbc0d";
    ctx.beginPath();
    ctx.ellipse(this.px - 7, this.py + 12, 5, 3, 0, 0, Math.PI * 2);
    ctx.ellipse(this.px + 7, this.py + 12, 5, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.fillStyle = this.hurtCd > 0 ? "#ffd0d0" : "#fffdf6";
    ctx.strokeStyle = "#2d2d2d";
    ctx.lineWidth = 3;
    ctx.arc(this.px, this.py, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#fffdf6";
    ctx.strokeStyle = "#2d2d2d";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(this.px - 15, this.py + 2, 5, 0, Math.PI * 2);
    ctx.arc(this.px + 15, this.py + 2, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#db0007";
    ctx.beginPath();
    ctx.moveTo(this.px - 7, this.py + 6);
    ctx.lineTo(this.px + 7, this.py + 6);
    ctx.lineTo(this.px + 5, this.py + 14);
    ctx.lineTo(this.px - 5, this.py + 14);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#ffd0d0";
    ctx.beginPath();
    ctx.arc(this.px - 8, this.py - 1, 2.4, 0, Math.PI * 2);
    ctx.arc(this.px + 8, this.py - 1, 2.4, 0, Math.PI * 2);
    ctx.fill();
    if (carried) drawStamp(ctx, carried, this.px + 18, this.py + 8, 26);
    ctx.save();
    ctx.translate(this.px, this.py);
    ctx.rotate(this.face - Math.PI / 2);
    roundRect(ctx, -11, -22, 22, 12, 5, "#db0007");
    ctx.fillStyle = "#ffbc0d";
    ctx.fillRect(-11, -14, 22, 3);
    ctx.restore();
    ctx.fillStyle = "#2d2d2d";
    ctx.beginPath();
    ctx.arc(this.px - 5, this.py - 2, 2.2, 0, Math.PI * 2);
    ctx.arc(this.px + 5, this.py - 2, 2.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#2d2d2d";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(this.px, this.py + 4, 3.5, 0.2, Math.PI - 0.2);
    ctx.stroke();
    if (this.hurtCd > 0) ctx.restore();
    this.drawShell();
  }

  private drawAuras() {
    const ctx = this.ctx;
    if (this.has("haste")) {
      ctx.strokeStyle = "rgba(107,58,31,.7)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(this.px - 8, this.py - 20, 4, Math.PI, 0);
      ctx.stroke();
    }
    if (this.has("might")) {
      ctx.strokeStyle = "rgba(196,81,26,.8)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(this.px, this.py, 20, this.orbitAngle, this.orbitAngle + 1.2);
      ctx.stroke();
    }
    if (this.has("lemon")) {
      ctx.fillStyle = "#c6e34a";
      for (let i = 0; i < 3; i += 1) {
        const angle = -this.orbitAngle * 2 + (Math.PI * 2 * i) / 3;
        ctx.beginPath();
        ctx.arc(this.px + Math.cos(angle) * 18, this.py + Math.sin(angle) * 18, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    if (this.has("cocoa")) {
      ctx.strokeStyle = "rgba(107,58,31,.45)";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(this.px, this.py, 18 + Math.sin(this.orbitAngle * 2) * 1.5, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (this.has("twin")) {
      ctx.fillStyle = "#ffbc0d";
      ctx.fillRect(this.px + 12, this.py - 8, 4, 4);
      ctx.fillRect(this.px + 18, this.py - 4, 4, 4);
    }
  }

  private drawShell() {
    if (this.shield <= 0 || this.shieldMax <= 0) return;
    const ctx = this.ctx;
    const ratio = Math.max(0.08, Math.min(1, this.shield / this.shieldMax));
    const milky = this.has("milk");
    const color = this.has("thick") ? "#ff9a1f" : milky ? "#f4fbff" : "#ffbc0d";
    const radius = 28 + (this.shieldFlash > 0 ? 3 : 0);
    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,.35)";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(this.px, this.py, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = color;
    ctx.lineWidth = 4 + (this.slot("thick")?.rank ?? 0);
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.arc(this.px, this.py, radius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ratio);
    ctx.stroke();
    if (this.shieldFlash > 0) {
      ctx.globalAlpha = this.shieldFlash * 2;
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(this.px, this.py, radius + 6, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawEnemy(enemy: Enemy) {
    const ctx = this.ctx;
    const fill = enemy.flash > 0 ? "#ffffff" : enemy.trick === "boom" || enemy.trick === "bomb" ? "#ff7a18" : "#db0007";
    if (enemy.slow > 0) {
      ctx.fillStyle = "rgba(90,60,30,.35)";
      ctx.beginPath();
      ctx.ellipse(enemy.x, enemy.y + enemy.r * 0.9, enemy.r * 0.8, enemy.r * 0.28, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    if (enemy.mark > 0) {
      ctx.save();
      ctx.translate(enemy.x, enemy.y - enemy.r - 8);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = "#db0007";
      ctx.strokeStyle = "#ffbc0d";
      ctx.lineWidth = 2;
      ctx.fillRect(-5, -5, 10, 10);
      ctx.strokeRect(-5, -5, 10, 10);
      ctx.restore();
    }
    if (enemy.burn > 0) {
      ctx.fillStyle = "#ff7a18";
      for (let i = 0; i < 2; i += 1) {
        const wobble = Math.sin(this.orbitAngle * 8 + i) * 2;
        ctx.beginPath();
        ctx.moveTo(enemy.x - 6 + i * 8, enemy.y - enemy.r - 2);
        ctx.lineTo(enemy.x - 3 + i * 8 + wobble, enemy.y - enemy.r - 10);
        ctx.lineTo(enemy.x + i * 8, enemy.y - enemy.r - 2);
        ctx.fill();
      }
    }
    if (enemy.poison > 0) {
      ctx.fillStyle = "#7dbe3a";
      for (let i = 0; i < 2; i += 1) {
        const bob = Math.sin(this.orbitAngle * 6 + i) * 2;
        ctx.beginPath();
        ctx.arc(enemy.x + 6 + i * 4, enemy.y - enemy.r - 6 + bob, 2.4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    if (enemy.root > 0) {
      ctx.strokeStyle = "#f4fbff";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(enemy.x - 8, enemy.y + enemy.r - 2);
      ctx.lineTo(enemy.x - 2, enemy.y + enemy.r + 4);
      ctx.moveTo(enemy.x + 8, enemy.y + enemy.r - 2);
      ctx.lineTo(enemy.x + 2, enemy.y + enemy.r + 4);
      ctx.stroke();
    }
    const punch = enemy.flash > 0 ? enemy.flash / 0.16 : 0;
    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    ctx.scale(1 + punch * 0.16, 1 - punch * 0.1);
    ctx.translate(-enemy.x, -enemy.y);
    const bob = Math.sin(this.orbitAngle * 6 + enemy.id) * 1.5;
    const step = Math.sin(this.orbitAngle * 10 + enemy.id) * 3;
    ctx.fillStyle = "rgba(45,45,45,.18)";
    ctx.beginPath();
    ctx.ellipse(enemy.x, enemy.y + enemy.r * 0.85, enemy.r * 0.9, enemy.r * 0.32, 0, 0, Math.PI * 2);
    ctx.fill();
    if (enemy.kind === "turret") this.drawCup(enemy, fill);
    else if (enemy.kind === "boss") this.drawBossBurger(enemy, fill);
    else if (enemy.trick === "dash") this.drawCharger(enemy, fill, step);
    else if (enemy.trick === "boom") this.drawFriesBox(enemy, fill, bob);
    else if (enemy.trick === "split") this.drawNugget(enemy, fill);
    else this.drawBlob(enemy, fill, step, bob);
    ctx.restore();
    this.drawBar(enemy);
  }

  private drawEyes(x: number, y: number, gap: number, size: number, angry = false) {
    const ctx = this.ctx;
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(x - gap, y, size, 0, Math.PI * 2);
    ctx.arc(x + gap, y, size, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#2d2d2d";
    ctx.beginPath();
    ctx.arc(x - gap, y + 0.6, size * 0.45, 0, Math.PI * 2);
    ctx.arc(x + gap, y + 0.6, size * 0.45, 0, Math.PI * 2);
    ctx.fill();
    if (!angry) return;
    ctx.strokeStyle = "#2d2d2d";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - gap - size, y - size - 1);
    ctx.lineTo(x - gap + size * 0.4, y - size + 2);
    ctx.moveTo(x + gap + size, y - size - 1);
    ctx.lineTo(x + gap - size * 0.4, y - size + 2);
    ctx.stroke();
  }

  private drawBlob(enemy: Enemy, fill: string, step: number, bob: number) {
    const ctx = this.ctx;
    ctx.fillStyle = "#ffbc0d";
    ctx.beginPath();
    ctx.ellipse(enemy.x - 7 + step * 0.15, enemy.y + enemy.r + 1, 5, 3, 0, 0, Math.PI * 2);
    ctx.ellipse(enemy.x + 7 - step * 0.15, enemy.y + enemy.r + 1, 5, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#2d2d2d";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = fill;
    ctx.strokeStyle = enemy.elite ? "#ffbc0d" : "#2d2d2d";
    ctx.lineWidth = enemy.elite ? 4 : 3;
    ctx.beginPath();
    ctx.ellipse(enemy.x, enemy.y + bob * 0.2, enemy.r, enemy.r * 0.92, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,.35)";
    ctx.beginPath();
    ctx.ellipse(enemy.x, enemy.y + enemy.r * 0.35, 3, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,.28)";
    ctx.beginPath();
    ctx.arc(enemy.x - enemy.r * 0.28, enemy.y - enemy.r * 0.28, enemy.r * 0.28, 0, Math.PI * 2);
    ctx.fill();
    this.drawEyes(enemy.x, enemy.y - 1, 4, 3, true);
  }

  private drawCup(enemy: Enemy, fill: string) {
    const ctx = this.ctx;
    const w = enemy.r * 1.7;
    const h = enemy.r * 2.1;
    ctx.fillStyle = fill;
    ctx.strokeStyle = "#2d2d2d";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(enemy.x - w * 0.42, enemy.y - h * 0.2);
    ctx.lineTo(enemy.x + w * 0.42, enemy.y - h * 0.2);
    ctx.lineTo(enemy.x + w * 0.55, enemy.y + h * 0.55);
    ctx.lineTo(enemy.x - w * 0.55, enemy.y + h * 0.55);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#fff";
    ctx.fillRect(enemy.x - w * 0.38, enemy.y + 1, w * 0.76, 5);
    ctx.fillStyle = "#ffbc0d";
    ctx.beginPath();
    ctx.ellipse(enemy.x, enemy.y - h * 0.28, w * 0.5, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = "#db0007";
    ctx.lineWidth = 3;
    const straws = enemy.trick === "burst" ? [-5, 5] : [0];
    for (const side of straws) {
      ctx.beginPath();
      ctx.moveTo(enemy.x + side, enemy.y - h * 0.25);
      ctx.lineTo(enemy.x + side + (side === 0 ? 4 : side), enemy.y - h * 0.85);
      ctx.stroke();
    }
    this.drawEyes(enemy.x, enemy.y + 2, 4, 2.4, false);
  }

  private drawCharger(enemy: Enemy, fill: string, step: number) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    if (enemy.dashLeft > 0) ctx.rotate(enemy.dashAngle);
    const r = enemy.r;
    ctx.fillStyle = "#f6d48a";
    ctx.strokeStyle = "#2d2d2d";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, r * 0.62, r * 0.85, r * 0.28, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#6b3a1f";
    ctx.beginPath();
    ctx.ellipse(0, r * 0.28, r * 0.72, r * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#7dbe3a";
    ctx.fillRect(-r * 0.7, r * 0.18, r * 1.4, r * 0.12);
    ctx.fillStyle = "#ffbc0d";
    ctx.fillRect(-r * 0.82, r * 0.05, r * 1.64, r * 0.14);
    ctx.fillStyle = fill;
    ctx.strokeStyle = "#2d2d2d";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(0, r * 0.02, r * 0.9, r * 0.46, 0, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#fff6cf";
    for (const spot of [-r * 0.35, 0, r * 0.35]) {
      ctx.beginPath();
      ctx.arc(spot, -r * 0.22, 2, 0, Math.PI * 2);
      ctx.fill();
    }
    if (enemy.dashLeft > 0) {
      ctx.strokeStyle = "rgba(255,188,13,.8)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-enemy.r - 8, step);
      ctx.lineTo(-enemy.r - 18, step);
      ctx.stroke();
    }
    ctx.restore();
    this.drawEyes(enemy.x, enemy.y - enemy.r * 0.16, 4, 2.2, true);
  }

  private drawFriesBox(enemy: Enemy, fill: string, bob: number) {
    const ctx = this.ctx;
    ctx.fillStyle = "#ffbc0d";
    ctx.strokeStyle = "#2d2d2d";
    ctx.lineWidth = 2;
    for (let i = -1; i <= 1; i += 1) {
      const fryY = enemy.y - enemy.r - 10 + bob + Math.abs(i) * 2;
      ctx.fillRect(enemy.x + i * 7 - 2.5, fryY, 5, 18);
      ctx.strokeRect(enemy.x + i * 7 - 2.5, fryY, 5, 18);
    }
    roundRect(ctx, enemy.x - enemy.r, enemy.y - enemy.r * 0.15, enemy.r * 2, enemy.r * 1.35, 4, fill);
    ctx.fillStyle = "#fff";
    ctx.fillRect(enemy.x - enemy.r + 3, enemy.y + 2, enemy.r * 2 - 6, 4);
    this.drawEyes(enemy.x, enemy.y + 4, 4, 2.4, true);
  }

  private drawNugget(enemy: Enemy, fill: string) {
    const ctx = this.ctx;
    ctx.fillStyle = fill === "#ffffff" ? "#fff" : "#e2a400";
    ctx.strokeStyle = "#2d2d2d";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(enemy.x, enemy.y - enemy.r);
    ctx.quadraticCurveTo(enemy.x + enemy.r + 4, enemy.y - 4, enemy.x + enemy.r * 0.4, enemy.y + enemy.r);
    ctx.quadraticCurveTo(enemy.x, enemy.y + enemy.r + 4, enemy.x - enemy.r * 0.5, enemy.y + enemy.r * 0.6);
    ctx.quadraticCurveTo(enemy.x - enemy.r - 4, enemy.y, enemy.x, enemy.y - enemy.r);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(enemy.x, enemy.y - enemy.r * 0.4);
    ctx.lineTo(enemy.x, enemy.y + enemy.r * 0.45);
    ctx.stroke();
    this.drawEyes(enemy.x, enemy.y, 4, 2.4, false);
  }

  private drawBossBurger(enemy: Enemy, fill: string) {
    const ctx = this.ctx;
    const r = enemy.r;
    ctx.fillStyle = "#f3d38a";
    ctx.beginPath();
    ctx.ellipse(enemy.x, enemy.y + r * 0.55, r + 6, r * 0.38, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#2d2d2d";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = "#6b3a1f";
    ctx.beginPath();
    ctx.ellipse(enemy.x, enemy.y + r * 0.28, r * 0.72, r * 0.16, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#7dbe3a";
    ctx.fillRect(enemy.x - r * 0.8, enemy.y + r * 0.1, r * 1.6, r * 0.12);
    ctx.fillStyle = "#ffbc0d";
    ctx.fillRect(enemy.x - r * 0.85, enemy.y + r * 0.02, r * 1.7, r * 0.12);
    ctx.fillStyle = fill;
    ctx.strokeStyle = "#2d2d2d";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(enemy.x, enemy.y - r * 0.02, r + 2, r * 0.5, 0, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#fff6cf";
    for (const spot of [-10, -3, 4, 11]) {
      ctx.beginPath();
      ctx.arc(enemy.x + spot, enemy.y - r * 0.28, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
    if (enemy.trick === "bomb") {
      ctx.strokeStyle = "#2d2d2d";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(enemy.x + r * 0.4, enemy.y - r * 0.7);
      ctx.quadraticCurveTo(enemy.x + r, enemy.y - r * 1.3, enemy.x + r * 0.7, enemy.y - r * 1.15);
      ctx.stroke();
      ctx.fillStyle = "#ff7a18";
      ctx.beginPath();
      ctx.arc(enemy.x + r * 0.7, enemy.y - r * 1.15, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    this.drawEyes(enemy.x, enemy.y - r * 0.22, 6, 3, true);
  }

  private drawHitPop(pop: { x: number; y: number; life: number }) {
    const ctx = this.ctx;
    const t = 1 - pop.life / 0.22;
    ctx.save();
    ctx.translate(pop.x, pop.y);
    ctx.globalAlpha = Math.max(0, 0.85 - t);
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 6 + t * 10, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = "#ffbc0d";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    for (let i = 0; i < 4; i += 1) {
      const angle = (Math.PI / 2) * i + 0.4;
      ctx.beginPath();
      ctx.moveTo(Math.cos(angle) * 5, Math.sin(angle) * 5);
      ctx.lineTo(Math.cos(angle) * (10 + t * 8), Math.sin(angle) * (10 + t * 8));
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawBar(enemy: Enemy) {
    const ctx = this.ctx;
    const width = enemy.kind === "boss" ? 54 : enemy.elite ? 36 : 28;
    const x = enemy.x - width / 2;
    const y = enemy.y - enemy.r - 12;
    ctx.fillStyle = "#2d2d2d";
    ctx.fillRect(x - 1, y - 1, width + 2, 6);
    ctx.fillStyle = "#fff";
    ctx.fillRect(x, y, width, 4);
    ctx.fillStyle = enemy.hp / enemy.max < 0.35 ? "#db0007" : "#ffbc0d";
    ctx.fillRect(x, y, Math.max(0, width * (enemy.hp / enemy.max)), 4);
  }

  private drawDrop(drop: Drop) {
    const ctx = this.ctx;
    const bob = Math.sin(this.orbitAngle * 3 + drop.x * 0.4) * 4;
    const y = drop.y + bob;
    ctx.beginPath();
    ctx.fillStyle = "rgba(255,255,255,.9)";
    ctx.arc(drop.x, y, drop.kind === "spell" ? 26 : 22, 0, Math.PI * 2);
    ctx.fill();
    if (drop.kind === "gold") {
      ctx.beginPath();
      ctx.fillStyle = "#ffbc0d";
      ctx.strokeStyle = "#2d2d2d";
      ctx.lineWidth = 3;
      ctx.arc(drop.x, y, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.strokeStyle = "#fff6cf";
      ctx.lineWidth = 2;
      ctx.arc(drop.x, y, 9, 0, Math.PI * 2);
      ctx.stroke();
      return;
    }
    if (drop.kind === "heal") {
      ctx.beginPath();
      ctx.fillStyle = "#fff";
      ctx.strokeStyle = "#db0007";
      ctx.lineWidth = 3;
      ctx.arc(drop.x, y, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = "#db0007";
      ctx.lineWidth = 5;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(drop.x - 8, y);
      ctx.lineTo(drop.x + 8, y);
      ctx.moveTo(drop.x, y - 8);
      ctx.lineTo(drop.x, y + 8);
      ctx.stroke();
      ctx.lineCap = "butt";
      return;
    }
    if (drop.kind === "shield") {
      ctx.beginPath();
      ctx.fillStyle = "#fff";
      ctx.strokeStyle = "#2d2d2d";
      ctx.lineWidth = 3;
      ctx.arc(drop.x, y, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.fillStyle = "#ffbc0d";
      ctx.strokeStyle = "#2d2d2d";
      ctx.lineWidth = 2;
      ctx.moveTo(drop.x, y - 9);
      ctx.lineTo(drop.x + 8, y - 5);
      ctx.lineTo(drop.x + 7, y + 3);
      ctx.quadraticCurveTo(drop.x, y + 11, drop.x - 7, y + 3);
      ctx.lineTo(drop.x - 8, y - 5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      return;
    }
    const skill = drop.skill ? skillById[drop.skill] : null;
    ctx.beginPath();
    ctx.fillStyle = "#fff8e0";
    ctx.strokeStyle = "#db0007";
    ctx.lineWidth = 3;
    ctx.arc(drop.x, y, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    if (skill) drawStamp(ctx, skill.image, drop.x, y, 34);
  }
}

function pushOut(x: number, y: number, r: number, rect: Rect) {
  const cx = Math.max(rect.x, Math.min(x, rect.x + rect.w));
  const cy = Math.max(rect.y, Math.min(y, rect.y + rect.h));
  const dx = x - cx;
  const dy = y - cy;
  const dist = dx * dx + dy * dy;
  if (dist >= r * r) return { x, y };
  if (dist === 0) {
    const left = x - rect.x;
    const right = rect.x + rect.w - x;
    const top = y - rect.y;
    const bottom = rect.y + rect.h - y;
    const min = Math.min(left, right, top, bottom);
    if (min === left) return { x: rect.x - r, y };
    if (min === right) return { x: rect.x + rect.w + r, y };
    if (min === top) return { x, y: rect.y - r };
    return { x, y: rect.y + rect.h + r };
  }
  const d = Math.sqrt(dist);
  return { x: cx + (dx / d) * r, y: cy + (dy / d) * r };
}

function circleHits(x: number, y: number, r: number, rect: Rect) {
  const cx = Math.max(rect.x, Math.min(x, rect.x + rect.w));
  const cy = Math.max(rect.y, Math.min(y, rect.y + rect.h));
  return (x - cx) ** 2 + (y - cy) ** 2 < r * r;
}

function nearestPoint(x: number, y: number, points: Array<{ x: number; y: number }>) {
  return points.reduce((best, point) => (Math.hypot(point.x - x, point.y - y) < Math.hypot(best.x - x, best.y - y) ? point : best));
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, fill: string) {
  ctx.beginPath();
  ctx.fillStyle = fill;
  ctx.strokeStyle = "#2d2d2d";
  ctx.lineWidth = 3;
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();
  ctx.stroke();
}

function aim(shot: Shot) {
  return Math.atan2(shot.vy, shot.vx);
}

function drawFoeShot(ctx: CanvasRenderingContext2D, shot: Shot) {
  ctx.save();
  ctx.translate(shot.x, shot.y);
  ctx.rotate(aim(shot));
  if (shot.foe === "boss") {
    ctx.strokeStyle = "#ffbc0d";
    ctx.lineWidth = 2;
    ctx.fillStyle = "#db0007";
    ctx.beginPath();
    ctx.arc(0, 0, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else if (shot.foe === "fan") {
    ctx.fillStyle = "#ff7a18";
    ctx.beginPath();
    ctx.moveTo(8, 0);
    ctx.lineTo(-8, -4);
    ctx.lineTo(-8, 4);
    ctx.closePath();
    ctx.fill();
  } else {
    ctx.fillStyle = "#db0007";
    ctx.strokeStyle = "#2d2d2d";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-4, -5);
    ctx.lineTo(4, -5);
    ctx.lineTo(6, 5);
    ctx.lineTo(-6, 5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

function drawSeasonShot(ctx: CanvasRenderingContext2D, shot: Shot) {
  ctx.save();
  ctx.translate(shot.x, shot.y);
  ctx.rotate(aim(shot));
  const hot = Boolean(shot.flame || shot.chili);
  if (shot.fish) {
    ctx.fillStyle = "#f0c14a";
    ctx.strokeStyle = "#2d2d2d";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(1, 0, 11, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-9, 0);
    ctx.lineTo(-16, -5);
    ctx.lineTo(-16, 5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(7, -1, 2.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#2d2d2d";
    ctx.beginPath();
    ctx.arc(7.6, -1, 1, 0, Math.PI * 2);
    ctx.fill();
  } else if (shot.venom && !hot) {
    ctx.fillStyle = "#5f9a28";
    ctx.strokeStyle = "#2d2d2d";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, 0, 8, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#d6ff86";
    ctx.beginPath();
    ctx.arc(-2, -1.5, 2, 0, Math.PI * 2);
    ctx.arc(3, 2, 1.4, 0, Math.PI * 2);
    ctx.fill();
  } else if (!hot) {
    ctx.fillStyle = "#db0007";
    ctx.strokeStyle = "#2d2d2d";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(1, 0, 7, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#ffb4b4";
    ctx.beginPath();
    ctx.ellipse(-1, -1.4, 2.2, 1.3, -0.5, 0, Math.PI * 2);
    ctx.fill();
  }
  if (hot) {
    ctx.fillStyle = shot.flame ? "#ff7a18" : "#db0007";
    ctx.beginPath();
    if (shot.fish) {
      ctx.moveTo(16, 0);
      ctx.quadraticCurveTo(10, -4, 8, 0);
      ctx.quadraticCurveTo(10, 4, 16, 0);
    } else {
      ctx.moveTo(14, 0);
      ctx.quadraticCurveTo(2, -8, -12, -3);
      ctx.quadraticCurveTo(-4, 0, -12, 3);
      ctx.quadraticCurveTo(2, 8, 14, 0);
    }
    ctx.fill();
    ctx.fillStyle = shot.flame ? "#fff1b8" : "#ffbc0d";
    ctx.beginPath();
    ctx.ellipse(shot.fish ? 11 : 1, 0, shot.fish ? 2 : 4, shot.fish ? 1.4 : 2.4, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  if (shot.venom && (hot || shot.fish)) {
    ctx.fillStyle = "#8fd14f";
    ctx.beginPath();
    ctx.arc(3, 5, 2, 0, Math.PI * 2);
    ctx.arc(-4, -4, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawSoda(ctx: CanvasRenderingContext2D, shot: Shot) {
  if (paintFx(ctx, "fx/fx-soda.png", shot.x, shot.y, 92, 50, aim(shot))) return;
  ctx.save();
  ctx.translate(shot.x, shot.y);
  ctx.rotate(aim(shot));
  const wash = ctx.createLinearGradient(-78, 0, 18, 0);
  wash.addColorStop(0, "rgba(170,225,255,0)");
  wash.addColorStop(0.55, "rgba(190,235,255,.45)");
  wash.addColorStop(1, "rgba(255,255,255,.9)");
  ctx.fillStyle = wash;
  ctx.beginPath();
  ctx.moveTo(20, 0);
  ctx.quadraticCurveTo(-20, -22, -76, -10);
  ctx.lineTo(-76, 10);
  ctx.quadraticCurveTo(-20, 22, 20, 0);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.ellipse(12, 0, 11, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,.85)";
  for (let i = 0; i < 6; i += 1) {
    ctx.beginPath();
    ctx.arc(-8 - i * 11, Math.sin(i * 1.7) * 7, 2 + (i % 3), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawFries(ctx: CanvasRenderingContext2D, shot: Shot) {
  if (paintFx(ctx, "fx/fx-fries.png", shot.x, shot.y, 36, 48, aim(shot) - Math.PI / 2)) return;
  ctx.save();
  ctx.translate(shot.x, shot.y);
  ctx.rotate(aim(shot));
  ctx.fillStyle = "#db0007";
  ctx.strokeStyle = "#2d2d2d";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-10, -9);
  ctx.lineTo(2, -6);
  ctx.lineTo(2, 6);
  ctx.lineTo(-10, 9);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  const sticks = [-6, -1, 4];
  sticks.forEach((y, index) => {
    ctx.save();
    ctx.translate(8, y);
    ctx.rotate((index - 1) * 0.35);
    ctx.fillStyle = "#ffbc0d";
    ctx.beginPath();
    ctx.roundRect(-2, -3, 18, 6, 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  });
  ctx.restore();
}

function drawWasabi(ctx: CanvasRenderingContext2D, shot: Shot) {
  ctx.save();
  ctx.translate(shot.x, shot.y);
  ctx.rotate(aim(shot));
  ctx.strokeStyle = "#6aaa2f";
  ctx.lineWidth = 7;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-42, 0);
  ctx.lineTo(12, 0);
  ctx.stroke();
  ctx.strokeStyle = "#d8ff8a";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-30, -2);
  ctx.lineTo(8, -2);
  ctx.stroke();
  ctx.fillStyle = "#e8ffb0";
  ctx.beginPath();
  ctx.arc(16, 0, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#4e8c1c";
  ctx.beginPath();
  ctx.ellipse(-6, 5, 6, 3, 0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawNugget(ctx: CanvasRenderingContext2D, shot: Shot) {
  if (paintFx(ctx, "fx/fx-nugget.png", shot.x, shot.y, 40, 48, 0)) return;
  ctx.save();
  ctx.translate(shot.x, shot.y);
  ctx.fillStyle = "rgba(45,45,45,.2)";
  ctx.beginPath();
  ctx.ellipse(0, 18, 8, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.rotate(shot.life * 6);
  const lumps = [
    { x: -6, y: -4, w: 12, h: 8 },
    { x: 4, y: 2, w: 11, h: 7 },
    { x: -1, y: 5, w: 8, h: 6 },
  ];
  ctx.fillStyle = "#f0b429";
  ctx.strokeStyle = "#8a5a10";
  ctx.lineWidth = 2;
  for (const lump of lumps) {
    ctx.beginPath();
    ctx.ellipse(lump.x, lump.y, lump.w, lump.h, lump.x * 0.08, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

function drawPatty(ctx: CanvasRenderingContext2D, shot: Shot) {
  ctx.save();
  ctx.translate(shot.x, shot.y);
  ctx.rotate(aim(shot));
  ctx.fillStyle = "#e2a04a";
  ctx.strokeStyle = "#2d2d2d";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(0, -4, 10, 5, 0, Math.PI, 0);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#6b3a1f";
  ctx.fillRect(-8, -3, 16, 5);
  ctx.fillStyle = "#f0c14a";
  ctx.beginPath();
  ctx.ellipse(0, 4, 10, 5, 0, 0, Math.PI);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawWing(ctx: CanvasRenderingContext2D, shot: Shot) {
  if (paintFx(ctx, "fx/fx-wing.png", shot.x, shot.y, 46, 26, aim(shot))) return;
  ctx.save();
  ctx.translate(shot.x, shot.y);
  ctx.rotate(aim(shot));
  ctx.strokeStyle = "#f4e2c0";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-14, 2);
  ctx.lineTo(6, 0);
  ctx.stroke();
  ctx.fillStyle = "#e07a2f";
  ctx.strokeStyle = "#2d2d2d";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(8, -1, 8, 5, -0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawDouble(ctx: CanvasRenderingContext2D, shot: Shot) {
  ctx.save();
  ctx.translate(shot.x, shot.y);
  ctx.rotate(aim(shot) + Math.sin(shot.life * 12) * 0.2);
  ctx.fillStyle = "#f2c14e";
  ctx.strokeStyle = "#2d2d2d";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(0, 8, 9, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#6b3a1f";
  ctx.fillRect(-7, 2, 14, 4);
  ctx.fillStyle = "#f0c14a";
  ctx.fillRect(-7, -1, 14, 3);
  ctx.fillStyle = "#6b3a1f";
  ctx.fillRect(-7, -5, 14, 4);
  ctx.fillStyle = "#e7b043";
  ctx.beginPath();
  ctx.ellipse(0, -7, 9, 4, 0, Math.PI, 0);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawFillet(ctx: CanvasRenderingContext2D, shot: Shot) {
  ctx.save();
  ctx.translate(shot.x, shot.y);
  ctx.rotate(aim(shot));
  ctx.fillStyle = "#e7b043";
  ctx.strokeStyle = "#8a5a10";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(-4, 0, 8, 5, -0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(5, 1, 7, 4, 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = "#6b3a1f";
  ctx.beginPath();
  ctx.moveTo(-8, -1);
  ctx.lineTo(0, 1);
  ctx.moveTo(2, 0);
  ctx.lineTo(10, 2);
  ctx.stroke();
  ctx.restore();
}

function drawBurger(ctx: CanvasRenderingContext2D, x: number, y: number, scale = 1, heavy = false) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.fillStyle = "#f2c14e";
  ctx.strokeStyle = "#2d2d2d";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(0, 6, 12, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = heavy ? "#3d1c0c" : "#6b3a1f";
  ctx.fillRect(-10, -2, 20, 6);
  ctx.fillStyle = heavy ? "#c4511a" : "#7dbe3a";
  ctx.fillRect(-9, -5, 18, 3);
  ctx.fillStyle = heavy ? "#e07a2f" : "#e7b043";
  ctx.beginPath();
  ctx.ellipse(0, -6, 12, 6, 0, Math.PI, 0);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#fff3c4";
  for (const seed of [-6, -2, 3, 7]) {
    ctx.beginPath();
    ctx.ellipse(seed, -8, 1.2, 0.8, 0.4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawShard(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.fillStyle = "#f4fbff";
  ctx.strokeStyle = "#9fd7ff";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(8, 0);
  ctx.lineTo(-4, -4);
  ctx.lineTo(-2, 4);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

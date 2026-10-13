import { Sfx } from "../sfx";
import { prefs } from "../settings";
import { recyclePrice, skillById, skills, type SkillId } from "./content";

export type SlotState = { id: SkillId; rank: number; branch: "a" | "b" | null };

export type Hud = {
  hp: number;
  maxHp: number;
  shield: number;
  gold: number;
  wave: number;
  scene: 1 | 2;
  slots: Array<SlotState | null>;
  offers: SkillId[];
  refreshes: number;
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
  cd: number;
  slow: number;
  flash: number;
  orbCd: number;
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
};
type Zone = { x: number; y: number; r: number; life: number; tick: number; dmg: number; slow: boolean };
type Drop = { x: number; y: number; kind: "gold" | "heal" | "shield" | "skill"; amount: number; skill?: SkillId };
type Floater = { x: number; y: number; text: string; life: number; color: string };
type Bit = { x: number; y: number; vx: number; vy: number; life: number; color: string };

const W = 960;
const H = 540;
const waves: Array<{ normal: number; elite: number; boss: number }> = [
  { normal: 8, elite: 0, boss: 0 },
  { normal: 10, elite: 0, boss: 0 },
  { normal: 10, elite: 2, boss: 0 },
  { normal: 12, elite: 2, boss: 0 },
  { normal: 12, elite: 4, boss: 0 },
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

function length(x: number, y: number) {
  return Math.hypot(x, y) || 1;
}

export class Battle {
  paused = false;
  onShop: (() => void) | null = null;
  onPending: (() => void) | null = null;
  onDead: (() => void) | null = null;
  onChange: (() => void) | null = null;

  hp = 100;
  maxHp = 100;
  shield = 0;
  gold = 0;
  wave = 1;
  scene: 1 | 2 = 1;
  slots: Array<SlotState | null> = Array.from({ length: 8 }, () => null);
  offers: SkillId[] = [];
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
  private face = 0;
  private shotCd = 0.2;
  private hurtCd = 0;
  private iframe = 0;
  private shake = 0;
  private juicePool = 0;
  private juiceCd = 0;
  private milkCd = 2;
  private coffeeCd = 3;
  private coffeeHurt = false;
  private teaCd = 4;
  private teaLeft = 0;
  private pieCd = 1;
  private autoCd = 0.6;
  private sodaCd = 0.8;
  private iceCd = 1;
  private spawnCd = 0.4;
  private leftNormal = 8;
  private leftElite = 0;
  private leftBoss = 0;
  private fieldCd = 8;
  private nextId = 1;
  private enemies: Enemy[] = [];
  private shots: Shot[] = [];
  private zones: Zone[] = [];
  private drops: Drop[] = [];
  private floaters: Floater[] = [];
  private bits: Bit[] = [];
  private orbitAngle = 0;
  private blocks: Rect[] = [
    [14, 22, 16, 12],
    [38, 18, 18, 11],
    [68, 20, 15, 12],
    [22, 48, 14, 10],
    [58, 46, 18, 11],
    [82, 58, 12, 16],
    [36, 74, 16, 11],
    [70, 78, 14, 10],
  ].map(([cx, cy, w, h]) => ({
    x: (cx / 100) * W - (w / 100) * W * 0.5,
    y: (cy / 100) * H - (h / 100) * H * 0.5,
    w: (w / 100) * W,
    h: (h / 100) * H,
  }));

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas");
    this.ctx = ctx;
    this.bindKeys();
    this.resize();
    window.addEventListener("resize", this.resize);
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    const loop = (now: number) => {
      if (!this.running) return;
      const dt = Math.min(0.033, (now - this.last) / 1000);
      this.last = now;
      this.resize();
      if (!this.paused && !this.over) this.update(dt);
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

  hud(): Hud {
    return {
      hp: Math.max(0, Math.ceil(this.hp)),
      maxHp: this.maxHp,
      shield: Math.ceil(this.shield),
      gold: Math.round(this.gold * 10) / 10,
      wave: this.wave,
      scene: this.scene,
      slots: this.slots.map((slot) => (slot ? { ...slot } : null)),
      offers: [...this.offers],
      refreshes: this.refreshes,
      pending: this.pending,
      over: this.over,
      banner: this.banner,
    };
  }

  buy(id: SkillId) {
    const def = skillById[id];
    if (this.gold < def.price) return false;
    const owned = this.slots.find((slot) => slot?.id === id);
    if (owned) {
      if (def.kind === "被动") {
        if (owned.rank >= 3) return false;
        owned.rank += 1;
      } else if (!owned.branch) {
        return false;
      } else return false;
    } else {
      const index = this.slots.findIndex((slot) => !slot);
      if (index < 0) return false;
      this.slots[index] = { id, rank: 1, branch: null };
    }
    this.gold = Math.round((this.gold - def.price) * 10) / 10;
    this.sfx.levelUp();
    this.burst(this.px, this.py, "#ffbc0d");
    return true;
  }

  needsBranch(id: SkillId) {
    const slot = this.slots.find((item) => item?.id === id);
    return Boolean(slot && skillById[id].kind === "主动" && !slot.branch);
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

  recycle(index: number) {
    const slot = this.slots[index];
    if (!slot) return 0;
    const gain = recyclePrice(skillById[slot.id].price, slot.rank, Boolean(slot.branch));
    this.slots[index] = null;
    this.gold = Math.round((this.gold + gain) * 10) / 10;
    this.sfx.pick();
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

  refreshShop() {
    if (this.refreshes >= 2 || this.gold < 20) return false;
    this.gold -= 20;
    this.refreshes += 1;
    this.rollOffers();
    return true;
  }

  continueShop() {
    this.paused = false;
    this.refreshes = 0;
    if (this.wave === 10 && this.scene === 1) {
      this.scene = 2;
      this.banner = "后厨";
    }
    this.wave += 1;
    this.beginWave();
  }

  restart() {
    this.hp = 100;
    this.shield = 0;
    this.gold = 0;
    this.wave = 1;
    this.scene = 1;
    this.slots = Array.from({ length: 8 }, () => null);
    this.pending = null;
    this.over = "";
    this.paused = false;
    this.enemies = [];
    this.shots = [];
    this.zones = [];
    this.drops = [];
    this.px = 280;
    this.py = 340;
    this.banner = "第 1 关";
    this.beginWave();
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
    return this.slots.some((slot) => slot?.id === id);
  }

  private slot(id: SkillId) {
    return this.slots.find((item) => item?.id === id) ?? null;
  }

  private haste() {
    const rank = this.slot("gen")?.rank ?? 0;
    return [1, 0.85, 0.7, 0.55][rank];
  }

  private beginWave() {
    const plan = waves[Math.min(waves.length - 1, this.wave - 1)] ?? { normal: 12, elite: 2, boss: 0 };
    const scale = this.wave > 10 ? 1 : 1;
    this.leftNormal = Math.round(plan.normal * scale);
    this.leftElite = plan.elite;
    this.leftBoss = this.wave === 10 || (this.wave > 10 && this.wave % 10 === 0) ? 1 : plan.boss;
    if (this.wave > 10 && this.wave % 10 !== 0) {
      this.leftNormal = 10 + (this.wave % 5) * 2;
      this.leftElite = 2;
      this.leftBoss = 0;
    }
    this.spawnCd = 0.35;
    this.banner = this.scene === 2 && this.wave === 11 ? "后厨" : `第 ${this.wave} 关`;
    this.float(W / 2, 70, this.banner, "#2d2d2d");
  }

  private update(dt: number) {
    this.hurtCd = Math.max(0, this.hurtCd - dt);
    this.iframe = Math.max(0, this.iframe - dt);
    this.juiceCd = Math.max(0, this.juiceCd - dt);
    this.teaLeft = Math.max(0, this.teaLeft - dt);
    this.shake = Math.max(0, this.shake - dt);
    this.movePlayer(dt);
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
    this.floaters = this.floaters.filter((item) => item.life > 0);
    this.bits = this.bits.filter((item) => item.life > 0);
    if (this.leftNormal + this.leftElite + this.leftBoss === 0 && this.enemies.length === 0) this.finishWave();
    if (this.hp <= 0 && !this.over) {
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
      x /= mag;
      y /= mag;
      this.face = Math.atan2(y, x);
      const next = this.collide(this.px + x * 200 * dt, this.py + y * 200 * dt, 16);
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

  private cast(dt: number) {
    this.orbitAngle += dt * 2.2;
    this.shotCd -= dt;
    if (this.shotCd <= 0) {
      this.shotCd = 0.45;
      const target = this.nearest(this.px, this.py);
      if (target) this.fireBasic(target);
    }
    const haste = this.haste();
    if (this.has("auto")) {
      this.autoCd -= dt;
      const wait = ((this.slot("auto")?.branch === "a" ? 0.9 : 1.4) * haste);
      if (this.autoCd <= 0) {
        this.autoCd = wait;
        this.fireOrb(this.slot("auto")?.branch === "b");
      }
    }
    if (this.has("pie")) {
      this.pieCd -= dt;
      if (this.pieCd <= 0) {
        this.pieCd = 2 * haste;
        const aim = this.nearest(this.px, this.py);
        const angle = aim ? Math.atan2(aim.y - this.py, aim.x - this.px) : this.face;
        const branch = this.slot("pie")?.branch;
        this.zones.push({
          x: this.px + Math.cos(angle) * 70,
          y: this.py + Math.sin(angle) * 70,
          r: branch === "b" ? 78 : 50,
          life: branch === "a" ? 4 : 2.5,
          tick: 0,
          dmg: 4,
          slow: false,
        });
      }
    }
    if (this.has("soda")) {
      this.sodaCd -= dt;
      if (this.sodaCd <= 0) {
        this.sodaCd = 1.6 * haste;
        const branch = this.slot("soda")?.branch;
        const speed = branch === "a" ? 460 : 340;
        const spread = branch === "b" ? 0.35 : 0.12;
        for (const offset of branch === "b" ? [-spread, 0, spread] : [0]) {
          this.shots.push({
            x: this.px,
            y: this.py,
            vx: Math.cos(this.face + offset) * speed,
            vy: Math.sin(this.face + offset) * speed,
            r: 7,
            dmg: 8,
            life: 0.45,
            good: true,
            pierce: 2,
            hit: new Set(),
            kind: "soda",
            splitGen: 0,
            homing: 0,
          });
        }
        this.sfx.shoot();
      }
    }
    if (this.has("ice")) {
      this.iceCd -= dt;
      if (this.iceCd <= 0) {
        this.iceCd = 2.4 * haste;
        const branch = this.slot("ice")?.branch;
        this.zones.push({
          x: this.px,
          y: this.py,
          r: branch === "a" ? 150 : 100,
          life: 0.35,
          tick: 0,
          dmg: 7,
          slow: true,
        });
        if (branch === "b") {
          this.zones.push({ x: this.px, y: this.py, r: 80, life: 1.6, tick: 0.2, dmg: 2, slow: true });
        }
      }
    }
    if (this.has("milk")) {
      this.milkCd -= dt;
      const branch = this.slot("milk")?.branch;
      if (this.milkCd <= 0) {
        this.milkCd = branch === "a" ? 5 : 8;
        this.shield = Math.max(this.shield, branch === "b" ? 48 : 30);
        this.sfx.shield();
      }
    }
    if (this.has("coffee")) {
      this.coffeeCd -= dt;
      if (this.coffeeCd <= 0) {
        this.coffeeCd = 6;
        if (this.coffeeHurt) {
          this.coffeeHurt = false;
          const branch = this.slot("coffee")?.branch;
          const radius = branch === "b" ? 130 : 78;
          this.pulse(this.px, this.py, radius, branch === "a" ? 14 : 8);
        }
      }
    }
    if (this.has("tea")) {
      this.teaCd -= dt;
      if (this.teaCd <= 0) {
        const branch = this.slot("tea")?.branch;
        this.teaCd = 10;
        this.teaLeft = branch === "a" ? 3.2 : 2;
      }
    }
    this.fieldCd -= dt;
    if (this.fieldCd <= 0) {
      const rank = this.slot("drops")?.rank ?? 0;
      this.fieldCd = [14, 12, 10, 8][rank];
      this.spawnField();
    }
  }

  private fireBasic(target: Enemy) {
    const orb = this.orbitPoints()[0];
    const follow = this.slot("follow");
    const home = follow && orb ? 1 : 0;
    this.shots.push({
      x: this.px,
      y: this.py,
      vx: ((home ? orb.x : target.x) - this.px) / length((home ? orb.x : target.x) - this.px, (home ? orb.y : target.y) - this.py) * 420,
      vy: ((home ? orb.y : target.y) - this.py) / length((home ? orb.x : target.x) - this.px, (home ? orb.y : target.y) - this.py) * 420,
      r: 5,
      dmg: 6,
      life: 1.2,
      good: true,
      pierce: 0,
      hit: new Set(),
      kind: "basic",
      splitGen: 0,
      homing: home ? (follow?.branch === "a" ? 2 : 1) : 0,
    });
    this.sfx.shoot();
  }

  private fireOrb(dual: boolean) {
    const target = this.nearest(this.px, this.py);
    if (!target) return;
    const angles = dual ? [-0.25, 0.25] : [0];
    const base = Math.atan2(target.y - this.py, target.x - this.px);
    for (const offset of angles) {
      this.shots.push({
        x: this.px,
        y: this.py,
        vx: Math.cos(base + offset) * 280,
        vy: Math.sin(base + offset) * 280,
        r: 9,
        dmg: 10,
        life: 1.6,
        good: true,
        pierce: 0,
        hit: new Set(),
        kind: "orb",
        splitGen: 0,
        homing: 0,
      });
    }
  }

  private orbitPoints() {
    const owned = this.slot("orbit");
    if (!owned) return [];
    const count = owned.branch === "a" ? 2 : 1;
    return Array.from({ length: count }, (_, index) => {
      const angle = this.orbitAngle + (Math.PI * 2 * index) / count;
      return { x: this.px + Math.cos(angle) * 54, y: this.py + Math.sin(angle) * 54 };
    });
  }

  private spawn(dt: number) {
    if (this.enemies.length >= 12) return;
    this.spawnCd -= dt;
    if (this.spawnCd > 0) return;
    if (this.leftBoss > 0) {
      this.leftBoss -= 1;
      this.enemies.push(this.makeEnemy(true, "boss"));
    } else if (this.leftElite > 0) {
      this.leftElite -= 1;
      this.enemies.push(this.makeEnemy(true, "walker"));
    } else if (this.leftNormal > 0) {
      this.leftNormal -= 1;
      this.enemies.push(this.makeEnemy(false, Math.random() < 0.35 ? "turret" : "walker"));
    }
    this.spawnCd = 0.72;
  }

  private makeEnemy(elite: boolean, kind: Enemy["kind"]): Enemy {
    const edge = Math.random() * 4;
    const x = edge < 1 ? 30 : edge < 2 ? W - 30 : 40 + Math.random() * (W - 80);
    const y = edge < 2 ? 40 + Math.random() * (H - 80) : edge < 3 ? 30 : H - 30;
    const hp = kind === "boss" ? 520 : elite ? 72 : kind === "turret" ? 16 : 24;
    const scaled = this.scene === 2 ? hp * 1.5 : hp;
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
    };
  }

  private finishWave() {
    this.gold += 2;
    this.paused = true;
    if (this.wave % 5 === 0) {
      this.rollOffers();
      this.onShop?.();
      return;
    }
    this.paused = false;
    this.wave += 1;
    this.beginWave();
  }

  private rollOffers() {
    const pools: Record<"orb" | "tank" | "spell", SkillId[]> = { orb: [], tank: [], spell: [] };
    for (const skill of skills) {
      if (this.offerable(skill.id)) pools[skill.school].push(skill.id);
    }
    const picked: SkillId[] = [];
    for (const school of ["orb", "tank", "spell"] as const) {
      const copy = [...pools[school]];
      for (let i = 0; i < 2 && copy.length; i += 1) {
        picked.push(copy.splice(Math.floor(Math.random() * copy.length), 1)[0]);
      }
    }
    while (picked.length < 6) {
      const rest = skills.map((skill) => skill.id).filter((id) => this.offerable(id) && !picked.includes(id));
      if (!rest.length) break;
      picked.push(rest[Math.floor(Math.random() * rest.length)]);
    }
    this.offers = picked;
  }

  private offerable(id: SkillId) {
    const slot = this.slot(id);
    if (!slot) return this.slots.some((item) => !item);
    if (skillById[id].kind === "被动") return slot.rank < 3;
    return !slot.branch;
  }

  private updateShots(dt: number) {
    for (const shot of this.shots) {
      if (shot.homing > 0 && shot.kind === "basic") {
        const goal = this.orbitPoints().length ? nearestPoint(shot.x, shot.y, this.orbitPoints()) : null;
        const enemy = this.nearest(shot.x, shot.y);
        const target = goal && Math.hypot(goal.x - shot.x, goal.y - shot.y) > 18 ? goal : enemy;
        if (goal && Math.hypot(goal.x - shot.x, goal.y - shot.y) < 18) {
          shot.homing -= 1;
          if (this.slot("follow")?.branch === "b") shot.dmg += 6;
          shot.x = goal.x;
          shot.y = goal.y;
        }
        if (target) {
          const angle = Math.atan2(target.y - shot.y, target.x - shot.x);
          shot.vx = Math.cos(angle) * 420;
          shot.vy = Math.sin(angle) * 420;
        }
      }
      shot.x += shot.vx * dt;
      shot.y += shot.vy * dt;
      shot.life -= dt;
      if (this.blocked(shot.x, shot.y, shot.r) || shot.x < 0 || shot.y < 0 || shot.x > W || shot.y > H) shot.life = 0;
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
        this.hitEnemy(enemy, shot.dmg);
        if (shot.kind === "orb") this.afterOrb(shot, enemy);
        if (shot.pierce <= 0) shot.life = 0;
        else shot.pierce -= 1;
        break;
      }
    }
    for (const point of this.orbitPoints()) {
      for (const enemy of this.enemies) {
        if (enemy.orbCd > 0) continue;
        if (Math.hypot(point.x - enemy.x, point.y - enemy.y) > 12 + enemy.r) continue;
        enemy.orbCd = 0.35;
        this.hitEnemy(enemy, 8);
        if (this.slot("orbit")?.branch === "b") this.pulse(point.x, point.y, 36, 6);
      }
    }
    this.shots = this.shots.filter((shot) => shot.life > 0);
  }

  private afterOrb(shot: Shot, enemy: Enemy) {
    const split = this.slot("split");
    if (!split || shot.splitGen > (split.branch === "b" ? 1 : 0)) return;
    const count = split.branch === "a" ? 3 : 2;
    for (let i = 0; i < count; i += 1) {
      const angle = (Math.PI * 2 * i) / count;
      this.shots.push({
        x: enemy.x,
        y: enemy.y,
        vx: Math.cos(angle) * 220,
        vy: Math.sin(angle) * 220,
        r: 6,
        dmg: 5,
        life: 0.7,
        good: true,
        pierce: 0,
        hit: new Set([enemy.id]),
        kind: "orb",
        splitGen: shot.splitGen + 1,
        homing: 0,
      });
    }
  }

  private updateZones(dt: number) {
    for (const zone of this.zones) {
      zone.life -= dt;
      zone.tick -= dt;
      if (zone.tick > 0) continue;
      zone.tick = 0.4;
      for (const enemy of this.enemies) {
        if (Math.hypot(zone.x - enemy.x, zone.y - enemy.y) > zone.r + enemy.r) continue;
        this.hitEnemy(enemy, zone.dmg);
        if (zone.slow) enemy.slow = Math.max(enemy.slow, 0.8);
      }
    }
    this.zones = this.zones.filter((zone) => zone.life > 0);
  }

  private updateEnemies(dt: number) {
    for (const enemy of this.enemies) {
      enemy.flash = Math.max(0, enemy.flash - dt);
      enemy.slow = Math.max(0, enemy.slow - dt);
      enemy.orbCd = Math.max(0, enemy.orbCd - dt);
      enemy.cd -= dt;
      const slow = enemy.slow > 0 ? 0.55 : 1;
      if (enemy.kind === "walker" || enemy.kind === "boss") {
        const speed = (enemy.kind === "boss" ? 62 : enemy.elite ? 100 : 80) * slow;
        const angle = Math.atan2(this.py - enemy.y, this.px - enemy.x);
        const next = this.collide(enemy.x + Math.cos(angle) * speed * dt, enemy.y + Math.sin(angle) * speed * dt, enemy.r);
        enemy.x = next.x;
        enemy.y = next.y;
        if (Math.hypot(enemy.x - this.px, enemy.y - this.py) < enemy.r + 16 && enemy.cd <= 0) {
          enemy.cd = 0.5;
          this.hurt(enemy.kind === "boss" ? 18 : enemy.elite ? 16 : 10);
        }
      }
      if ((enemy.kind === "turret" || enemy.kind === "boss") && enemy.cd <= 0) {
        enemy.cd = enemy.kind === "boss" ? 2.2 : 1.7;
        this.enemyShot(enemy);
      }
    }
    this.enemies = this.enemies.filter((enemy) => enemy.hp > 0);
  }

  private enemyShot(enemy: Enemy) {
    const angles = enemy.kind === "boss" ? [0, 45, 90, 135, 180, 225, 270, 315] : [Math.atan2(this.py - enemy.y, this.px - enemy.x) * 180 / Math.PI];
    for (const degree of angles) {
      const angle = (degree * Math.PI) / 180;
      this.shots.push({
        x: enemy.x,
        y: enemy.y,
        vx: Math.cos(angle) * (enemy.kind === "boss" ? 150 : 200),
        vy: Math.sin(angle) * (enemy.kind === "boss" ? 150 : 200),
        r: 5,
        dmg: enemy.kind === "boss" ? 12 : 8,
        life: 2,
        good: false,
        pierce: 0,
        hit: new Set(),
        kind: "basic",
        splitGen: 0,
        homing: 0,
      });
    }
  }

  private hurt(amount: number) {
    if (this.iframe > 0) return;
    let left = amount;
    if (this.teaLeft > 0) left *= this.slot("tea")?.branch === "b" ? 0.34 : 0.5;
    if (this.shield > 0) {
      const used = Math.min(this.shield, left);
      this.shield -= used;
      left -= used;
    }
    if (left > 0) {
      this.hp -= left;
      this.iframe = 0.45;
      this.hurtCd = 0.12;
      this.coffeeHurt = true;
      this.sfx.hurt();
      if (prefs.shake) this.shake = 0.08;
      this.juice(left);
    }
  }

  private juice(amount: number) {
    const juice = this.slot("juice");
    if (!juice) return;
    const line = juice.branch === "a" ? 0.65 : 0.5;
    if (this.hp / this.maxHp > line || this.juiceCd > 0) return;
    this.juicePool += amount;
    if (this.juicePool < 15) return;
    this.juicePool = 0;
    this.juiceCd = 3;
    const heal = juice.branch === "b" ? 14 : 8;
    this.hp = Math.min(this.maxHp, this.hp + heal);
    this.float(this.px, this.py - 28, `+${heal}`, "#db0007");
    this.sfx.heal();
  }

  private hitEnemy(enemy: Enemy, amount: number) {
    enemy.hp -= amount;
    enemy.flash = 0.08;
    this.float(enemy.x, enemy.y - enemy.r - 6, String(Math.round(amount)), "#2d2d2d");
    this.burst(enemy.x, enemy.y, "#ffbc0d");
    this.sfx.hit();
    if (enemy.hp <= 0) this.kill(enemy);
  }

  private kill(enemy: Enemy) {
    const gold = enemy.kind === "boss" ? 25 : enemy.elite ? 5 : 2;
    this.drops.push({ x: enemy.x, y: enemy.y, kind: "gold", amount: gold });
    const roll = Math.random();
    if (enemy.kind === "boss") this.drops.push({ x: enemy.x + 16, y: enemy.y, kind: "skill", amount: 0, skill: this.randomSkill() });
    else if (roll < 0.06) this.drops.push({ x: enemy.x + 14, y: enemy.y, kind: "skill", amount: 0, skill: this.randomSkill() });
    else if (roll < 0.14) this.drops.push({ x: enemy.x + 14, y: enemy.y, kind: "shield", amount: 24 });
    else if (roll < 0.32) this.drops.push({ x: enemy.x + 14, y: enemy.y, kind: "heal", amount: 28 });
  }

  private randomSkill() {
    const open = skills.filter((skill) => this.offerable(skill.id));
    const pool = open.length ? open : skills;
    return pool[Math.floor(Math.random() * pool.length)].id;
  }

  private spawnField() {
    const roll = Math.random();
    const spot = { x: 80 + Math.random() * (W - 160), y: 80 + Math.random() * (H - 160) };
    if (roll < 0.45) this.drops.push({ ...spot, kind: "heal", amount: 28 });
    else if (roll < 0.65) this.drops.push({ ...spot, kind: "shield", amount: 24 });
    else if (roll < 0.85) this.drops.push({ ...spot, kind: "gold", amount: 6 });
    else this.drops.push({ ...spot, kind: "skill", amount: 0, skill: this.randomSkill() });
  }

  private updateDrops(dt: number) {
    for (const drop of [...this.drops]) {
      if (Math.hypot(drop.x - this.px, drop.y - this.py) > 36) continue;
      this.drops.splice(this.drops.indexOf(drop), 1);
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
        this.shield = Math.max(this.shield, drop.amount);
        this.sfx.shield();
      } else if (drop.skill) this.gainSkill(drop.skill);
    }
    void dt;
  }

  private gainSkill(id: SkillId) {
    const owned = this.slot(id);
    if (owned && skillById[id].kind === "被动" && owned.rank < 3) {
      owned.rank += 1;
      this.sfx.levelUp();
      return;
    }
    if (!owned) {
      const index = this.slots.findIndex((slot) => !slot);
      if (index >= 0) {
        this.slots[index] = { id, rank: 1, branch: null };
        this.sfx.levelUp();
        this.float(this.px, this.py - 30, skillById[id].name, "#2d2d2d");
        return;
      }
      this.pending = id;
      this.paused = true;
      this.onPending?.();
      return;
    }
    this.gold += 6;
  }

  private pulse(x: number, y: number, radius: number, dmg: number) {
    this.zones.push({ x, y, r: radius, life: 0.25, tick: 0, dmg, slow: false });
    this.burst(x, y, "#db0007");
  }

  private burst(x: number, y: number, color: string) {
    for (let i = 0; i < 6; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 80;
      this.bits.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: 0.35, color });
    }
  }

  private float(x: number, y: number, text: string, color: string) {
    this.floaters.push({ x, y, text, life: 0.7, color });
  }

  private nearest(x: number, y: number) {
    let best: Enemy | null = null;
    let dist = Infinity;
    for (const enemy of this.enemies) {
      const d = Math.hypot(enemy.x - x, enemy.y - y);
      if (d < dist) {
        dist = d;
        best = enemy;
      }
    }
    return best;
  }

  private blocked(x: number, y: number, r: number) {
    return this.blocks.some((block) => circleHits(x, y, r, block));
  }

  private draw() {
    const ctx = this.ctx;
    const rect = this.canvas.getBoundingClientRect();
    const scale = Math.min(rect.width / W, rect.height / H);
    ctx.setTransform(this.canvas.width / rect.width, 0, 0, this.canvas.height / rect.height, 0, 0);
    ctx.clearRect(0, 0, rect.width, rect.height);
    const ox = (rect.width - W * scale) / 2 + (this.shake > 0 ? (Math.random() - 0.5) * 6 : 0);
    const oy = (rect.height - H * scale) / 2;
    ctx.save();
    ctx.translate(ox, oy);
    ctx.scale(scale, scale);
    ctx.fillStyle = this.scene === 2 ? "#f7f7f7" : "#ffe7a3";
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = this.scene === 2 ? "rgba(182,154,129,.45)" : "rgba(255,188,13,.55)";
    ctx.lineWidth = 2;
    for (let x = 0; x <= W; x += 48) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
    for (let y = 0; y <= H; y += 48) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }
    for (const block of this.blocks) roundRect(ctx, block.x, block.y, block.w, block.h, 14, "#c4a574");
    for (const zone of this.zones) {
      ctx.beginPath();
      ctx.fillStyle = zone.slow ? "rgba(255,188,13,.28)" : "rgba(219,0,7,.16)";
      ctx.arc(zone.x, zone.y, zone.r, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const drop of this.drops) this.drawDrop(drop);
    for (const enemy of this.enemies) this.drawEnemy(enemy);
    for (const shot of this.shots) {
      ctx.save();
      ctx.translate(shot.x, shot.y);
      ctx.rotate(Math.atan2(shot.vy, shot.vx));
      roundRect(ctx, -10, -shot.r, shot.kind === "orb" ? 18 : 16, shot.r * 2, 4, shot.good ? (shot.kind === "soda" ? "#ffbc0d" : "#db0007") : "#2d2d2d");
      ctx.restore();
    }
    for (const point of this.orbitPoints()) {
      ctx.beginPath();
      ctx.fillStyle = "#ffbc0d";
      ctx.strokeStyle = "#2d2d2d";
      ctx.lineWidth = 3;
      ctx.arc(point.x, point.y, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      const image = picture(skillById.orbit.image);
      if (image) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(point.x, point.y, 8, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(image, point.x - 8, point.y - 8, 16, 16);
        ctx.restore();
      }
    }
    this.drawPlayer();
    for (const bit of this.bits) {
      ctx.globalAlpha = Math.max(0, bit.life * 3);
      ctx.fillStyle = bit.color;
      ctx.beginPath();
      ctx.arc(bit.x, bit.y, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.font = "700 18px Fredoka, sans-serif";
    ctx.textAlign = "center";
    for (const floater of this.floaters) {
      ctx.lineWidth = 4;
      ctx.strokeStyle = "#fff";
      ctx.strokeText(floater.text, floater.x, floater.y - (0.7 - floater.life) * 28);
      ctx.fillStyle = floater.color;
      ctx.fillText(floater.text, floater.x, floater.y - (0.7 - floater.life) * 28);
    }
    ctx.restore();
  }

  private drawPlayer() {
    const ctx = this.ctx;
    if (this.shield > 0 || this.teaLeft > 0) {
      ctx.beginPath();
      ctx.strokeStyle = this.teaLeft > 0 ? "#ffffff" : "#ffbc0d";
      ctx.lineWidth = 4;
      ctx.arc(this.px, this.py, 24, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.fillStyle = this.hurtCd > 0 ? "#ffd0d0" : "#ffffff";
    ctx.strokeStyle = "#2d2d2d";
    ctx.lineWidth = 3;
    ctx.arc(this.px, this.py, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.save();
    ctx.translate(this.px, this.py);
    ctx.rotate(this.face - Math.PI / 2);
    roundRect(ctx, -8, -24, 16, 12, 6, "#db0007");
    ctx.restore();
    ctx.fillStyle = "#2d2d2d";
    ctx.beginPath();
    ctx.arc(this.px - 5, this.py - 2, 2, 0, Math.PI * 2);
    ctx.arc(this.px + 5, this.py - 2, 2, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawEnemy(enemy: Enemy) {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.fillStyle = enemy.flash > 0 ? "#ffffff" : "#db0007";
    ctx.strokeStyle = enemy.elite ? "#ffbc0d" : "#2d2d2d";
    ctx.lineWidth = enemy.elite ? 4 : 3;
    if (enemy.kind === "turret") roundRect(ctx, enemy.x - enemy.r, enemy.y - enemy.r, enemy.r * 2, enemy.r * 2, 8, enemy.flash > 0 ? "#ffffff" : "#db0007");
    else {
      ctx.ellipse(enemy.x, enemy.y, enemy.kind === "boss" ? enemy.r + 8 : enemy.r, enemy.r, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    if (enemy.kind === "turret") {
      ctx.strokeStyle = "#2d2d2d";
      ctx.beginPath();
      ctx.moveTo(enemy.x, enemy.y - enemy.r);
      ctx.lineTo(enemy.x, enemy.y - enemy.r - 10);
      ctx.stroke();
    }
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(enemy.x - 4, enemy.y - 2, 3, 0, Math.PI * 2);
    ctx.arc(enemy.x + 4, enemy.y - 2, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#2d2d2d";
    ctx.beginPath();
    ctx.arc(enemy.x - 4, enemy.y - 1, 1.4, 0, Math.PI * 2);
    ctx.arc(enemy.x + 4, enemy.y - 1, 1.4, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawDrop(drop: Drop) {
    const ctx = this.ctx;
    if (drop.kind === "gold") {
      ctx.beginPath();
      ctx.fillStyle = "#ffbc0d";
      ctx.strokeStyle = "#2d2d2d";
      ctx.lineWidth = 2;
      ctx.arc(drop.x, drop.y, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      return;
    }
    if (drop.kind === "heal") {
      roundRect(ctx, drop.x - 8, drop.y - 8, 16, 16, 8, "#ffffff");
      ctx.strokeStyle = "#db0007";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(drop.x - 4, drop.y);
      ctx.lineTo(drop.x + 4, drop.y);
      ctx.moveTo(drop.x, drop.y - 4);
      ctx.lineTo(drop.x, drop.y + 4);
      ctx.stroke();
      return;
    }
    if (drop.kind === "shield") {
      roundRect(ctx, drop.x - 8, drop.y - 8, 16, 16, 3, "#ffffff");
      ctx.strokeStyle = "#ffbc0d";
      ctx.strokeRect(drop.x - 5, drop.y - 5, 10, 10);
      return;
    }
    const image = drop.skill ? picture(skillById[drop.skill].image) : null;
    ctx.beginPath();
    ctx.fillStyle = "#fff";
    ctx.strokeStyle = "#2d2d2d";
    ctx.lineWidth = 2;
    ctx.arc(drop.x, drop.y, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    if (image) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(drop.x, drop.y, 8, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(image, drop.x - 8, drop.y - 8, 16, 16);
      ctx.restore();
    }
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

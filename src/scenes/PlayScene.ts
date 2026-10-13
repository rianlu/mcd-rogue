import Phaser from "phaser";
import { stackedBonus, world, xpToNext } from "../balance";
import { offerPool, storeName } from "../catalog";
import { dealOffers, effectText, emptyRanks, handbook, hpGain, offerChrome, offerTitle, schoolName, spells, type Offer, type SpellId, type TalentId } from "../skills";
import { theme } from "../theme";
import { Sfx, Bgm } from "../sfx";
import { prefs, savePrefs } from "../settings";

type Actor = Phaser.Physics.Arcade.Sprite & {
  hp?: number;
  kind?: string;
  cooldown?: number;
};
type Drop = Phaser.Physics.Arcade.Sprite & { drop?: "xp" | "heal" | "shield" | "burst"; amount?: number };

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export class PlayScene extends Phaser.Scene {
  private player!: Actor;
  private solids!: Phaser.Physics.Arcade.StaticGroup;
  private covers!: Phaser.Physics.Arcade.StaticGroup;
  private enemies!: Phaser.Physics.Arcade.Group;
  private playerShots!: Phaser.Physics.Arcade.Group;
  private enemyShots!: Phaser.Physics.Arcade.Group;
  private drops!: Phaser.Physics.Arcade.Group;
  private sparks!: Phaser.GameObjects.Particles.ParticleEmitter;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<"up" | "down" | "left" | "right", Phaser.Input.Keyboard.Key>;

  private level = 1;
  private xp = 0;
  private hp = world.maxHp;
  private shield = false;
  private iframe = 0;
  private fire = 0;
  private spawn = 1.4;
  private spawnTimer = 0.4;
  private eliteTimer = 20;
  private choosing = false;
  private ranks: Record<TalentId, number> = emptyRanks();
  private chainRank = 0;
  private orbitRank = 0;
  private spellLevel: Record<SpellId, number> = { burger: 0, fries: 0, nugget: 0, pie: 0, cola: 0 };
  private spellBranch: Record<SpellId, "a" | "b" | ""> = { burger: "", fries: "", nugget: "", pie: "", cola: "" };
  private spellCd: Record<SpellId, number> = { burger: 0.6, fries: 0.3, nugget: 0, pie: 1, cola: 0.8 };
  private pierce = 0;
  private split = 0;
  private slowRank = 0;
  private guard = 0;
  private shieldBonus = 0;
  private maxHp = world.maxHp;
  private pickupVolley = 0;
  private orbs: Phaser.GameObjects.Arc[] = [];
  private orbitAngle = 0;
  private nextEnemyId = 1;
  private damage = world.baseDamage;
  private radius = world.baseRadius;
  private haste = 0;
  private settingsOpen = false;
  private paused = false;
  private manualOpen = false;
  private shieldRing!: Phaser.GameObjects.Arc;
  private pauseBanner?: Phaser.GameObjects.Text;
  private readonly pool = offerPool();
  private overlay?: Phaser.GameObjects.Container;
  private hpFill!: Phaser.GameObjects.Rectangle;
  private xpFill!: Phaser.GameObjects.Rectangle;
  private stats!: Phaser.GameObjects.Text;
  private levelText!: Phaser.GameObjects.Text;
  private readonly sfx = new Sfx();
  private readonly bgm = new Bgm();

  constructor() {
    super("play");
  }

  preload() {
    this.load.crossOrigin = "anonymous";
    for (const card of this.pool) this.load.image(`meal-${card.code}`, card.image);
  }

  create() {
    this.cameras.main.setBackgroundColor(theme.goldSoft);
    if (!reducedMotion) this.cameras.main.postFX.addBloom(theme.gold, 1, 1, 0.4, 0.6, 2);
    this.drawFloor();
    this.makeTextures();
    this.solids = this.physics.add.staticGroup();
    this.covers = this.physics.add.staticGroup();
    this.placeObstacles();

    this.player = this.physics.add.sprite(480, 430, "player") as Actor;
    this.player.setCollideWorldBounds(true);
    (this.player.body as Phaser.Physics.Arcade.Body).setCircle(16, 0, 0);
    this.shieldRing = this.add.circle(this.player.x, this.player.y, 26, theme.white, 0.35);
    this.shieldRing.setStrokeStyle(5, theme.gold);
    this.shieldRing.setDepth(6);
    this.shieldRing.setVisible(false);

    this.enemies = this.physics.add.group();
    this.playerShots = this.physics.add.group();
    this.enemyShots = this.physics.add.group();
    this.drops = this.physics.add.group();

    this.sparks = this.add.particles(0, 0, "spark", {
      speed: { min: 40, max: 160 },
      lifespan: { min: 200, max: 400 },
      scale: { start: 0.7, end: 0 },
      blendMode: Phaser.BlendModes.ADD,
      emitting: false,
    });

    const isShot = (obj: { texture?: { key: string } }) => obj.texture?.key === "shot" || obj.texture?.key === "foe-shot";
    const removeShot = (a: unknown, b: unknown) => {
      if (isShot(a as Actor)) (a as Actor).destroy();
      if (isShot(b as Actor)) (b as Actor).destroy();
    };
    this.physics.add.collider(this.player, this.solids);
    this.physics.add.collider(this.enemies, this.solids);
    this.physics.add.collider(this.playerShots, this.solids, removeShot);
    this.physics.add.collider(this.playerShots, this.covers, removeShot);
    this.physics.add.collider(this.enemyShots, this.solids, removeShot);
    this.physics.add.collider(this.enemyShots, this.covers, removeShot);
    this.physics.add.overlap(this.playerShots, this.enemies, (a, b) => {
      const first = a as Actor;
      const second = b as Actor;
      const shot = first.texture.key === "shot" ? first : second;
      const enemy = shot === first ? second : first;
      this.hurtEnemy(enemy, shot);
    });
    this.physics.add.overlap(this.enemyShots, this.player, (a, b) => {
      const first = a as Actor;
      const second = b as Actor;
      const shot = first.texture.key === "foe-shot" ? first : second;
      shot.destroy();
      this.hurtPlayer(8);
    });
    this.physics.add.overlap(this.player, this.enemies, (_player, enemy) => {
      const kind = (enemy as Actor).kind;
      this.hurtPlayer(kind === "elite" ? 16 : 10);
    });
    this.physics.add.overlap(this.player, this.drops, (_player, drop) => this.collect(drop as Drop));

    const keyboard = this.input.keyboard!;
    this.cursors = keyboard.createCursorKeys();
    this.wasd = {
      up: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      down: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      left: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };
    this.input.once("pointerdown", () => this.unlockAudio());
    this.input.keyboard?.once("keydown", () => this.unlockAudio());
    this.bindSettings();
    this.bindManual();
    this.bindPause();
    this.drawHud();
    this.spawnEnemy("chase");
    this.spawnEnemy("turret");
  }

  update(_time: number, deltaMs: number) {
    const delta = deltaMs / 1000;
    this.syncShield();
    if (this.choosing || this.settingsOpen || this.paused || this.manualOpen) return;
    this.iframe = Math.max(0, this.iframe - delta);
    this.haste = Math.max(0, this.haste - delta);
    this.spinOrbs(delta);
    this.tickSpells(delta);
    this.movePlayer();
    this.fire -= delta;
    if (this.fire <= 0) this.shoot();
    this.spawnTimer -= delta;
    this.eliteTimer -= delta;
    if (this.spawnTimer <= 0 && this.enemies.countActive() < world.maxOnScreen) {
      this.spawnEnemy(this.eliteTimer <= 0 ? "elite" : Math.random() < 0.28 ? "turret" : "chase");
      if (this.eliteTimer <= 0) this.eliteTimer = 20;
      this.spawnTimer = this.spawn;
    }
    this.steerEnemies(delta);
    this.pullDrops();
    this.refreshHud();
  }

  private drawFloor() {
    const grid = this.add.graphics();
    grid.lineStyle(1, theme.gold, 0.45);
    for (let x = 0; x <= world.width; x += 48) grid.lineBetween(x, 0, x, world.height);
    for (let y = 0; y <= world.height; y += 48) grid.lineBetween(0, y, world.width, y);
    this.add
      .text(16, world.height - 28, `${storeName} · 自动射击 · WASD 移动 · P 暂停`, {
        fontFamily: theme.fontBody,
        fontSize: "14px",
        color: "#2d2d2d",
      })
      .setDepth(2);
  }

  private makeTextures() {
    const paint = (key: string, draw: (g: Phaser.GameObjects.Graphics) => void, w: number, h: number) => {
      const g = this.make.graphics({ x: 0, y: 0 }, false);
      draw(g);
      g.generateTexture(key, w, h);
      g.destroy();
    };
    paint("player", (g) => {
      g.fillStyle(theme.white, 1);
      g.fillCircle(16, 16, 14);
      g.lineStyle(4, theme.charcoal, 1);
      g.strokeCircle(16, 16, 14);
      g.fillStyle(theme.red, 1);
      g.slice(16, 16, 14, Phaser.Math.DegToRad(-120), Phaser.Math.DegToRad(-60), false);
      g.fillPath();
    }, 32, 32);
    paint("chase", (g) => {
      g.fillStyle(theme.red, 1);
      g.fillCircle(16, 16, 14);
      g.lineStyle(4, theme.charcoal, 1);
      g.strokeCircle(16, 16, 14);
    }, 32, 32);
    paint("elite", (g) => {
      g.fillStyle(theme.red, 1);
      g.fillCircle(20, 20, 16);
      g.lineStyle(4, theme.gold, 1);
      g.strokeCircle(20, 20, 16);
    }, 40, 40);
    paint("turret", (g) => {
      g.fillStyle(theme.red, 1);
      g.fillRoundedRect(2, 6, 28, 24, 8);
      g.lineStyle(4, theme.charcoal, 1);
      g.strokeRoundedRect(2, 6, 28, 24, 8);
      g.lineStyle(4, theme.black, 1);
      g.lineBetween(16, 6, 16, 0);
    }, 32, 32);
    paint("shot", (g) => {
      g.fillStyle(theme.red, 1);
      g.fillRoundedRect(0, 3, 16, 6, 3);
      g.lineStyle(2, theme.charcoal, 1);
      g.strokeRoundedRect(0, 3, 16, 6, 3);
    }, 16, 12);
    paint("foe-shot", (g) => {
      g.fillStyle(theme.charcoal, 1);
      g.fillTriangle(6, 0, 12, 10, 0, 10);
    }, 12, 10);
    paint("spark", (g) => {
      g.fillStyle(theme.white, 1);
      g.fillCircle(4, 4, 4);
    }, 8, 8);
    paint("xp", (g) => {
      g.fillStyle(theme.gold, 1);
      g.fillTriangle(11, 1, 21, 11, 11, 21);
      g.fillTriangle(11, 1, 1, 11, 11, 21);
      g.lineStyle(2, theme.black, 1);
      g.strokeTriangle(11, 1, 21, 11, 11, 21);
      g.strokeTriangle(11, 1, 1, 11, 11, 21);
    }, 22, 22);
    paint("heal", (g) => {
      g.fillStyle(theme.white, 1);
      g.fillCircle(11, 11, 10);
      g.lineStyle(2, theme.charcoal, 1);
      g.strokeCircle(11, 11, 10);
      g.fillStyle(theme.red, 1);
      g.fillRect(9, 4, 4, 14);
      g.fillRect(4, 9, 14, 4);
    }, 22, 22);
    paint("shield", (g) => {
      g.fillStyle(theme.white, 1);
      g.fillRoundedRect(1, 1, 20, 20, 4);
      g.lineStyle(4, theme.charcoal, 1);
      g.strokeRoundedRect(1, 1, 20, 20, 4);
      g.lineStyle(2, theme.gold, 1);
      g.strokeRoundedRect(6, 6, 10, 10, 2);
    }, 22, 22);
    paint("burst", (g) => {
      g.fillStyle(theme.red, 1);
      g.fillTriangle(2, 4, 12, 11, 2, 18);
      g.fillTriangle(12, 4, 22, 11, 12, 18);
      g.lineStyle(2, theme.charcoal, 1);
      g.strokeTriangle(2, 4, 12, 11, 2, 18);
      g.strokeTriangle(12, 4, 22, 11, 12, 18);
    }, 24, 22);
  }

  private placeObstacles() {
    const solids = [
      [150, 120, 130, 44],
      [760, 130, 86, 86],
      [470, 230, 64, 100],
      [180, 390, 150, 40],
      [690, 380, 110, 52],
    ];
    const covers = [
      [340, 110, 70, 32],
      [620, 280, 84, 32],
      [300, 300, 46, 72],
    ];
    for (const [x, y, w, h] of solids) this.addBlock(this.solids, x, y, w, h, false);
    for (const [x, y, w, h] of covers) this.addBlock(this.covers, x, y, w, h, true);
  }

  private addBlock(group: Phaser.Physics.Arcade.StaticGroup, x: number, y: number, w: number, h: number, cover: boolean) {
    const g = this.add.graphics();
    g.fillStyle(theme.kraft, 1);
    g.fillRoundedRect(x - w / 2, y - h / 2, w, h, 12);
    g.lineStyle(4, theme.charcoal, 1);
    g.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 12);
    if (cover) {
      g.lineStyle(2, theme.white, 1);
      g.strokeRoundedRect(x - w / 2 + 5, y - h / 2 + 5, w - 10, h - 10, 8);
    }
    const zone = this.add.zone(x, y, w, h);
    this.physics.add.existing(zone, true);
    group.add(zone);
  }

  private drawHud() {
    this.add.rectangle(118, 28, 180, 18, theme.white).setStrokeStyle(3, theme.charcoal).setOrigin(0, 0.5).setDepth(5);
    this.hpFill = this.add.rectangle(122, 28, 172, 10, theme.red).setOrigin(0, 0.5).setDepth(6);
    this.add
      .text(16, 18, "HP", { fontFamily: theme.fontDisplay, fontSize: "16px", color: "#000000" })
      .setDepth(7);
    this.add.rectangle(world.width / 2, world.height - 18, 420, 16, theme.white).setStrokeStyle(3, theme.charcoal).setDepth(5);
    this.xpFill = this.add.rectangle(world.width / 2 - 204, world.height - 18, 0, 10, theme.gold).setOrigin(0, 0.5).setDepth(6);
    this.levelText = this.add
      .text(world.width / 2, 22, "1 级", { fontFamily: theme.fontDisplay, fontSize: "28px", color: "#000000" })
      .setOrigin(0.5, 0)
      .setDepth(7);
    this.stats = this.add
      .text(world.width - 16, 16, "", {
        fontFamily: theme.fontBody,
        fontSize: "16px",
        color: "#2d2d2d",
        align: "right",
      })
      .setOrigin(1, 0)
      .setDepth(7);
    this.refreshHud();
  }

  private refreshHud() {
    this.hpFill.width = 172 * Phaser.Math.Clamp(this.hp / this.maxHp, 0, 1);
    const need = xpToNext(this.level);
    this.xpFill.width = 408 * Phaser.Math.Clamp(this.xp / need, 0, 1);
    this.levelText.setText(`${this.level} 级${this.shield ? "  ·  护盾" : ""}`);
    const tags = [`连发 ${this.shotCount()}`];
    if (this.pierce > 0) tags.push(`穿透 ${this.pierce}`);
    const ownedSpells = (Object.keys(this.spellLevel) as SpellId[])
      .filter((spell) => this.spellLevel[spell] > 0)
      .map((spell) => spells[spell].name);
    if (ownedSpells.length > 0) tags.push(ownedSpells.join(" "));
    if (this.guard > 0) tags.push(`减伤 ${this.guard * 15}%`);
    this.stats.setText(`伤害 ${this.damage}  ·  ${tags.join("  ")}\n范围 ${this.radius}\n间隔 ${this.fireInterval().toFixed(2)} 秒`);
  }

  private movePlayer() {
    const left = this.wasd.left.isDown || this.cursors.left.isDown;
    const right = this.wasd.right.isDown || this.cursors.right.isDown;
    const up = this.wasd.up.isDown || this.cursors.up.isDown;
    const down = this.wasd.down.isDown || this.cursors.down.isDown;
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.setVelocity((right ? 1 : 0) - (left ? 1 : 0), (down ? 1 : 0) - (up ? 1 : 0));
    body.velocity.normalize().scale(world.playerSpeed);
    if (body.velocity.length() === 0) body.setVelocity(0, 0);
  }

  private shoot() {
    const target = this.nearest();
    this.fire = this.fireInterval();
    if (!target) return;
    const aim = Phaser.Math.Angle.Between(this.player.x, this.player.y, target.x, target.y);
    const count = this.shotCount();
    for (let index = 0; index < count; index += 1) {
      const offset = count === 1 ? 0 : (index - (count - 1) / 2) * 0.22;
      this.launch(aim + offset);
    }
    this.sfx.shoot();
  }

  private fireInterval() {
    return this.haste > 0 ? Math.max(world.minInterval, world.baseInterval * 0.62) : world.baseInterval;
  }

  private shotCount() {
    return Math.min(world.maxVolley, 1 + this.split + this.pickupVolley);
  }

  private launch(angle: number) {
    const shot = this.playerShots.create(
      this.player.x + Math.cos(angle) * 36,
      this.player.y + Math.sin(angle) * 36,
      "shot",
    ) as Actor;
    shot.setDepth(8);
    shot.setRotation(angle);
    const body = shot.body as Phaser.Physics.Arcade.Body | null;
    if (!body) {
      shot.destroy();
      return;
    }
    body.setCircle(4, 4, 2);
    shot.setData("pierce", this.pierce);
    shot.setData("seen", new Set<number>());
    this.physics.velocityFromRotation(angle, 520, body.velocity);
    this.time.delayedCall(900, () => {
      if (shot.active) shot.destroy();
    });
    if (!reducedMotion) this.sparks.explode(4, shot.x, shot.y);
  }

  private nearest() {
    let best: Actor | undefined;
    let dist = Infinity;
    for (const child of this.enemies.getChildren()) {
      const enemy = child as Actor;
      if (!enemy.active) continue;
      const gap = Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.x, enemy.y);
      if (gap < dist) {
        dist = gap;
        best = enemy;
      }
    }
    return best;
  }

  private spawnEnemy(kind: "chase" | "turret" | "elite") {
    const edge = Phaser.Math.Between(0, 3);
    const x = edge === 0 ? 20 : edge === 1 ? world.width - 20 : Phaser.Math.Between(40, world.width - 40);
    const y = edge === 2 ? 20 : edge === 3 ? world.height - 20 : Phaser.Math.Between(40, world.height - 40);
    const key = kind === "elite" ? "elite" : kind === "turret" ? "turret" : "chase";
    const enemy = this.enemies.create(x, y, key) as Actor;
    enemy.kind = kind;
    enemy.hp = kind === "elite" ? 72 : kind === "turret" ? 16 : 24;
    enemy.setData("eid", this.nextEnemyId);
    this.nextEnemyId += 1;
    enemy.cooldown = kind === "turret" ? 1 : 0;
    const body = enemy.body as Phaser.Physics.Arcade.Body;
    body.setCircle(kind === "elite" ? 16 : 14);
    body.setCollideWorldBounds(true);
  }

  private steerEnemies(delta: number) {
    for (const child of this.enemies.getChildren()) {
      const enemy = child as Actor;
      if (!enemy.active) continue;
      const body = enemy.body as Phaser.Physics.Arcade.Body;
      if (enemy.kind === "turret") {
        body.setVelocity(0, 0);
        enemy.cooldown = (enemy.cooldown ?? 0) - delta;
        if ((enemy.cooldown ?? 0) <= 0) {
          enemy.cooldown = 1.7;
          this.enemyShoot(enemy);
        }
      } else {
        const slowed = (enemy.getData("slowUntil") as number) > this.time.now;
        if (slowed) enemy.setTint(theme.kraft);
        const speed = (enemy.kind === "elite" ? 100 : 80) * (slowed ? ((enemy.getData("slowMul") as number) || 0.7) : 1);
        this.physics.moveToObject(enemy, this.player, speed);
      }
    }
  }

  private enemyShoot(enemy: Actor) {
    const shot = this.enemyShots.create(enemy.x, enemy.y - 8, "foe-shot") as Actor;
    (shot.body as Phaser.Physics.Arcade.Body).setCircle(5);
    this.physics.moveToObject(shot, this.player, 200);
    this.time.delayedCall(2000, () => shot.active && shot.destroy());
  }

  private hurtEnemy(enemy: Actor, shot: Actor) {
    if (!enemy.active || !shot.active) return;
    const seen = shot.getData("seen") as Set<number>;
    const id = enemy.getData("eid") as number;
    if (seen.has(id)) return;
    seen.add(id);
    this.damageEnemy(enemy, this.damage, true);
    this.splashAround(enemy.x, enemy.y, enemy);
    const left = (shot.getData("pierce") as number) - 1;
    shot.setData("pierce", left);
    if (left < 0) shot.destroy();
  }

  private damageEnemy(enemy: Actor, amount: number, fromShot: boolean, chained = false) {
    if (!enemy.active) return;
    enemy.hp = (enemy.hp ?? 1) - amount;
    if (fromShot) {
      this.floatText(enemy.x, enemy.y - 18, String(amount), "#db0007");
      this.sfx.hit();
      if (this.ranks.leech > 0) this.hp = Math.min(this.maxHp, this.hp + this.ranks.leech);
      if (this.slowRank > 0) {
        enemy.setData("slowUntil", this.time.now + 1000);
        enemy.setData("slowMul", 1 - Math.min(0.55, 0.18 * this.slowRank));
        const puddle = this.add.ellipse(enemy.x, enemy.y + 10, 36, 16, theme.kraft, 0.9);
        puddle.setDepth(1);
        this.tweens.add({
          targets: puddle,
          alpha: 0,
          duration: 1000,
          onComplete: () => puddle.destroy(),
        });
      }
      if (!chained && this.chainRank > 0) {
        const other = this.nearestOther(enemy, 170);
        if (other) {
          const jump = Math.max(1, Math.round(amount * (0.35 + 0.12 * this.chainRank)));
          this.damageEnemy(other, jump, false, true);
        }
      }
    }
    enemy.setTint(fromShot && this.slowRank > 0 ? theme.kraft : theme.white);
    this.time.delayedCall(60, () => {
      if (!enemy.active) return;
      if ((enemy.getData("slowUntil") as number) > this.time.now) enemy.setTint(theme.kraft);
      else enemy.clearTint();
    });
    if (!reducedMotion && fromShot) {
      this.sparks.setParticleTint(theme.gold);
      this.sparks.explode(Phaser.Math.Between(6, 10), enemy.x, enemy.y);
    }
    if ((enemy.hp ?? 0) > 0) return;
    const kind = enemy.kind ?? "chase";
    const x = enemy.x;
    const y = enemy.y;
    enemy.destroy();
    this.dropAt(x, y, kind);
  }

  private splashAround(x: number, y: number, except: Actor) {
    if (this.radius <= 12) return;
    for (const child of this.enemies.getChildren()) {
      const enemy = child as Actor;
      if (!enemy.active || enemy === except) continue;
      if (Phaser.Math.Distance.Between(x, y, enemy.x, enemy.y) > this.radius) continue;
      this.damageEnemy(enemy, Math.max(1, Math.round(this.damage * 0.55)), false, true);
    }
  }

  private nearestOther(from: Actor, range: number) {
    let best: Actor | undefined;
    let dist = range;
    for (const child of this.enemies.getChildren()) {
      const enemy = child as Actor;
      if (!enemy.active || enemy === from) continue;
      const gap = Phaser.Math.Distance.Between(from.x, from.y, enemy.x, enemy.y);
      if (gap < dist) {
        dist = gap;
        best = enemy;
      }
    }
    return best;
  }

  private hurtPlayer(amount: number) {
    if (this.iframe > 0 || this.hp <= 0) return;
    const reduced = Math.max(1, Math.round(amount * (1 - 0.15 * this.guard)));
    let left = reduced;
    if (this.shield) {
      this.shield = false;
      left = Math.max(0, reduced - (world.shieldAbsorb + this.shieldBonus));
      this.floatText(this.player.x, this.player.y - 32, "护盾挡住", "#000000");
      const pop = this.add.circle(this.player.x, this.player.y, 26, theme.white, 0.25).setStrokeStyle(6, theme.gold).setDepth(8);
      this.tweens.add({ targets: pop, scale: 1.7, alpha: 0, duration: 280, onComplete: () => pop.destroy() });
    }
    this.hp = Math.max(0, this.hp - left);
    this.iframe = world.iframe;
    if (left > 0 && this.ranks.thorns > 0) {
      const wave = this.add.circle(this.player.x, this.player.y, 18, theme.red, 0.28).setStrokeStyle(4, theme.red).setDepth(8);
      this.tweens.add({ targets: wave, scale: 6, alpha: 0, duration: 260, onComplete: () => wave.destroy() });
      this.floatText(this.player.x, this.player.y - 46, "反震", "#db0007");
      for (const child of this.enemies.getChildren()) {
        const enemy = child as Actor;
        if (!enemy.active) continue;
        if (Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.x, enemy.y) > 110) continue;
        this.damageEnemy(enemy, 5 * this.ranks.thorns, false, true);
      }
    }
    this.player.setTint(theme.red);
    this.time.delayedCall(80, () => this.player.clearTint());
    if (!reducedMotion && prefs.shake) this.cameras.main.shake(80, 0.006);
    this.sfx.hurt();
    if (this.hp <= 0) this.gameOver();
  }

  private dropAt(x: number, y: number, kind: string) {
    const xp = this.drops.create(x, y, "xp") as Drop;
    xp.setDepth(6);
    xp.drop = "xp";
    xp.amount = kind === "elite" ? 8 : 3;
    if (kind === "elite" || Math.random() < 0.28) this.dropBonus(x + 22, y);
  }

  private dropBonus(x: number, y: number) {
    const roll = Math.random();
    const key = roll < 0.34 ? "heal" : roll < 0.62 ? "shield" : "burst";
    const bonus = this.drops.create(x, y, key) as Drop;
    bonus.setDepth(6);
    bonus.drop = key;
  }

  private pullDrops() {
    for (const child of this.drops.getChildren()) {
      const drop = child as Drop;
      if (!drop.active) continue;
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, drop.x, drop.y);
      if (dist < world.pickupRadius) this.physics.moveToObject(drop, this.player, 280);
    }
  }

  private collect(drop: Drop) {
    if (!drop.active) return;
    if (drop.drop === "xp") this.gainXp(drop.amount ?? 3);
    else if (drop.drop === "heal") {
      if (this.hp >= this.maxHp) this.gainXp(1);
      else {
        this.hp = Math.min(this.maxHp, this.hp + world.healAmount);
        this.burst(this.player.x, this.player.y, theme.gold);
        this.sfx.heal();
      }
    } else if (drop.drop === "shield") {
      this.shield = true;
      this.burst(this.player.x, this.player.y, theme.white);
      this.sfx.shield();
    } else if (drop.drop === "burst") {
      this.takeBurst();
    }
    drop.destroy();
  }

  private gainXp(amount: number) {
    if (this.choosing) {
      this.xp += amount;
      return;
    }
    this.xp += amount;
    const need = xpToNext(this.level);
    if (this.xp < need || this.level >= 10) return;
    this.xp -= need;
    this.level += 1;
    this.sfx.levelUp();
    this.openChoices();
  }

  private openChoices() {
    this.choosing = true;
    this.physics.pause();
    const body = this.player.body as Phaser.Physics.Arcade.Body | null;
    body?.setVelocity(0, 0);
    const dim = this.add.rectangle(world.width / 2, world.height / 2, world.width, world.height, theme.charcoal, 0.4).setDepth(20);
    const title = this.add
      .text(world.width / 2, 70, "选一个技能", {
        fontFamily: theme.fontDisplay,
        fontSize: "40px",
        color: "#000000",
        backgroundColor: "#ffbc0d",
        padding: { x: 16, y: 4 },
      })
      .setOrigin(0.5)
      .setDepth(22);
    const hand = dealOffers(this.pool, this.ranks, this.spellLevel, this.spellBranch);
    const cards = hand.map((offer, index) => this.makeCard(offer, index, hand.length));
    this.overlay = this.add.container(0, 0, [dim, title, ...cards]).setDepth(20);
    this.refreshHud();
    const pick = (index: number) => this.commitChoice(hand[index]);
    this.input.keyboard!.once("keydown-ONE", () => pick(0));
    this.input.keyboard!.once("keydown-TWO", () => pick(1));
    this.input.keyboard!.once("keydown-THREE", () => pick(2));
  }

  private makeCard(offer: Offer, index: number, count: number) {
    const card = offer.card;
    const width = 220;
    const gap = 24;
    const total = count * width + (count - 1) * gap;
    const x = world.width / 2 - total / 2 + width / 2 + index * (width + gap);
    const y = 300;
    const chrome = offerChrome(offer);
    const box = this.add.rectangle(x, y, width, 320, theme.white).setStrokeStyle(6, chrome.fill).setDepth(23);
    const bar = this.add.rectangle(x, y - 144, width - 16, 28, chrome.fill).setDepth(24);
    const school = this.add
      .text(x, y - 144, `${index + 1}  ${offerTitle(offer)}`, {
        fontFamily: theme.fontDisplay,
        fontSize: "16px",
        color: chrome.text,
      })
      .setOrigin(0.5)
      .setDepth(25);
    const key = `meal-${card.code}`;
    const picture = this.textures.exists(key)
      ? this.add.image(x, y - 52, key).setDisplaySize(108, 108).setDepth(24)
      : this.add.rectangle(x, y - 52, 108, 108, theme.gray).setDepth(24);
    const name = this.add
      .text(x, y + 24, card.name, {
        fontFamily: theme.fontBody,
        fontSize: "20px",
        color: "#2d2d2d",
        align: "center",
        wordWrap: { width: 190 },
      })
      .setOrigin(0.5)
      .setDepth(24);
    const effect = this.add
      .text(x, y + 68, effectText(offer, this.ranks), {
        fontFamily: theme.fontBody,
        fontSize: "16px",
        color: "#2d2d2d",
        align: "center",
        wordWrap: { width: 190 },
      })
      .setOrigin(0.5)
      .setDepth(24);
    const price = this.add
      .text(x, y + 118, `菜单价 ¥${card.price}`, {
        fontFamily: theme.fontBody,
        fontSize: "16px",
        color: "#db0007",
      })
      .setOrigin(0.5)
      .setDepth(24);
    box.setInteractive({ useHandCursor: true });
    box.on("pointerover", () => box.setStrokeStyle(8, chrome.fill));
    box.on("pointerout", () => box.setStrokeStyle(6, chrome.fill));
    box.on("pointerdown", () => this.commitChoice(offer));
    return this.add.container(0, 0, [box, bar, picture, name, school, effect, price]);
  }

  private unlockAudio() {
    this.sfx.unlock();
    this.bgm.unlock();
  }

  private bindSettings() {
    const panel = document.querySelector<HTMLElement>("#panel");
    const gear = document.querySelector<HTMLButtonElement>("#gear");
    const sfx = document.querySelector<HTMLInputElement>("#opt-sfx");
    const bgm = document.querySelector<HTMLInputElement>("#opt-bgm");
    const shake = document.querySelector<HTMLInputElement>("#opt-shake");
    const close = document.querySelector<HTMLButtonElement>("#opt-close");
    if (!panel || !gear || !sfx || !bgm || !shake || !close) return;
    sfx.checked = prefs.sfx;
    bgm.checked = prefs.bgm;
    shake.checked = prefs.shake;
    const open = () => {
      this.unlockAudio();
      if (!this.choosing) {
        this.settingsOpen = true;
        this.physics.pause();
      }
      panel.hidden = false;
    };
    const shut = () => {
      panel.hidden = true;
      this.settingsOpen = false;
      this.resumeIfFree();
    };
    gear.onclick = open;
    close.onclick = shut;
    sfx.onchange = () => {
      prefs.sfx = sfx.checked;
      savePrefs();
    };
    bgm.onchange = () => {
      prefs.bgm = bgm.checked;
      savePrefs();
      if (prefs.bgm) this.bgm.ensure();
      else this.bgm.stop();
    };
    shake.onchange = () => {
      prefs.shake = shake.checked;
      savePrefs();
    };
  }

  private bindManual() {
    const book = document.querySelector<HTMLButtonElement>("#book");
    const manual = document.querySelector<HTMLElement>("#manual");
    const list = document.querySelector<HTMLElement>("#manual-list");
    const close = document.querySelector<HTMLButtonElement>("#manual-close");
    if (!book || !manual || !list || !close) return;
    const color: Record<string, string> = { attack: "#db0007", spell: "#ffbc0d", tank: "#b69a81" };
    const pages = handbook();
    const rows = [
      ...pages.spells.map((item) => ({ title: item.title, detail: item.detail, school: "spell" as const })),
      ...pages.talents.map((item) => ({ title: item.title, detail: item.detail, school: item.tone })),
    ];
    list.innerHTML = rows
      .map(
        (item) =>
          `<div class="skill-row"><span style="background:${color[item.school]}"></span><div><strong>${item.title}</strong> · ${schoolName[item.school]}<br>${item.detail}</div></div>`,
      )
      .join("");
    book.onclick = () => {
      this.unlockAudio();
      this.manualOpen = true;
      if (!this.choosing) this.physics.pause();
      manual.hidden = false;
    };
    close.onclick = () => {
      manual.hidden = true;
      this.manualOpen = false;
      this.resumeIfFree();
    };
  }

  private bindPause() {
    const button = document.querySelector<HTMLButtonElement>("#pause-btn");
    button?.addEventListener("click", () => this.togglePause());
    this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.P).on("down", () => this.togglePause());
  }

  private togglePause() {
    if (this.choosing || this.settingsOpen || this.manualOpen || this.hp <= 0) return;
    this.paused = !this.paused;
    const button = document.querySelector<HTMLButtonElement>("#pause-btn");
    if (this.paused) {
      this.physics.pause();
      if (button) button.textContent = "继续";
      this.pauseBanner = this.add
        .text(world.width / 2, world.height / 2, "已暂停", {
          fontFamily: theme.fontDisplay,
          fontSize: "40px",
          color: "#000000",
          backgroundColor: "#ffbc0d",
          padding: { x: 18, y: 8 },
        })
        .setOrigin(0.5)
        .setDepth(40);
      return;
    }
    this.pauseBanner?.destroy();
    this.pauseBanner = undefined;
    if (button) button.textContent = "暂停";
    this.resumeIfFree();
  }

  private resumeIfFree() {
    if (!this.choosing && !this.settingsOpen && !this.paused && !this.manualOpen) this.physics.resume();
  }

  private syncShield() {
    if (!this.player.active) return;
    this.shieldRing.setPosition(this.player.x, this.player.y);
    this.shieldRing.setVisible(this.shield);
  }

  private takeBurst() {
    if (this.shotCount() < world.maxVolley) {
      this.pickupVolley += 1;
      this.floatText(this.player.x, this.player.y - 36, `连发 ${this.shotCount()}`, "#000000");
    } else {
      this.haste = 6;
      this.floatText(this.player.x, this.player.y - 36, "加速 6 秒", "#000000");
    }
    this.sfx.volley();
    this.burst(this.player.x, this.player.y, theme.red);
    this.refreshHud();
  }

  private commitChoice(offer?: Offer) {
    if (!this.choosing || !offer) return;
    this.choosing = false;
    this.applyCard(offer);
    this.overlay?.destroy(true);
    this.overlay = undefined;
    if (!this.settingsOpen) this.physics.resume();
  }

  private applyCard(offer: Offer) {
    const price = offer.card.price;
    if (offer.kind === "spell") {
      this.spellLevel[offer.spell] = 1;
      if (offer.spell === "nugget") this.syncOrbs();
    } else if (offer.kind === "branch") {
      this.spellBranch[offer.spell] = offer.branch;
      if (offer.spell === "nugget") this.syncOrbs();
      if (offer.spell === "fries" && offer.branch === "b") this.slowRank = Math.max(this.slowRank, 1);
    } else {
      const next = this.ranks[offer.talent] + 1;
      this.ranks[offer.talent] = next;
      if (offer.talent === "heavy") this.damage += stackedBonus(price, "damage", next, false);
      if (offer.talent === "pierce") this.pierce += 1;
      if (offer.talent === "split") this.split += 1;
      if (offer.talent === "vitality") {
        const gain = hpGain(price);
        this.maxHp += gain;
        this.hp = Math.min(this.maxHp, this.hp + gain);
      }
      if (offer.talent === "aegis") {
        this.shield = true;
        this.shieldBonus += 8;
      }
      if (offer.talent === "guard") this.guard += 1;
    }
    this.floatText(this.player.x, this.player.y - 40, effectText(offer, this.ranks), "#000000");
    this.burst(this.player.x, this.player.y, theme.gold);
    this.sfx.pick();
    this.refreshHud();
  }

  private tickSpells(delta: number) {
    const target = this.nearest();
    if (!target) return;
    const aim = Phaser.Math.Angle.Between(this.player.x, this.player.y, target.x, target.y);
    this.spellCd.burger -= delta;
    if (this.spellLevel.burger > 0 && this.spellCd.burger <= 0) {
      this.spellCd.burger = 1.2;
      const count = this.spellBranch.burger === "a" ? 2 : 1;
      const dmg = this.spellBranch.burger === "b" ? 26 : 16;
      for (let index = 0; index < count; index += 1) this.launchSpecial(aim + (index - (count - 1) / 2) * 0.2, 240, dmg, false, 1.35);
    }
    this.spellCd.fries -= delta;
    if (this.spellLevel.fries > 0 && this.spellCd.fries <= 0) {
      this.spellCd.fries = 0.85;
      const wide = this.spellBranch.fries === "a";
      const count = wide ? 7 : 4;
      const step = wide ? 0.16 : 0.1;
      for (let index = 0; index < count; index += 1) {
        this.launchSpecial(aim + (index - (count - 1) / 2) * step, 560, 4, this.spellBranch.fries === "b", 0.7);
      }
    }
    this.spellCd.pie -= delta;
    if (this.spellLevel.pie > 0 && this.spellCd.pie <= 0) {
      this.spellCd.pie = 1.5;
      const times = this.spellBranch.pie === "a" ? 2 : 1;
      const radius = this.spellBranch.pie === "b" ? 86 : 54;
      for (let index = 0; index < times; index += 1) {
        this.time.delayedCall(index * 280, () => this.dropPie(radius));
      }
    }
    this.spellCd.cola -= delta;
    if (this.spellLevel.cola > 0 && this.spellCd.cola <= 0) {
      this.spellCd.cola = 1.3;
      this.dropCola();
    }
  }

  private launchSpecial(angle: number, speed: number, dmg: number, sticky: boolean, scale: number) {
    const shot = this.playerShots.create(
      this.player.x + Math.cos(angle) * 36,
      this.player.y + Math.sin(angle) * 36,
      "shot",
    ) as Actor;
    shot.setDepth(8);
    shot.setRotation(angle);
    shot.setScale(scale);
    const body = shot.body as Phaser.Physics.Arcade.Body | null;
    if (!body) {
      shot.destroy();
      return;
    }
    body.setCircle(4, 4, 2);
    shot.setData("pierce", 0);
    shot.setData("seen", new Set<number>());
    shot.setData("dmg", dmg);
    shot.setData("sticky", sticky);
    this.physics.velocityFromRotation(angle, speed, body.velocity);
    this.time.delayedCall(1100, () => {
      if (shot.active) shot.destroy();
    });
  }

  private dropPie(radius: number) {
    const target = this.nearest();
    if (!target) return;
    const mark = this.add.circle(target.x, target.y, radius, theme.gold, 0.35).setStrokeStyle(4, theme.red).setDepth(3);
    this.time.delayedCall(320, () => {
      this.splashAround(mark.x, mark.y, target);
      this.damageEnemy(target, 12, false, true);
      mark.destroy();
    });
  }

  private dropCola() {
    const target = this.nearest();
    if (!target) return;
    const radius = this.spellBranch.cola === "b" ? 72 : 46;
    const duration = this.spellBranch.cola === "a" ? 1700 : 1000;
    const stain = this.add.ellipse(target.x, target.y + 8, radius * 1.6, radius, theme.kraft, 0.75).setDepth(2);
    this.tweens.add({ targets: stain, alpha: 0, duration, onComplete: () => stain.destroy() });
    for (const child of this.enemies.getChildren()) {
      const enemy = child as Actor;
      if (!enemy.active) continue;
      if (Phaser.Math.Distance.Between(target.x, target.y, enemy.x, enemy.y) > radius) continue;
      enemy.setData("slowUntil", this.time.now + duration);
      enemy.setData("slowMul", 0.45);
      enemy.setTint(theme.kraft);
    }
  }

  private syncOrbs() {
    while (this.orbs.length < this.orbitRank) {
      const orb = this.add.circle(this.player.x, this.player.y, 8, theme.gold);
      orb.setStrokeStyle(3, theme.charcoal);
      orb.setDepth(7);
      this.orbs.push(orb);
    }
  }

  private spinOrbs(delta: number) {
    if (this.orbs.length === 0) return;
    this.orbitAngle += delta * 2.8;
    this.orbs.forEach((orb, index) => {
      const angle = this.orbitAngle + (index * Math.PI * 2) / this.orbs.length;
      orb.setPosition(this.player.x + Math.cos(angle) * 78, this.player.y + Math.sin(angle) * 78);
    });
    for (const child of this.enemies.getChildren()) {
      const enemy = child as Actor;
      if (!enemy.active) continue;
      const near = this.orbs.some((orb) => Phaser.Math.Distance.Between(orb.x, orb.y, enemy.x, enemy.y) < 28);
      if (!near) continue;
      const until = (enemy.getData("orbUntil") as number) ?? 0;
      if (this.time.now < until) continue;
      enemy.setData("orbUntil", this.time.now + 400);
      this.damageEnemy(enemy, 4 + Math.floor(this.damage * 0.35), false);
    }
  }

  private floatText(x: number, y: number, message: string, color: string) {
    const text = this.add
      .text(x, y, message, { fontFamily: theme.fontDisplay, fontSize: "20px", color })
      .setOrigin(0.5)
      .setDepth(30);
    this.tweens.add({
      targets: text,
      y: y - 28,
      alpha: 0,
      duration: reducedMotion ? 80 : 450,
      onComplete: () => text.destroy(),
    });
  }

  private burst(x: number, y: number, tint: number) {
    if (reducedMotion) return;
    this.sparks.setParticleTint(tint);
    this.sparks.explode(12, x, y);
  }

  private gameOver() {
    this.physics.pause();
    this.add
      .text(world.width / 2, world.height / 2, "再来一局\n刷新页面", {
        fontFamily: theme.fontDisplay,
        fontSize: "40px",
        color: "#ffffff",
        align: "center",
        backgroundColor: "#db0007",
        padding: { x: 24, y: 12 },
      })
      .setOrigin(0.5)
      .setDepth(40);
  }
}

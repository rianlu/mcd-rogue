import { Bgm, unlockAudio } from "../sfx";
import { prefs, savePrefs } from "../settings";
import { Battle, type SlotState } from "../game/battle";
import { comboById, kindLabel, recyclePrice, skillById, skills, type ComboId, type SkillId, type SkillKind } from "../game/content";

type Modal = "none" | "meal" | "shop" | "skill" | "branch" | "manual" | "settings" | "pause" | "pending" | "dead" | "relics" | "bag";

const bgm = new Bgm();
let battle: Battle;
let modal: Modal = "none";
let tab: "技能" | "神器" = "技能";
let inspect = 0;
let branchId: SkillId | null = null;
let backTo: "" | "pause" | "bag" = "";
let layout: "land" | "port" = "land";
let root: HTMLElement;
let slotSig = "";
let stickId = -1;
let originX = 0;
let originY = 0;

function yuan(value: number) {
  return `¥ ${Number.isInteger(value) ? value : value.toFixed(1)}`;
}

function money(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function icon(name: "gear" | "book" | "pause" | "heart" | "bag") {
  const common = `viewBox="0 0 24 24" aria-hidden="true"`;
  if (name === "heart") return `<svg ${common}><path d="M12 19s-7-4.4-7-9a4 4 0 0 1 7-2 4 4 0 0 1 7 2c0 4.6-7 9-7 9z" fill="#db0007" stroke="#2d2d2d" stroke-width="1.6"/></svg>`;
  if (name === "book") return `<svg ${common}><path d="M5 6.5h6a3 3 0 0 1 3 3V19a2 2 0 0 0-2-2H5zM19 6.5h-6a3 3 0 0 0-3 3V19a2 2 0 0 1 2-2h7z" fill="none" stroke="#2d2d2d" stroke-width="2"/></svg>`;
  if (name === "pause") return `<svg ${common}><path d="M8 6v12M16 6v12" fill="none" stroke="#2d2d2d" stroke-width="2.6" stroke-linecap="round"/></svg>`;
  if (name === "bag") return `<svg ${common}><path d="M8 8h8l1 11H7L8 8z" fill="#ffbc0d" stroke="#2d2d2d" stroke-width="1.7"/><path d="M9 8V7a3 3 0 0 1 6 0v1" fill="none" stroke="#2d2d2d" stroke-width="1.7"/></svg>`;
  return `<svg ${common}><path d="M4 8h16M4 16h16" fill="none" stroke="#2d2d2d" stroke-width="2" stroke-linecap="round"/><circle cx="9" cy="8" r="2.4" fill="#fff" stroke="#2d2d2d" stroke-width="2"/><circle cx="15" cy="16" r="2.4" fill="#fff" stroke="#2d2d2d" stroke-width="2"/></svg>`;
}

function kindTag(kind: SkillKind) {
  const tone = kind === "技能" ? "cast" : kind === "增益" ? "ring" : "talent";
  return `<span class="tag ${tone}">${kindLabel[kind]}</span>`;
}

function slotButton(slot: SlotState | null, index: number, recycle: boolean) {
  if (!slot) return `<div class="slot-wrap"><div class="slot empty"></div><small> </small></div>`;
  const skill = skillById[slot.id];
  const balls = skill.id === "orbit" || skill.id === "orbDmg";
  const mark = skill.kind === "技能" ? `<i class="mark">${slot.branch ? "强" : "技"}</i>` : `<i class="mark">${slot.rank}</i>`;
  const hint = skill.kind === "技能" ? "技能，战斗里捡到放一次" : skill.kind === "增益" ? "增益，买下后一直在身上" : "神器，买下后一直生效";
  const caption = balls ? `增益 ${slot.rank}` : kindLabel[skill.kind];
  return `<div class="slot-wrap"><button class="slot" type="button" data-slot="${index}" aria-label="${skill.name}" title="${skill.name}，${hint}">${mark}<img src="${skill.image}" alt=""></button>${recycle ? `<small>回收 ${recyclePrice(skill.price, slot.rank, Boolean(slot.branch))}</small>` : `<small>${caption}</small>`}</div>`;
}

function paintSlots() {
  const hud = battle.hud();
  const plain = hud.slots.map((slot, index) => slotButton(slot, index, false)).join("");
  const priced = hud.slots.map((slot, index) => slotButton(slot, index, true)).join("");
  const dock = root.querySelector<HTMLElement>("#slots");
  if (dock) dock.innerHTML = plain;
  for (const id of ["shop-slots", "bag-slots", "pending-slots", "pause-slots"]) {
    const box = root.querySelector<HTMLElement>(`#${id}`);
    if (box) box.innerHTML = priced;
  }
}

function paintStats() {
  const hud = battle.hud();
  const hp = root.querySelector<HTMLElement>("#hp-num");
  const fill = root.querySelector<HTMLElement>("#hp-fill");
  const gold = root.querySelector<HTMLElement>("#gold-num");
  const wave = root.querySelector<HTMLElement>("#wave");
  if (hp) hp.textContent = hud.shield > 0 ? `${hud.hp}/${hud.maxHp} 盾${hud.shield}` : `${hud.hp}/${hud.maxHp}`;
  if (fill) fill.style.width = `${Math.max(0, (hud.hp / hud.maxHp) * 100)}%`;
  if (gold) gold.textContent = money(hud.gold);
  if (wave) wave.textContent = hud.banner;
  bgm.setCourse(hud.wave);
  const relicNum = root.querySelector<HTMLElement>("#relic-num");
  if (relicNum) relicNum.textContent = String(hud.relics.length);
  root.querySelector(".stage")?.setAttribute("data-scene", String(hud.scene));
}

function openModal(next: Modal) {
  modal = next;
  battle.paused = true;
  const stage = root.querySelector<HTMLElement>(".stage");
  const shade = root.querySelector<HTMLElement>("#shade");
  const panel = root.querySelector<HTMLElement>("#modal");
  if (!stage || !shade || !panel) return;
  stage.dataset.screen = next === "none" ? "battle" : next === "pending" || next === "dead" ? next : next;
  shade.hidden = next === "none";
  panel.innerHTML = next === "meal" ? mealHtml() : next === "shop" ? shopHtml() : next === "skill" ? skillHtml() : next === "branch" ? branchHtml() : next === "manual" ? manualHtml() : next === "settings" ? settingsHtml() : next === "pause" ? pauseHtml() : next === "pending" ? pendingHtml() : next === "dead" ? deadHtml() : next === "relics" ? relicsHtml() : next === "bag" ? bagHtml() : "";
  if (next !== "none") bgm.stop();
  if (next === "shop" || next === "bag" || next === "pending" || next === "pause") paintSlots();
}

function closeModal() {
  if (modal === "meal" || modal === "shop" || modal === "pending" || modal === "dead") return;
  if (modal === "skill" && backTo) {
    const next = backTo;
    backTo = "";
    openModal(next);
    return;
  }
  modal = "none";
  battle.paused = false;
  bgm.ensure();
  const shade = root.querySelector<HTMLElement>("#shade");
  const stage = root.querySelector<HTMLElement>(".stage");
  if (shade) shade.hidden = true;
  if (stage) stage.dataset.screen = "battle";
  paintSlots();
}

function mealHtml() {
  const cards = battle.meals
    .map((id) => comboById[id])
    .map((combo) => {
      const items = combo.grants
        .map((id) => {
          const skill = skillById[id];
          return `<li><img src="${skill.image}" alt=""><div><b>${skill.name}</b><em>${kindLabel[skill.kind]}</em><p>${skill.effect}</p></div></li>`;
        })
        .join("");
      return `<article class="meal-card">
        <header>
          <img class="meal-photo" src="${combo.image}" alt="">
          <div><strong>${combo.name}</strong><p class="price">${yuan(combo.price)}</p></div>
        </header>
        <ul class="meal-items">${items}</ul>
        <button class="btn gold" type="button" data-meal="${combo.id}">就这套</button>
      </article>`;
    })
    .join("");
  return `<section class="panel sheet meals"><h2>选一套餐</h2><p class="meal-hold">点图片看效果</p><div class="meal-grid">${cards}</div></section>`;
}

function shopHtml() {
  const hud = battle.hud();
  const cards = hud.offers
    .map((id) => {
      const skill = skillById[id];
      const owned = hud.slots.find((slot) => slot?.id === id) ?? hud.relics.find((slot) => slot.id === id);
      const branch = Boolean(owned && skill.kind === "技能" && !owned.branch);
      const upgrade = Boolean(owned && skill.kind !== "技能" && owned.rank < 3);
      const afford = hud.gold >= skill.price;
      const balls = skill.id === "orbit" || skill.id === "orbDmg";
      const label = !afford ? "金币不够" : branch ? "选强化" : upgrade ? (balls ? "再加一颗" : `升到 ${(owned?.rank ?? 1) + 1} 级`) : owned ? "已拥有" : "购买";
      const disabled = (!branch && !upgrade && owned) || !afford;
      return `<article class="product">
        <img src="${skill.image}" alt="">
        <div class="product-copy">
          <strong>${skill.name}</strong>
          ${kindTag(skill.kind)}
          <p>${skill.effect}</p>
        </div>
        <div class="product-buy">
          <p class="price">${yuan(skill.price)}</p>
          <button class="btn gold" type="button" data-buy="${id}" ${disabled ? "disabled" : ""}>${afford || owned ? label : "金币不够"}</button>
        </div>
      </article>`;
    })
    .join("");
  return `<section class="panel sheet shop-sheet"><h2>商店</h2><div class="shop-body"><p class="quote shop-note">技能掉在地上，捡到放一次。增益买下就一直在。神器是带特殊效果的装备。</p><div class="goods">${cards}</div>
    <div class="shop-slots" id="shop-slots"></div>
    <div class="relic-shop"><h3>神器</h3><div class="relic-list">${relicChips(true)}</div></div></div>
    <div class="shop-actions">
      <button class="btn white" type="button" data-refresh ${hud.refreshes >= 4 || hud.gold < hud.refreshCost ? "disabled" : ""}>${hud.refreshes >= 4 ? "不能再刷新" : hud.refreshCost === 0 ? "免费刷新" : `刷新 ${hud.refreshCost}`}</button>
      <button class="btn gold" type="button" data-continue>继续</button>
    </div></section>`;
}

function skillHtml() {
  const slot = battle.hud().slots[inspect];
  if (!slot) return "";
  const skill = skillById[slot.id];
  const price = recyclePrice(skill.price, slot.rank, Boolean(slot.branch));
  return `<article class="panel skill">
    <img class="photo" src="${skill.image}" alt="">
    <div class="skill-head"><h2>${skill.name}</h2>${kindTag(skill.kind)}</div>
    <p class="effect">${skill.effect}</p>
    <p class="price">${yuan(skill.price)}</p>
    <p class="quote">成色一般，转转回收 ${price}</p>
    <button class="btn gold ok" type="button" data-recycle="${inspect}">确认回收</button>
    <button class="btn white cancel" type="button" data-close>再想想</button>
  </article>`;
}

function relicChips(recycle: boolean) {
  const relics = battle.hud().relics;
  if (!relics.length) return `<p class="quote">还没有。神器不占下面八格。</p>`;
  return relics
    .map((slot, index) => {
      const skill = skillById[slot.id];
      const price = recyclePrice(skill.price, slot.rank, false);
      return `<article class="relic"><img src="${skill.image}" alt=""><div><strong>${skill.name}</strong> <i>${slot.rank}</i><p>${skill.effect}</p></div>${recycle ? `<button class="btn white" type="button" data-relic="${index}">回收 ${price}</button>` : ""}</article>`;
    })
    .join("");
}

function bagHtml() {
  return `<section class="panel sheet bag"><h2>身上的</h2><p class="quote">点格子可以查看和回收。神器不占那八格。</p><div class="slots bag-slots" id="bag-slots"></div><h3 class="kind-head">神器</h3><div class="relic-list">${relicChips(true)}</div><button class="btn gold" type="button" data-close>关闭</button></section>`;
}

function relicsHtml() {
  return `<section class="panel sheet relics"><h2>神器</h2><p class="quote">不占下面八格，买下后一直生效。</p><div class="relic-list">${relicChips(true)}</div><button class="btn gold" type="button" data-close>关闭</button></section>`;
}

function branchHtml() {
  if (!branchId) return "";
  const skill = skillById[branchId];
  return `<section class="panel branch"><h2>${skill.name}</h2><p class="quote">再付 ${yuan(skill.price)}，选一种强化</p><div class="pair">
    <article class="choice"><img src="${skill.image}" alt=""><strong>${skill.branchA}</strong><button class="btn gold" type="button" data-branch="a">就这个</button></article>
    <article class="choice"><img src="${skill.image}" alt=""><strong>${skill.branchB}</strong><button class="btn gold" type="button" data-branch="b">就这个</button></article>
  </div></section>`;
}

function manualRows(kind: SkillKind) {
  return skills
    .filter((skill) => skill.kind === kind)
    .map((skill) => `<article class="row"><img src="${skill.image}" alt=""><div><strong>${skill.name}</strong> ${kindTag(skill.kind)}<p>${skill.effect}</p></div></article>`)
    .join("");
}

function manualHtml() {
  const tabs = (["技能", "神器"] as const)
    .map((name) => `<button class="${name === "技能" ? "cast" : "talent"}" type="button" data-tab="${name}" aria-pressed="${tab === name}">${name}</button>`)
    .join("");
  const body = tab === "技能"
    ? manualRows("技能")
    : `<h3 class="kind-head">增益</h3>${manualRows("增益")}<h3 class="kind-head">装备</h3>${manualRows("神器")}`;
  return `<section class="panel manual"><h2>手册</h2><div class="tabs">${tabs}</div>${body}<p class="quote">技能掉在地上，捡到放一次。增益买下就一直在身上，绕身的球也算增益。神器是有自己效果的装备。</p></section>`;
}

function settingsHtml() {
  const row = (key: "sfx" | "bgm" | "shake", label: string) => `<label class="set-row">${label}<span class="switch"><input type="checkbox" data-toggle="${key}" ${prefs[key] ? "checked" : ""}><i></i></span></label>`;
  return `<section class="panel settings"><h2>设置</h2>${row("sfx", "音效")}${row("bgm", "背景音乐")}${row("shake", "受击震动")}<button class="btn gold" type="button" data-close>关闭</button></section>`;
}

function pauseHtml() {
  return `<section class="panel sheet pause-sheet"><h2>暂停</h2><div class="slots bag-slots" id="pause-slots"></div><h3 class="kind-head">神器</h3><div class="relic-list">${relicChips(true)}</div><div class="pause-row"><button class="btn gold" type="button" data-close>继续</button><button class="btn white" type="button" data-open="manual">手册</button><button class="btn white" type="button" data-open="settings">设置</button></div></section>`;
}

function pendingHtml() {
  const id = battle.hud().pending;
  if (!id) return "";
  const skill = skillById[id];
  return `<article class="panel skill"><img class="photo" src="${skill.image}" alt=""><div class="skill-head"><h2>${skill.name}</h2>${kindTag(skill.kind)}</div><p class="effect">${skill.effect} 八格满了，先回收一格，再点装上。</p><div class="slots pending-slots" id="pending-slots"></div><p class="price">免费</p><p class="quote">不要的话换成 6 金币</p><button class="btn gold ok" type="button" data-take>装上</button><button class="btn white cancel" type="button" data-skip>不要</button></article>`;
}

function deadHtml() {
  const banner = battle.hud().banner;
  return `<section class="panel settings"><h2>倒下了</h2><p>${banner}</p><p>这一局的金币、技能、增益和神器会清空。</p><button class="btn gold" type="button" data-restart>再来一局</button></section>`;
}

function applyLayout() {
  layout = window.innerWidth / window.innerHeight < 1.15 ? "port" : "land";
  root.querySelector(".stage")?.setAttribute("data-layout", layout);
}

export function mountShell(host: HTMLElement) {
  root = host;
  root.innerHTML = `<section class="stage" data-layout="land" data-screen="battle">
      <header class="topbar">
        <button class="round" type="button" data-open="settings" aria-label="设置">${icon("gear")}</button>
        <button class="round" type="button" data-open="manual" aria-label="手册">${icon("book")}</button>
        <button class="round" type="button" data-open="pause" aria-label="暂停">${icon("pause")}</button>
        <button class="speed" type="button" data-speed aria-label="倍速">1×</button>
        <strong id="wave">第 1 关</strong>
        <span class="spacer"></span>
        <div class="hp">${icon("heart")}<div class="hp-track"><div id="hp-fill" class="hp-fill"></div></div><b id="hp-num">100/100</b></div>
        <div class="gold"><i class="coin"></i><b id="gold-num">0</b></div>
      </header>
      <div class="body">
        <div class="field"><canvas id="arena"></canvas><div class="joy" id="joy"><span id="knob"></span></div></div>
        <footer class="dock"><div class="slots" id="slots"></div><button class="relic-open" type="button" data-open="relics">神器 <b id="relic-num">0</b></button></footer>
        <div class="shade" id="shade" hidden><button class="backdrop" type="button" data-close aria-label="返回战斗"></button><div id="modal"></div></div>
      </div>
      <div id="hold-tip" class="hold-tip" hidden></div>
    </section>`;
  const canvas = root.querySelector<HTMLCanvasElement>("#arena");
  if (!canvas) return;
  battle = new Battle(canvas);
  battle.onShop = () => openModal("shop");
  battle.onPending = () => openModal("pending");
  battle.onDead = () => openModal("dead");
  battle.onChange = () => {
    paintStats();
    const sig = JSON.stringify(battle.hud().slots);
    if (sig !== slotSig && modal !== "shop") {
      slotSig = sig;
      paintSlots();
    }
  };
  battle.start();
  openModal("meal");
  applyLayout();
  window.addEventListener("resize", applyLayout);
  window.addEventListener("orientationchange", applyLayout);
  new ResizeObserver(applyLayout).observe(document.documentElement);

  const holdTip = root.querySelector<HTMLElement>("#hold-tip")!;
  const hideHoldTip = () => {
    holdTip.hidden = true;
    delete holdTip.dataset.item;
  };
  const showHoldTip = (img: HTMLImageElement) => {
    const item = img.closest("li");
    if (!item) return;
    const name = item.querySelector("b")?.textContent ?? "";
    if (!holdTip.hidden && holdTip.dataset.item === name) {
      hideHoldTip();
      return;
    }
    holdTip.replaceChildren();
    const title = document.createElement("b");
    title.textContent = name;
    const tag = document.createElement("em");
    tag.textContent = item.querySelector("em")?.textContent ?? "";
    const copy = document.createElement("p");
    copy.textContent = item.querySelector("p")?.textContent ?? "";
    holdTip.append(title, tag, copy);
    holdTip.hidden = false;
    holdTip.dataset.item = name;
    const icon = img.getBoundingClientRect();
    const tip = holdTip.getBoundingClientRect();
    const left = Math.max(8, Math.min(icon.left + icon.width / 2 - tip.width / 2, window.innerWidth - tip.width - 8));
    const above = icon.top - tip.height - 8;
    holdTip.style.left = `${left}px`;
    holdTip.style.top = `${above >= 8 ? above : icon.bottom + 8}px`;
  };

  window.addEventListener("keydown", (event) => {
    const key = event.key.toLowerCase();
    if ((key === "p" || key === "escape") && modal === "none") openModal("pause");
    else if ((key === "p" || key === "escape") && modal === "pause") closeModal();
  });

  const field = root.querySelector<HTMLElement>(".field");
  const joy = root.querySelector<HTMLElement>("#joy");
  const knob = root.querySelector<HTMLElement>("#knob");
  const stickReach = 72;
  const resetJoy = () => {
    stickId = -1;
    battle.setStick(0, 0, false);
    joy?.classList.remove("dragging");
    if (joy) {
      joy.style.left = "";
      joy.style.top = "";
      joy.style.bottom = "";
    }
    if (knob) {
      knob.style.left = "";
      knob.style.top = "";
    }
  };
  const placeJoy = (clientX: number, clientY: number) => {
    if (!field || !joy) return;
    const bounds = field.getBoundingClientRect();
    const half = joy.offsetWidth / 2;
    const left = Math.max(half, Math.min(bounds.width - half, clientX - bounds.left));
    const top = Math.max(half, Math.min(bounds.height - half, clientY - bounds.top));
    joy.style.left = `${left - half}px`;
    joy.style.top = `${top - half}px`;
    joy.style.bottom = "auto";
  };
  const dragJoy = (clientX: number, clientY: number) => {
    if (!knob) return;
    const dx = clientX - originX;
    const dy = clientY - originY;
    const dist = Math.hypot(dx, dy) || 1;
    const used = Math.min(dist, stickReach);
    const nx = dx / dist;
    const ny = dy / dist;
    knob.style.left = `calc(50% + ${nx * used}px)`;
    knob.style.top = `calc(50% + ${ny * used}px)`;
    const amount = used / stickReach;
    if (amount < 0.12) battle.setStick(0, 0, false);
    else battle.setStick(nx * amount, ny * amount, true);
  };
  field?.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || modal !== "none" || !field || !joy) return;
    const target = event.target;
    if (!(target instanceof Element) || target.closest("button, a, input")) return;
    unlockAudio();
    bgm.ensure();
    stickId = event.pointerId;
    originX = event.clientX;
    originY = event.clientY;
    placeJoy(event.clientX, event.clientY);
    joy.classList.add("dragging");
    if (knob) {
      knob.style.left = "50%";
      knob.style.top = "50%";
    }
    try {
      field.setPointerCapture(event.pointerId);
    } catch {
      /* 指针已经结束时忽略 */
    }
    event.preventDefault();
  });
  field?.addEventListener("pointermove", (event) => {
    if (event.pointerId !== stickId) return;
    dragJoy(event.clientX, event.clientY);
  });
  const releaseStick = (event: PointerEvent) => {
    if (event.pointerId !== stickId) return;
    resetJoy();
  };
  field?.addEventListener("pointerup", releaseStick);
  field?.addEventListener("pointercancel", releaseStick);
  field?.addEventListener("lostpointercapture", releaseStick);

  root.addEventListener("pointerdown", (event) => {
    unlockAudio();
    if (modal === "none") bgm.ensure();
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (!target.closest(".meal-items img")) hideHoldTip();
  });
  root.addEventListener("contextmenu", (event) => {
    const target = event.target;
    if (target instanceof Element && target.closest(".meal-items img")) event.preventDefault();
  });

  root.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const mealIcon = target.closest<HTMLImageElement>(".meal-items img");
    if (mealIcon && layout === "port") {
      showHoldTip(mealIcon);
      return;
    }
    if (!target.closest("#hold-tip")) hideHoldTip();
    if (target.closest("[data-speed]")) {
      const speed = battle.cycleSpeed();
      const button = root.querySelector<HTMLButtonElement>("[data-speed]");
      if (button) {
        button.textContent = `${speed}×`;
        button.classList.toggle("fast", speed > 1);
      }
      return;
    }
    const open = target.closest<HTMLElement>("[data-open]");
    if (open?.dataset.open === "settings" || open?.dataset.open === "manual" || open?.dataset.open === "pause" || open?.dataset.open === "relics" || open?.dataset.open === "bag") {
      if (modal === "meal" || modal === "shop" || modal === "pending" || modal === "dead") return;
      openModal(open.dataset.open);
      return;
    }
    if (target.closest("[data-close]")) {
      closeModal();
      return;
    }
    const tabButton = target.closest<HTMLElement>("[data-tab]");
    if (tabButton?.dataset.tab === "技能" || tabButton?.dataset.tab === "神器") {
      tab = tabButton.dataset.tab;
      openModal("manual");
      return;
    }
    const slot = target.closest<HTMLElement>("[data-slot]");
    if (slot?.dataset.slot) {
      inspect = Number(slot.dataset.slot);
      if (modal === "shop" || modal === "pending") {
        battle.recycle(inspect);
        if (modal === "pending" && battle.takePending()) {
          modal = "none";
          root.querySelector<HTMLElement>("#shade")!.hidden = true;
          root.querySelector(".stage")?.setAttribute("data-screen", "battle");
        } else openModal(modal);
        return;
      }
      if (battle.hud().slots[inspect]) {
        if (modal === "pause" || modal === "bag") backTo = modal;
        openModal("skill");
      }
      return;
    }
    const relic = target.closest<HTMLElement>("[data-relic]");
    if (relic?.dataset.relic) {
      battle.recycleRelic(Number(relic.dataset.relic));
      openModal(modal === "shop" ? "shop" : modal === "pause" ? "pause" : modal === "bag" ? "bag" : "relics");
      return;
    }
    const recycle = target.closest<HTMLElement>("[data-recycle]");
    if (recycle?.dataset.recycle) {
      battle.recycle(Number(recycle.dataset.recycle));
      if (backTo) {
        const next = backTo;
        backTo = "";
        openModal(next);
        return;
      }
      closeModal();
      return;
    }
    const meal = target.closest<HTMLElement>("[data-meal]");
    if (meal?.dataset.meal && meal.dataset.meal in comboById) {
      if (!battle.chooseMeal(meal.dataset.meal as ComboId)) return;
      modal = "none";
      bgm.ensure();
      root.querySelector<HTMLElement>("#shade")!.hidden = true;
      root.querySelector(".stage")?.setAttribute("data-screen", "battle");
      paintSlots();
      return;
    }
    const buyer = target.closest<HTMLElement>("[data-buy]");
    if (buyer?.dataset.buy) {
      const id = buyer.dataset.buy as SkillId;
      if (battle.needsBranch(id)) {
        branchId = id;
        openModal("branch");
        return;
      }
      if (battle.buy(id)) openModal("shop");
      return;
    }
    const branch = target.closest<HTMLElement>("[data-branch]");
    if (branch?.dataset.branch === "a" || branch?.dataset.branch === "b") {
      if (branchId) battle.chooseBranch(branchId, branch.dataset.branch);
      branchId = null;
      openModal("shop");
      return;
    }
    if (target.closest("[data-refresh]")) {
      if (battle.refreshShop()) openModal("shop");
      return;
    }
    if (target.closest("[data-continue]")) {
      closeShop();
      return;
    }
    if (target.closest("[data-take]")) {
      if (!battle.takePending()) return;
      modal = "none";
      root.querySelector<HTMLElement>("#shade")!.hidden = true;
      root.querySelector(".stage")?.setAttribute("data-screen", "battle");
      return;
    }
    if (target.closest("[data-skip]")) {
      battle.skipPending();
      modal = "none";
      root.querySelector<HTMLElement>("#shade")!.hidden = true;
      root.querySelector(".stage")?.setAttribute("data-screen", "battle");
      return;
    }
    if (target.closest("[data-restart]")) {
      battle.restart();
      openModal("meal");
    }
  });

  root.addEventListener("change", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement) || !target.dataset.toggle) return;
    const key = target.dataset.toggle;
    if (key !== "sfx" && key !== "bgm" && key !== "shake") return;
    prefs[key] = target.checked;
    savePrefs();
    if (key === "bgm") {
      if (target.checked) bgm.ensure();
      else bgm.stop();
    }
  });
}

function closeShop() {
  modal = "none";
  root.querySelector<HTMLElement>("#shade")!.hidden = true;
  root.querySelector(".stage")?.setAttribute("data-screen", "battle");
  battle.continueShop();
  bgm.ensure();
}

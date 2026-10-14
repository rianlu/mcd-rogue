import { Bgm, unlockAudio } from "../sfx";
import { prefs, savePrefs } from "../settings";
import { Battle, type SlotState } from "../game/battle";
import { combos, recyclePrice, schoolLabel, skillById, type School, type SkillId } from "../game/content";

type Modal = "none" | "meal" | "shop" | "skill" | "branch" | "manual" | "settings" | "pause" | "pending" | "dead";

const bgm = new Bgm();
let battle: Battle;
let modal: Modal = "none";
let tab: School = "orb";
let inspect = 0;
let branchId: SkillId | null = null;
let layout: "land" | "port" = "land";
let root: HTMLElement;
let slotSig = "";
let stickId = -1;

function yuan(value: number) {
  return `¥ ${Number.isInteger(value) ? value : value.toFixed(1)}`;
}

function money(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function icon(name: "gear" | "book" | "pause" | "heart") {
  const common = `viewBox="0 0 24 24" aria-hidden="true"`;
  if (name === "heart") return `<svg ${common}><path d="M12 19s-7-4.4-7-9a4 4 0 0 1 7-2 4 4 0 0 1 7 2c0 4.6-7 9-7 9z" fill="#db0007" stroke="#2d2d2d" stroke-width="1.6"/></svg>`;
  if (name === "book") return `<svg ${common}><path d="M5 6.5h6a3 3 0 0 1 3 3V19a2 2 0 0 0-2-2H5zM19 6.5h-6a3 3 0 0 0-3 3V19a2 2 0 0 1 2-2h7z" fill="none" stroke="#2d2d2d" stroke-width="2"/></svg>`;
  if (name === "pause") return `<svg ${common}><path d="M8 6v12M16 6v12" fill="none" stroke="#2d2d2d" stroke-width="2.6" stroke-linecap="round"/></svg>`;
  return `<svg ${common}><path d="M4 8h16M4 16h16" fill="none" stroke="#2d2d2d" stroke-width="2" stroke-linecap="round"/><circle cx="9" cy="8" r="2.4" fill="#fff" stroke="#2d2d2d" stroke-width="2"/><circle cx="15" cy="16" r="2.4" fill="#fff" stroke="#2d2d2d" stroke-width="2"/></svg>`;
}

function tag(school: School, text: string) {
  return `<span class="tag ${school}">${text}</span>`;
}

function kindTag(kind: "主动" | "被动") {
  return kind === "主动" ? `<span class="tag cast">技能</span>` : `<span class="tag talent">天赋</span>`;
}

function slotButton(slot: SlotState | null, index: number, recycle: boolean) {
  if (!slot) return `<div class="slot-wrap"><div class="slot empty"></div>${recycle ? "<small> </small>" : ""}</div>`;
  const skill = skillById[slot.id];
  const mark = skill.kind === "被动" ? `<i class="mark">${slot.rank}</i>` : slot.branch ? `<i class="mark">支</i>` : "";
  return `<div class="slot-wrap"><button class="slot" type="button" data-slot="${index}" aria-label="${skill.name}">${mark}<img src="${skill.image}" alt=""></button>${recycle ? `<small>回收 ${recyclePrice(skill.price, slot.rank, Boolean(slot.branch))}</small>` : ""}</div>`;
}

function paintSlots(recycle: boolean) {
  const hud = battle.hud();
  const html = hud.slots.map((slot, index) => slotButton(slot, index, recycle)).join("");
  const dock = root.querySelector<HTMLElement>("#slots");
  const shopSlots = root.querySelector<HTMLElement>("#shop-slots");
  if (dock && !recycle) dock.innerHTML = html;
  if (shopSlots && recycle) shopSlots.innerHTML = html;
  if (dock && modal !== "shop") dock.innerHTML = hud.slots.map((slot, index) => slotButton(slot, index, false)).join("");
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
  panel.innerHTML = next === "meal" ? mealHtml() : next === "shop" ? shopHtml() : next === "skill" ? skillHtml() : next === "branch" ? branchHtml() : next === "manual" ? manualHtml() : next === "settings" ? settingsHtml() : next === "pause" ? pauseHtml() : next === "pending" ? pendingHtml() : next === "dead" ? deadHtml() : "";
  if (next === "shop") paintSlots(true);
}

function closeModal() {
  if (modal === "meal" || modal === "shop" || modal === "pending" || modal === "dead") return;
  modal = "none";
  battle.paused = false;
  const shade = root.querySelector<HTMLElement>("#shade");
  const stage = root.querySelector<HTMLElement>(".stage");
  if (shade) shade.hidden = true;
  if (stage) stage.dataset.screen = "battle";
  paintSlots(false);
}

function mealHtml() {
  const cards = combos
    .map((combo) => {
      const items = combo.grants
        .map((id) => {
          const skill = skillById[id];
          return `<li><img src="${skill.image}" alt=""><div><b>${skill.name}</b><p>${skill.effect}</p></div></li>`;
        })
        .join("");
      return `<article class="meal-card">
        <img class="meal-photo" src="${combo.image}" alt="">
        <strong>${combo.name}</strong>
        <p class="price">${yuan(combo.price)}</p>
        <p class="quote">菜单价，这一局免费</p>
        <p class="contains">包含</p>
        <ul class="meal-items">${items}</ul>
        <button class="btn gold" type="button" data-meal="${combo.id}">就这套</button>
      </article>`;
    })
    .join("");
  return `<section class="panel sheet meals"><h2>选一套餐</h2><p class="quote">开局带走下面列出的两件。商店只卖单品。</p><div class="meal-grid">${cards}</div></section>`;
}

function shopHtml() {
  const hud = battle.hud();
  const cards = hud.offers
    .map((id) => {
      const skill = skillById[id];
      const owned = hud.slots.find((slot) => slot?.id === id);
      const branch = Boolean(owned && skill.kind === "主动" && !owned.branch);
      const upgrade = Boolean(owned && skill.kind === "被动" && owned.rank < 3);
      const afford = hud.gold >= skill.price;
      const label = !afford ? "金币不够" : branch ? "选分支" : upgrade ? `升到 ${(owned?.rank ?? 1) + 1} 级` : owned ? "已拥有" : "购买";
      const disabled = (!branch && !upgrade && owned) || !afford;
      return `<article class="product">
        <img src="${skill.image}" alt="">
        <strong>${skill.name}</strong>
        ${tag(skill.school, schoolLabel[skill.school])} ${kindTag(skill.kind)}
        <p>${skill.effect}</p>
        <p class="price">${yuan(skill.price)}</p>
        <button class="btn gold" type="button" data-buy="${id}" ${disabled ? "disabled" : ""}>${afford || owned ? label : "金币不够"}</button>
      </article>`;
    })
    .join("");
  return `<section class="panel sheet"><h2>商店</h2><div class="goods">${cards}</div>
    <div class="shop-actions">
      <button class="btn white" type="button" data-refresh ${hud.refreshes >= 4 || hud.gold < hud.refreshCost ? "disabled" : ""}>${hud.refreshes >= 4 ? "不能再刷新" : hud.refreshCost === 0 ? "免费刷新" : `刷新 ${hud.refreshCost}`}</button>
      <button class="btn gold" type="button" data-continue>继续</button>
    </div>
    <div class="shop-slots" id="shop-slots"></div></section>`;
}

function skillHtml() {
  const slot = battle.hud().slots[inspect];
  if (!slot) return "";
  const skill = skillById[slot.id];
  const price = recyclePrice(skill.price, slot.rank, Boolean(slot.branch));
  return `<article class="panel skill">
    <img class="photo" src="${skill.image}" alt="">
    <div class="skill-head"><h2>${skill.name}</h2>${tag(skill.school, schoolLabel[skill.school])} ${kindTag(skill.kind)}</div>
    <p class="effect">${skill.effect}</p>
    <p class="price">${yuan(skill.price)}</p>
    <p class="quote">成色一般，转转回收 ${price}</p>
    <button class="btn gold ok" type="button" data-recycle="${inspect}">确认回收</button>
    <button class="btn white cancel" type="button" data-close>再想想</button>
  </article>`;
}

function branchHtml() {
  if (!branchId) return "";
  const skill = skillById[branchId];
  return `<section class="panel branch"><h2>${skill.name}</h2><p class="quote">再付 ${yuan(skill.price)}，选一条</p><div class="pair">
    <article class="choice"><img src="${skill.image}" alt=""><strong>${skill.branchA}</strong><button class="btn gold" type="button" data-branch="a">就这个</button></article>
    <article class="choice"><img src="${skill.image}" alt=""><strong>${skill.branchB}</strong><button class="btn gold" type="button" data-branch="b">就这个</button></article>
  </div></section>`;
}

function manualGroup(kind: "主动" | "被动") {
  const rows = Object.values(skillById)
    .filter((skill) => skill.school === tab && skill.kind === kind)
    .map((skill) => `<article class="row"><img src="${skill.image}" alt=""><div><strong>${skill.name}</strong> ${kindTag(skill.kind)}<p>${skill.effect}</p></div></article>`)
    .join("");
  if (!rows) return "";
  return `<h3 class="kind-head">${kind === "主动" ? "技能" : "天赋"}</h3>${rows}`;
}

function manualHtml() {
  const tabs = (["orb", "tank", "spell"] as const)
    .map((school) => `<button class="${school}" type="button" data-tab="${school}" aria-pressed="${tab === school}">${schoolLabel[school]}</button>`)
    .join("");
  return `<section class="panel manual"><h2>手册</h2><div class="tabs">${tabs}</div>${manualGroup("主动")}${manualGroup("被动")}<p class="quote">技能自己放。天赋一直在，最多 3 级。</p></section>`;
}

function settingsHtml() {
  const row = (key: "sfx" | "bgm" | "shake", label: string) => `<label class="set-row">${label}<span class="switch"><input type="checkbox" data-toggle="${key}" ${prefs[key] ? "checked" : ""}><i></i></span></label>`;
  return `<section class="panel settings"><h2>设置</h2>${row("sfx", "音效")}${row("bgm", "背景音乐")}${row("shake", "受击震动")}<button class="btn gold" type="button" data-close>关闭</button></section>`;
}

function pauseHtml() {
  return `<div class="panel pause"><button class="btn gold go" type="button" data-close>继续</button><div class="pause-row"><button class="btn white" type="button" data-open="manual">手册</button><button class="btn white" type="button" data-open="settings">设置</button></div></div>`;
}

function pendingHtml() {
  const id = battle.hud().pending;
  if (!id) return "";
  const skill = skillById[id];
  return `<article class="panel skill"><img class="photo" src="${skill.image}" alt=""><div class="skill-head"><h2>${skill.name}</h2>${tag(skill.school, schoolLabel[skill.school])} ${kindTag(skill.kind)}</div><p class="effect">${skill.effect} 八格满了，先回收下面一格，再点装上。</p><p class="price">免费</p><p class="quote">不要的话换成 6 金币</p><button class="btn gold ok" type="button" data-take>装上</button><button class="btn white cancel" type="button" data-skip>不要</button></article>`;
}

function deadHtml() {
  const banner = battle.hud().banner;
  return `<section class="panel settings"><h2>倒下了</h2><p>${banner}</p><p>这一局的金币和技能会清空。</p><button class="btn gold" type="button" data-restart>再来一局</button></section>`;
}

function applyLayout() {
  layout = window.innerWidth / window.innerHeight < 1.15 ? "port" : "land";
  root.querySelector(".stage")?.setAttribute("data-layout", layout);
}

function stickVector(clientX: number, clientY: number) {
  const base = root.querySelector<HTMLElement>("#joy");
  const knob = root.querySelector<HTMLElement>("#knob");
  if (!base || !knob) return;
  const rect = base.getBoundingClientRect();
  const dx = clientX - (rect.left + rect.width / 2);
  const dy = clientY - (rect.top + rect.height / 2);
  const max = rect.width * 0.32;
  const dist = Math.hypot(dx, dy);
  const nx = dist > 0 ? dx / dist : 0;
  const ny = dist > 0 ? dy / dist : 0;
  const used = Math.min(dist, max);
  knob.style.transform = `translate(calc(-50% + ${nx * used}px), calc(-50% + ${ny * used}px))`;
  const amount = dist / max;
  if (amount < 0.12) battle.setStick(0, 0, false);
  else battle.setStick(nx * Math.min(1, amount), ny * Math.min(1, amount), true);
}

export function mountShell(host: HTMLElement) {
  root = host;
  root.innerHTML = `<section class="stage" data-layout="land" data-screen="battle">
      <header class="topbar">
        <button class="round" type="button" data-open="settings" aria-label="设置">${icon("gear")}</button>
        <button class="round" type="button" data-open="manual" aria-label="手册">${icon("book")}</button>
        <button class="round" type="button" data-open="pause" aria-label="暂停">${icon("pause")}</button>
        <strong id="wave">第 1 关</strong>
        <span class="spacer"></span>
        <div class="hp">${icon("heart")}<div class="hp-track"><div id="hp-fill" class="hp-fill"></div></div><b id="hp-num">100/100</b></div>
        <div class="gold"><i class="coin"></i><b id="gold-num">0</b></div>
      </header>
      <div class="body">
        <div class="field"><canvas id="arena"></canvas><div class="joy" id="joy"><span id="knob"></span></div></div>
        <footer class="dock"><div class="slots" id="slots"></div></footer>
        <div class="shade" id="shade" hidden><button class="backdrop" type="button" data-close aria-label="返回战斗"></button><div id="modal"></div></div>
      </div>
    </section>
    <div class="turn">
      <span class="turn-phone" aria-hidden="true"></span>
      <strong>请把手机横过来</strong>
      <p>横屏能看全这张地图，也更好躲开子弹。</p>
    </div>`;
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
      paintSlots(false);
    }
  };
  battle.start();
  openModal("meal");
  applyLayout();
  window.addEventListener("resize", applyLayout);
  window.addEventListener("keydown", (event) => {
    const key = event.key.toLowerCase();
    if ((key === "p" || key === "escape") && modal === "none") openModal("pause");
    else if ((key === "p" || key === "escape") && modal === "pause") closeModal();
  });

  const joy = root.querySelector<HTMLElement>("#joy");
  joy?.addEventListener("pointerdown", (event) => {
    unlockAudio();
    bgm.ensure();
    stickId = event.pointerId;
    joy.setPointerCapture(event.pointerId);
    stickVector(event.clientX, event.clientY);
  });
  joy?.addEventListener("pointermove", (event) => {
    if (event.pointerId !== stickId) return;
    stickVector(event.clientX, event.clientY);
  });
  const release = (event: PointerEvent) => {
    if (event.pointerId !== stickId) return;
    stickId = -1;
    battle.setStick(0, 0, false);
    const knob = root.querySelector<HTMLElement>("#knob");
    if (knob) knob.style.transform = "translate(-50%, -50%)";
  };
  joy?.addEventListener("pointerup", release);
  joy?.addEventListener("pointercancel", release);

  root.addEventListener("pointerdown", () => {
    unlockAudio();
    bgm.ensure();
  });

  root.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const open = target.closest<HTMLElement>("[data-open]");
    if (open?.dataset.open === "settings" || open?.dataset.open === "manual" || open?.dataset.open === "pause") {
      if (modal === "meal" || modal === "shop" || modal === "pending" || modal === "dead") return;
      openModal(open.dataset.open);
      return;
    }
    if (target.closest("[data-close]")) {
      closeModal();
      return;
    }
    const tabButton = target.closest<HTMLElement>("[data-tab]");
    if (tabButton?.dataset.tab === "orb" || tabButton?.dataset.tab === "tank" || tabButton?.dataset.tab === "spell") {
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
      if (battle.hud().slots[inspect]) openModal("skill");
      return;
    }
    const recycle = target.closest<HTMLElement>("[data-recycle]");
    if (recycle?.dataset.recycle) {
      battle.recycle(Number(recycle.dataset.recycle));
      closeModal();
      return;
    }
    const meal = target.closest<HTMLElement>("[data-meal]");
    if (meal?.dataset.meal === "nugget-meal" || meal?.dataset.meal === "bigmac-meal" || meal?.dataset.meal === "grill-meal") {
      if (!battle.chooseMeal(meal.dataset.meal)) return;
      modal = "none";
      root.querySelector<HTMLElement>("#shade")!.hidden = true;
      root.querySelector(".stage")?.setAttribute("data-screen", "battle");
      paintSlots(false);
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
}

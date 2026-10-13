export type Prefs = {
  sfx: boolean;
  bgm: boolean;
  shake: boolean;
};

const key = "mcd-rogue-settings";

function load(): Prefs {
  try {
    const saved = JSON.parse(localStorage.getItem(key) ?? "") as Partial<Prefs>;
    return {
      sfx: saved.sfx !== false,
      bgm: saved.bgm !== false,
      shake: saved.shake !== false,
    };
  } catch {
    return { sfx: true, bgm: true, shake: true };
  }
}

export const prefs: Prefs = load();

export function savePrefs() {
  localStorage.setItem(key, JSON.stringify(prefs));
}

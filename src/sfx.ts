import { prefs } from "./settings";

let ctx: AudioContext | undefined;
let unlocked = false;

export function unlockAudio() {
  const audio = context();
  if (audio.state === "suspended") void audio.resume();
  unlocked = audio.state === "running";
  return unlocked;
}

function context() {
  if (!ctx) ctx = new AudioContext();
  return ctx;
}

function tone(freq: number, duration: number, type: OscillatorType, volume: number, downTo = 0, delay = 0) {
  if (!unlocked || !prefs.sfx) return;
  const audio = context();
  const start = audio.currentTime + delay;
  const osc = audio.createOscillator();
  const amp = audio.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  if (downTo > 0) osc.frequency.exponentialRampToValueAtTime(downTo, start + duration);
  amp.gain.setValueAtTime(volume, start);
  amp.gain.exponentialRampToValueAtTime(0.001, start + duration);
  osc.connect(amp);
  amp.connect(audio.destination);
  osc.start(start);
  osc.stop(start + duration + 0.02);
}

export class Sfx {
  unlock() {
    unlockAudio();
  }

  shoot() {
    tone(740, 0.045, "triangle", 0.04);
  }

  hit() {
    tone(210, 0.04, "square", 0.028);
  }

  hurt() {
    tone(180, 0.1, "sawtooth", 0.035, 90);
  }

  levelUp() {
    tone(523, 0.08, "triangle", 0.05);
    tone(659, 0.1, "triangle", 0.04, 0, 0.06);
  }

  pick() {
    tone(784, 0.07, "triangle", 0.05);
    tone(1046, 0.12, "triangle", 0.04, 0, 0.05);
  }

  heal() {
    tone(880, 0.1, "sine", 0.05);
  }

  shield() {
    tone(494, 0.08, "triangle", 0.05);
  }

  volley() {
    tone(988, 0.09, "triangle", 0.05);
  }
}

type Mood = "street" | "rush" | "heat";
type Drum = 0 | "k" | "h" | "kh";

type Track = {
  step: number;
  leadType: OscillatorType;
  leadGain: number;
  bass: Array<number | 0>;
  lead: Array<number | 0>;
  drum: Drum[];
};

const tracks: Record<Mood, Track> = {
  street: {
    step: 0.27,
    leadType: "sine",
    leadGain: 0.034,
    bass: [131, 0, 0, 98, 175, 0, 0, 131, 196, 0, 0, 147, 131, 0, 98, 0],
    lead: [523, 0, 659, 0, 784, 659, 0, 587, 0, 523, 0, 440, 392, 0, 440, 0],
    drum: ["k", 0, "h", 0, "k", 0, "h", 0, "k", 0, "h", 0, "k", 0, "h", 0],
  },
  rush: {
    step: 0.2,
    leadType: "triangle",
    leadGain: 0.03,
    bass: [147, 0, 175, 196, 220, 0, 196, 175, 165, 0, 147, 131, 147, 0, 110, 131],
    lead: [0, 587, 0, 698, 0, 0, 659, 587, 0, 523, 0, 587, 698, 0, 784, 0],
    drum: ["k", "h", 0, "h", "kh", "h", "k", "h", "k", "h", 0, "kh", "k", "h", "h", 0],
  },
  heat: {
    step: 0.16,
    leadType: "triangle",
    leadGain: 0.026,
    bass: [110, 110, 0, 110, 82, 0, 110, 0, 98, 0, 110, 0, 87, 110, 0, 82],
    lead: [440, 0, 523, 494, 440, 392, 0, 349, 440, 523, 0, 659, 523, 0, 494, 440],
    drum: ["kh", "h", "h", "k", "kh", "h", "h", "k", "kh", "h", "k", "h", "kh", "h", "h", "k"],
  },
};

export class Bgm {
  private timer = 0;
  private next = 0;
  private step = 0;
  private mood: Mood = "street";

  unlock() {
    if (unlockAudio()) this.ensure();
  }

  setCourse(wave: number) {
    const mood: Mood = wave >= 10 ? "heat" : wave >= 5 ? "rush" : "street";
    if (mood === this.mood) return;
    this.mood = mood;
    this.step = 0;
  }

  ensure() {
    if (!prefs.bgm || !unlocked || this.timer) return;
    this.next = context().currentTime + 0.08;
    this.timer = window.setInterval(() => this.pump(), 60);
  }

  stop() {
    if (!this.timer) return;
    window.clearInterval(this.timer);
    this.timer = 0;
  }

  private pump() {
    if (!prefs.bgm || !unlocked) return;
    const audio = context();
    const track = tracks[this.mood];
    while (this.next < audio.currentTime + 0.22) {
      const beat = this.step % track.lead.length;
      const bass = track.bass[beat];
      if (bass) this.note(bass, this.next, track.step * 1.6, 0.028, "sine");
      const lead = track.lead[beat];
      if (lead) this.note(lead, this.next, track.step * 0.9, track.leadGain, track.leadType);
      const drum = track.drum[beat];
      if (drum === "k" || drum === "kh") this.kick(this.next);
      if (drum === "h" || drum === "kh") this.hat(this.next);
      this.step += 1;
      this.next += track.step;
    }
  }

  private note(freq: number, when: number, duration: number, volume: number, type: OscillatorType, downTo = 0) {
    const audio = context();
    const osc = audio.createOscillator();
    const amp = audio.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, when);
    if (downTo > 0) osc.frequency.exponentialRampToValueAtTime(downTo, when + duration);
    amp.gain.setValueAtTime(volume, when);
    amp.gain.exponentialRampToValueAtTime(0.001, when + Math.max(0.03, duration));
    osc.connect(amp);
    amp.connect(audio.destination);
    osc.start(when);
    osc.stop(when + duration + 0.02);
  }

  private kick(when: number) {
    this.note(150, when, 0.09, 0.05, "sine", 52);
  }

  private hat(when: number) {
    this.note(1700, when, 0.02, 0.006, "square");
  }
}

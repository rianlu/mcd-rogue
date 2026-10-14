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

type Track = {
  step: number;
  leadHold: number;
  bass: Array<number | 0>;
  lead: Array<number | 0>;
  tickEvery: number;
};

const tracks: Record<Mood, Track> = {
  street: {
    step: 0.19,
    leadHold: 0.8,
    tickEvery: 2,
    bass: [131, 0, 131, 0, 131, 0, 196, 0, 175, 0, 175, 0, 196, 0, 131, 0],
    lead: [523, 659, 784, 659, 880, 784, 659, 587, 523, 659, 784, 1047, 880, 784, 659, 523],
  },
  rush: {
    step: 0.16,
    leadHold: 0.62,
    tickEvery: 1,
    bass: [110, 0, 110, 165, 110, 0, 82, 165, 87, 0, 87, 131, 82, 0, 110, 165],
    lead: [440, 523, 659, 880, 784, 659, 523, 587, 659, 784, 880, 1047, 988, 880, 784, 659],
  },
  heat: {
    step: 0.135,
    leadHold: 0.5,
    tickEvery: 1,
    bass: [82, 123, 82, 165, 98, 147, 82, 123, 82, 123, 110, 165, 98, 147, 82, 123],
    lead: [659, 784, 988, 1319, 1175, 988, 784, 880, 659, 880, 1175, 1319, 1047, 988, 880, 784],
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
    this.mood = wave >= 10 ? "heat" : wave >= 5 ? "rush" : "street";
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
      const beat = this.step % 16;
      const bass = track.bass[beat];
      if (bass) this.note(bass, this.next, track.step * 1.35, 0.03, "sine");
      const lead = track.lead[beat];
      if (lead) this.note(lead, this.next, track.step * track.leadHold, 0.042, "triangle");
      if (beat % track.tickEvery === 0) this.note(beat % 4 === 0 ? 1760 : 1400, this.next, 0.028, beat % 4 === 0 ? 0.014 : 0.008, "square");
      this.step += 1;
      this.next += track.step;
    }
  }

  private note(freq: number, when: number, duration: number, volume: number, type: OscillatorType) {
    const audio = context();
    const osc = audio.createOscillator();
    const amp = audio.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, when);
    amp.gain.setValueAtTime(volume, when);
    amp.gain.exponentialRampToValueAtTime(0.001, when + duration);
    osc.connect(amp);
    amp.connect(audio.destination);
    osc.start(when);
    osc.stop(when + duration + 0.02);
  }
}

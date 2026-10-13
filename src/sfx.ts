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

const melody = [262, 330, 392, 330, 440, 392, 330, 262, 349, 440, 523, 440, 392, 330, 294, 262];

export class Bgm {
  private timer = 0;
  private next = 0;
  private step = 0;

  unlock() {
    if (unlockAudio()) this.ensure();
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
    while (this.next < audio.currentTime + 0.25) {
      this.note(melody[this.step % melody.length], this.next, 0.045);
      if (this.step % 4 === 0) this.note(melody[this.step % melody.length] / 2, this.next, 0.03, "triangle");
      this.step += 1;
      this.next += 0.24;
    }
  }

  private note(freq: number, when: number, volume: number, type: OscillatorType = "square") {
    const audio = context();
    const osc = audio.createOscillator();
    const amp = audio.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, when);
    amp.gain.setValueAtTime(volume, when);
    amp.gain.exponentialRampToValueAtTime(0.001, when + 0.2);
    osc.connect(amp);
    amp.connect(audio.destination);
    osc.start(when);
    osc.stop(when + 0.22);
  }
}

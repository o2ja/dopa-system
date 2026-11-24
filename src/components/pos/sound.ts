// Synthesized chimes (no audio files). iOS only allows audio after a user gesture, so unlockAudio() runs on tap.
let ctx: AudioContext | null = null;

export function unlockAudio() {
  ctx ??= new (window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx.state !== "closed";
}

function tone(freq: number, start: number, dur: number) {
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.value = freq;
  const t = ctx.currentTime + start;
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(0.35, t + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + dur + 0.05);
}

/** "payment" = CliQ receipt waiting for approval (three rising notes); "order" = new QR order (two notes). */
export function chime(kind: "order" | "payment") {
  if (!ctx || ctx.state !== "running") return;
  const notes = kind === "payment" ? [784, 988, 1319] : [880, 1319];
  notes.forEach((f, i) => tone(f, i * 0.16, 0.5));
}

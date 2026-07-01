// sfx.js — Web Audio sound effects, no game logic.
let ac;
function audioCtx() {
  if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)();
  if (ac.state === 'suspended') ac.resume();
  return ac;
}
function tone(freq, type, vol, decay, freqEnd) {
  const c = audioCtx();
  if (c.state !== 'running') return;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, c.currentTime);
  if (freqEnd !== undefined) o.frequency.exponentialRampToValueAtTime(freqEnd, c.currentTime + decay);
  g.gain.setValueAtTime(vol, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + decay);
  o.connect(g); g.connect(c.destination);
  o.start(); o.stop(c.currentTime + decay);
}

export const sfx = {
  unlock() { audioCtx(); },
  kill()   { tone(520, 'square',   0.10, 0.07); },
  hit()    { tone(90,  'sawtooth', 0.28, 0.22, 55); },
  levelUp(){ tone(523, 'sine', 0.18, 0.14); setTimeout(() => tone(784, 'sine', 0.18, 0.2), 110); },
  skill()  { tone(680, 'sine',   0.11, 0.09); },
  over()   { tone(220, 'sawtooth', 0.22, 0.35, 110); setTimeout(() => tone(110, 'sawtooth', 0.18, 0.55), 220); },
  bossSpawn()     { tone(55, 'sawtooth', 0.28, 0.6, 35); setTimeout(() => tone(330, 'sine', 0.12, 0.3, 220), 300); },
  waveClear()     { tone(523, 'sine', 0.14, 0.13); setTimeout(() => tone(659, 'sine', 0.14, 0.13), 130); setTimeout(() => tone(784, 'sine', 0.18, 0.25), 260); },
  enrage()        { tone(160, 'sawtooth', 0.20, 0.10, 90); setTimeout(() => tone(220, 'sawtooth', 0.18, 0.14, 110), 90); },
  bomberExplode() { tone(70, 'sawtooth', 0.32, 0.45, 25); },
  droneZap()      { tone(1400, 'square', 0.05, 0.04, 500); },
};

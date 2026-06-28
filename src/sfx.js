// sfx.js — Web Audio sound effects, no game logic.
let ac;
function audioCtx() {
  if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)();
  if (ac.state === 'suspended') ac.resume();
  return ac;
}
function tone(freq, type, vol, decay, freqEnd) {
  const c = audioCtx();
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
};

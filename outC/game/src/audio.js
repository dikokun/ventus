// Procedural audio (Web Audio, no assets): engine hum tied to throttle, wind
// by speed, the St. Elmo hum that rises with the field, thunder that arrives
// late by distance, strike zaps, vent whoosh, deploy clunks, the anomaly's
// paint hum, warnings, the cradle's catch, and the pay chime.

export function createAudio() {
  let ctx = null, engine, engineGain, wind, windGain, hum, humGain, master;
  function ensure() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return true; }
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain(); master.gain.value = 0.5; master.connect(ctx.destination);
      engine = ctx.createOscillator(); engine.type = 'sawtooth'; engine.frequency.value = 55;
      const ef = ctx.createBiquadFilter(); ef.type = 'lowpass'; ef.frequency.value = 320;
      engineGain = ctx.createGain(); engineGain.gain.value = 0;
      engine.connect(ef); ef.connect(engineGain); engineGain.connect(master); engine.start();
      const nb = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const d = nb.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      wind = ctx.createBufferSource(); wind.buffer = nb; wind.loop = true;
      const wf = ctx.createBiquadFilter(); wf.type = 'bandpass'; wf.frequency.value = 700; wf.Q.value = 0.6;
      windGain = ctx.createGain(); windGain.gain.value = 0;
      wind.connect(wf); wf.connect(windGain); windGain.connect(master); wind.start();
      hum = ctx.createOscillator(); hum.type = 'sine'; hum.frequency.value = 400;
      humGain = ctx.createGain(); humGain.gain.value = 0;
      hum.connect(humGain); humGain.connect(master); hum.start();
    } catch { return false; }
    return true;
  }
  function blip(freq, dur, type = 'sine', vol = 0.16, slide = 0) {
    if (!ensure()) return;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.value = freq;
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), ctx.currentTime + dur);
    g.gain.setValueAtTime(vol, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    o.connect(g); g.connect(master); o.start(); o.stop(ctx.currentTime + dur);
  }
  function noiseBurst(dur, freq, vol) {
    if (!ensure()) return;
    const nb = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
    const dd = nb.getChannelData(0);
    for (let i = 0; i < dd.length; i++) dd[i] = (Math.random() * 2 - 1) * (1 - i / dd.length);
    const src = ctx.createBufferSource(); src.buffer = nb;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = freq;
    const g = ctx.createGain(); g.gain.value = vol;
    src.connect(f); f.connect(g); g.connect(master); src.start();
  }
  return {
    unlock() { ensure(); },
    update(state, charge) {
      if (!ctx) return;
      engineGain.gain.value = 0.015 + state.throttle * 0.075;
      engine.frequency.value = 48 + state.throttle * 65 + state.speed * 0.22;
      windGain.gain.value = Math.min(0.2, state.speed * 0.0028) * (state.airborne ? 1 : 0.25);
      humGain.gain.value = charge * 0.05;
      hum.frequency.value = 400 + charge * 260;
    },
    thunder(dist) { setTimeout(() => noiseBurst(0.9, 220, Math.max(0.05, 0.4 - dist / 1400)), Math.min(2400, dist * 1.9)); },
    zap() { blip(1900, 0.16, 'square', 0.1, -1500); noiseBurst(0.12, 3200, 0.14); },
    vent() { noiseBurst(0.5, 1200, 0.12); },
    clunk() { blip(140, 0.14, 'triangle', 0.22, -60); },
    paintTick() { blip(880, 0.07, 'sine', 0.07, 120); },
    shot() { blip(1500, 0.09, 'square', 0.08, -900); },
    splash() { noiseBurst(0.4, 500, 0.2); blip(300, 0.3, 'sine', 0.1, -180); },
    alarm() { blip(660, 0.16, 'square', 0.1); setTimeout(() => blip(660, 0.16, 'square', 0.1), 200); },
    catch_() { blip(220, 0.2, 'triangle', 0.2, -40); setTimeout(() => blip(330, 0.24, 'triangle', 0.16), 110); },
    cash() { blip(880, 0.12, 'sine', 0.12); setTimeout(() => blip(1320, 0.2, 'sine', 0.12), 100); },
    crash() { noiseBurst(0.8, 300, 0.34); },
  };
}

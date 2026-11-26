// DOM HUD: the tapes and readouts that ride over the 3D view in chase mode
// (the cockpit mode leans on the canvas panel instead). Speed/altitude/
// heading tapes, the objective card with its progress, capacitor + fuel +
// hull bars, warning line, and the dispatcher's radio line.

const $ = id => document.getElementById(id);
const kt = ms => Math.round(ms * 1.94384);
const ft = m => Math.round(m * 3.28084);

export function createHud() {
  const els = {
    spd: $('spd'), alt: $('alt'), hdg: $('hdg'), vs: $('vs'),
    obj: $('obj-title'), objSub: $('obj-sub'), objBar: $('obj-bar'),
    warn: $('warn'), radio: $('radio'), cap: $('cap-fill'), capTxt: $('cap-txt'),
    fuel: $('fuel-fill'), hull: $('hull-fill'), tgt: $('tgt'),
    energy: $('energy'), shear: $('shear-txt'), thr: $('thr-fill'),
  };
  let radioTimer = null;
  return {
    say(text, holdMs = 5200) {
      els.radio.textContent = text;
      els.radio.style.opacity = '1';
      clearTimeout(radioTimer);
      radioTimer = setTimeout(() => { els.radio.style.opacity = '0.35'; }, holdMs);
    },
    // view: {state, craft, target:{label,dist,bearingDeg}|null, objective:{title,sub,frac}, warnings:[], shear}
    update(v) {
      const s = v.state;
      els.spd.textContent = String(kt(s.speed));
      els.alt.textContent = String(ft(s.y));
      els.hdg.textContent = String(Math.round(((s.heading * 180 / Math.PI) % 360 + 360) % 360)).padStart(3, '0');
      els.vs.textContent = (s.vy >= 0 ? '+' : '') + Math.round(s.vy * 196.85);
      els.energy.textContent = String(Math.round(s.speed * 1.94384 + s.y * 3.28084 / 100));
      els.cap.style.width = (s.capacitor / v.craft.capacitor * 100).toFixed(0) + '%';
      els.capTxt.textContent = Math.round(s.capacitor) + ' / ' + v.craft.capacitor + ' MJ';
      els.cap.style.background = s.capacitor / v.craft.capacitor > 0.92 ? '#ff5d5d' : '#37e0ff';
      els.fuel.style.width = s.fuel.toFixed(0) + '%';
      els.hull.style.width = Math.max(0, 100 - s.damage).toFixed(0) + '%';
      els.hull.style.background = s.damage > 60 ? '#ff5d5d' : s.damage > 30 ? '#ffd34d' : '#59d98c';
      els.thr.style.width = (s.throttle * 100).toFixed(0) + '%';
      els.shear.textContent = v.shear > 0.62 ? 'SHEAR SEVERE' : v.shear > 0.34 ? 'SHEAR' : '';
      els.shear.style.color = v.shear > 0.62 ? '#ff5d5d' : '#ffd34d';
      if (v.objective) {
        els.obj.textContent = v.objective.title;
        els.objSub.textContent = v.objective.sub ?? '';
        els.objBar.style.width = ((v.objective.frac ?? 0) * 100).toFixed(0) + '%';
      }
      if (v.target) {
        els.tgt.textContent = '◎ ' + v.target.label + '  ' + (v.target.dist >= 1000
          ? (v.target.dist / 1000).toFixed(1) + ' km' : Math.round(v.target.dist) + ' m') + '  ' + v.target.bearingDeg + '°';
      } else els.tgt.textContent = '';
      els.warn.textContent = v.warnings.join('  ·  ');
    },
  };
}

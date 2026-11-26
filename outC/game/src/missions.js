// Sortie state machines for the eight contract types (design: the VENTUS
// bible). One createSortie/updateSortie pair drives them all; each type is a
// small goal engine over shared ideas — hold a point, fill a meter, paint a
// ring, run a sequence — and every type ends the same way: the objective
// completes, the target swings home, and the cradle settles the pay.
// Pure logic (the renderer draws the props from sortie.props).

import { mulberry32 } from './random.js';
import { padById, heightAt } from './data/zones.js';

const dist2 = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

export function createSortie(contract, seed) {
  const rng = mulberry32(seed);
  const s = {
    contract, rng, phase: 'work', t: 0, failed: null,
    harvested: 0, nodesDone: 0, boxesGot: 0, laps: 0, pointsGot: 0,
    paint: 0, echoesDone: 0, dronesDown: 0, breaches: 0, spearsDone: 0, keptSec: 0,
    bossPhase: 1, holdT: 0, paintTarget: 'main', nextGate: 'A', msg: '',
  };
  const site = contract.site;
  const ring = (n, r, y) => Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2 + rng() * 0.7;
    const x = site.x + Math.sin(a) * r, z = site.z + Math.cos(a) * r;
    return { x, z, y: y(x, z), done: false };
  });
  if (contract.type === 'deploy') s.nodes = ring(contract.nodes, 120, (x, z) => heightAt(x, z) + 55);
  if (contract.type === 'salvage') {
    s.boxes = ring(contract.boxes + (contract.core ? 1 : 0), 90, (x, z) => Math.max(heightAt(x, z), 0) + 4);
    s.boxes.forEach((b, i) => { b.core = contract.core && i === s.boxes.length - 1; });
  }
  if (contract.type === 'sensor') {
    const gy = (x, z) => heightAt(x, z) + 120;
    s.gates = {
      A: { x: site.x - 350, z: site.z, y: gy(site.x - 350, site.z), label: 'Gate Alpha' },
      B: { x: site.x + 350, z: site.z, y: gy(site.x + 350, site.z), label: 'Gate Bravo' },
    };
  }
  if (contract.type === 'survey') {
    s.points = [[-260, -260], [260, -260], [260, 260], [-260, 260]].map(([dx, dz]) => {
      const x = site.x + dx, z = site.z + dz;
      return { x, z, done: false };
    });
  }
  if (contract.type === 'contain') {
    s.anomaly = { x: site.x, z: site.z, baseX: site.x, baseZ: site.z };
    s.echoes = [];
  }
  if (contract.type === 'boss') {
    s.anchors = [0, 1, 2, 3].map(i => {
      const a = (i / 4) * Math.PI * 2 + 0.4;
      const x = site.x + Math.sin(a) * 130, z = site.z + Math.cos(a) * 130;
      return { x, z, y: heightAt(x, z) + 300, done: false };
    });
  }
  s.props = propsOf(s);
  return s;
}

function propsOf(s) {
  const c = s.contract;
  if (c.type === 'deploy') return { kind: 'nodes', items: s.nodes };
  if (c.type === 'salvage') return { kind: 'boxes', items: s.boxes };
  if (c.type === 'sensor') return { kind: 'gates', items: [s.gates.A, s.gates.B] };
  if (c.type === 'survey') return { kind: 'points', items: s.points };
  if (c.type === 'contain') return { kind: 'anomaly', items: [] };
  if (c.type === 'boss') return { kind: 'anchors', items: s.anchors };
  return { kind: 'site', items: [{ x: c.site.x, z: c.site.z, y: heightAt(c.site.x, c.site.z) + 160, done: false }] };
}

export function targetFor(s, plane) {
  if (s.phase === 'return') {
    const p = padById(s.contract.to);
    return { x: p.x, z: p.z, y: heightAt(p.x, p.z), label: p.name + ' — land on the cradle' };
  }
  if (s.phase !== 'work') return null;
  const c = s.contract, site = c.site;
  switch (c.type) {
    case 'deploy': { const n = s.nodes.find(n => !n.done); return n && { x: n.x, z: n.z, y: n.y, label: 'Array node — hold low & slow' }; }
    case 'salvage': { const b = s.boxes.find(b => !b.done); return b && { x: b.x, z: b.z, y: b.y + 30, label: b.core ? 'The Stormheart core — hover to hook' : 'Black box — hover to hook' }; }
    case 'sensor': { const g = s.gates[s.nextGate]; return { x: g.x, z: g.z, y: g.y, label: g.label }; }
    case 'survey': { const p = s.points.find(p => !p.done); return p && { x: p.x, z: p.z, y: heightAt(p.x, p.z) + 230, label: 'Survey point — fly the band' }; }
    case 'contain': {
      const e = s.echoes.find(e => !e.done);
      if (e) return { x: e.x, z: e.z, y: heightAt(e.x, e.z) + 170, label: 'Echo — paint it shut' };
      return { x: s.anomaly.x, z: s.anomaly.z, y: heightAt(s.anomaly.x, s.anomaly.z) + 170, label: 'Anomaly — stay in the ring' };
    }
    case 'harvest': return { x: site.x, z: site.z, y: heightAt(site.x, site.z) + 260, label: site.label + ' — ride the cell' };
    case 'defense': return { x: site.x, z: site.z, y: heightAt(site.x, site.z) + 60, label: 'Oakhaven — intercept the swarm' };
    case 'boss': {
      if (s.bossPhase === 1) return { x: site.x, z: site.z, y: heightAt(site.x, site.z) + 320, label: 'Penetrate to the Eye\'s heart' };
      const a = s.anchors.find(a => !a.done);
      if (a) return { x: a.x, z: a.z, y: a.y, label: 'Spear anchor — plant it' };
      return { x: site.x, z: site.z, y: heightAt(site.x, site.z) + 320, label: 'Hold the Eye\'s heart' };
    }
  }
  return null;
}

export function objectiveFor(s, plane) {
  const c = s.contract;
  if (s.phase === 'return') return { title: c.name, sub: 'Objective complete — land at ' + padById(c.to).name, frac: 1 };
  if (s.phase !== 'work') return { title: c.name, sub: '', frac: 0 };
  switch (c.type) {
    case 'deploy': return { title: c.name, sub: `Arrays deployed ${s.nodesDone}/${c.nodes}` + (s.holdT > 0.2 ? ` — holding ${s.holdT.toFixed(0)}s` : ''), frac: s.nodesDone / c.nodes };
    case 'harvest': return c.deliver
      ? { title: c.name, sub: `Charge aboard ${Math.round(plane.capacitor)}/${c.quotaMJ} MJ — bring it home full`, frac: plane.capacitor / c.quotaMJ }
      : { title: c.name, sub: `Harvested ${Math.round(s.harvested)}/${c.quotaMJ} MJ`, frac: s.harvested / c.quotaMJ };
    case 'contain': return { title: c.name, sub: `Painted ${(s.paint / c.paintSec * 100).toFixed(0)}%` + (c.echoes ? ` · echoes ${s.echoesDone}/${c.echoes}` : ''), frac: s.paint / c.paintSec };
    case 'salvage': return { title: c.name, sub: `Recovered ${s.boxesGot}/${s.boxes.length}`, frac: s.boxesGot / s.boxes.length };
    case 'sensor': return { title: c.name, sub: `Figure-eight laps ${s.laps}/${c.laps} — next ${s.nextGate === 'A' ? 'Alpha' : 'Bravo'}`, frac: s.laps / c.laps };
    case 'survey': return { title: c.name, sub: `Grid points ${s.pointsGot}/${c.points} — band ${c.altBand[0]}–${c.altBand[1]} m AGL`, frac: s.pointsGot / c.points };
    case 'defense': return { title: c.name, sub: `Shards down ${s.dronesDown}/${c.drones} · breaches ${s.breaches}/3`, frac: s.dronesDown / c.drones };
    case 'boss': return { title: c.name, sub: s.bossPhase === 1 ? 'Phase 1 — reach the Eye\'s heart' : `Phase 2 — spears ${s.spearsDone}/${c.spears} · held ${Math.floor(s.keptSec)}/${c.keepSec}s`, frac: s.bossPhase === 1 ? 0.1 : (s.spearsDone + s.keptSec / c.keepSec) / (c.spears + 1) };
  }
  return { title: c.name, sub: '', frac: 0 };
}

function done(s, ev) {
  s.phase = 'return';
  ev.push({ type: 'objective-done' });
}

// ctx: {deployRate, paintRate, dronesDown, breaches}
export function updateSortie(s, plane, dt, ctx = {}) {
  const ev = [];
  if (s.phase !== 'work') return ev;
  s.t += dt;
  const c = s.contract, site = c.site;
  const finish = () => done(s, ev);

  if (c.type === 'deploy') {
    const n = s.nodes.find(n => !n.done);
    if (n) {
      const near = dist2(plane, n) < 110 && Math.abs(plane.y - n.y) < 88 && plane.speed < (ctx.holdSpeed ?? 34) && plane.airborne;
      s.holdT = near ? s.holdT + dt * (ctx.deployRate ?? 1) : Math.max(0, s.holdT - dt * 2);
      if (s.holdT >= c.holdSec) {
        n.done = true; s.nodesDone++; s.holdT = 0;
        ev.push({ type: 'node', at: n });
        if (s.nodesDone >= c.nodes) finish();
      }
    }
  } else if (c.type === 'harvest') {
    if (!c.deliver && s.harvested >= c.quotaMJ) finish();
    if (c.deliver && plane.capacitor >= c.quotaMJ) { ev.push({ type: 'tank-full' }); finish(); }
  } else if (c.type === 'contain') {
    const a = s.anomaly;
    a.x = a.baseX + Math.sin(s.t * 0.11) * 130;
    a.z = a.baseZ + Math.cos(s.t * 0.09) * 110;
    if (c.echoes && s.echoes.length === 0 && s.paint > c.paintSec * 0.5) {
      for (let i = 0; i < c.echoes; i++) {
        const ang = (i / c.echoes) * Math.PI * 2 + 0.8;
        s.echoes.push({ x: a.baseX + Math.sin(ang) * 300, z: a.baseZ + Math.cos(ang) * 300, paint: 0, done: false });
      }
      ev.push({ type: 'echoes-split' });
    }
    const paintOne = (tx, tz, need, obj) => {
      const d = Math.hypot(plane.x - tx, plane.z - tz);
      if (d < 150 && plane.airborne) {
        obj.paint += dt * (ctx.paintRate ?? 1);
        if (obj.paint >= need && !obj.done) { obj.done = true; return true; }
      }
      return false;
    };
    const echo = s.echoes.find(e => !e.done);
    if (echo) { if (paintOne(echo.x, echo.z, 9, echo)) { s.echoesDone++; ev.push({ type: 'echo', at: echo }); } }
    else if (paintOne(a.x, a.z, c.paintSec, s)) { /* main painted below */ }
    if (s.paint >= c.paintSec && s.echoesDone >= (c.echoes ?? 0)) finish();
  } else if (c.type === 'salvage') {
    const b = s.boxes.find(b => !b.done);
    if (b) {
      const near = dist2(plane, b) < 95 && plane.y - b.y < 88 && plane.speed < (ctx.holdSpeed ?? 26) && plane.airborne;
      s.holdT = near ? s.holdT + dt : 0;
      if (s.holdT >= 3) {
        b.done = true; s.boxesGot++; s.holdT = 0;
        ev.push({ type: 'box', at: b });
        if (s.boxesGot >= s.boxes.length) finish();
      }
    }
  } else if (c.type === 'sensor') {
    const g = s.gates[s.nextGate];
    if (dist2(plane, g) < 120 && Math.abs(plane.y - g.y) < 75 && plane.airborne) {
      const was = s.nextGate;
      s.nextGate = was === 'A' ? 'B' : 'A';
      if (was === 'B') { s.laps++; ev.push({ type: 'lap', n: s.laps }); }
      else ev.push({ type: 'gate', gate: was });
      if (s.laps >= c.laps) finish();
    }
  } else if (c.type === 'survey') {
    const p = s.points.find(p => !p.done);
    if (p) {
      const agl = plane.y - heightAt(plane.x, plane.z);
      if (dist2(plane, p) < 170 && agl >= c.altBand[0] && agl <= c.altBand[1] && plane.airborne) {
        p.done = true; s.pointsGot++;
        ev.push({ type: 'point', at: p });
        if (s.pointsGot >= c.points) finish();
      }
    }
  } else if (c.type === 'defense') {
    s.dronesDown = ctx.dronesDown ?? s.dronesDown;
    s.breaches = ctx.breaches ?? s.breaches;
    if (s.breaches >= 3) { s.failed = 'Three shards touched Oakhaven roofs.'; ev.push({ type: 'failed' }); }
    else if (s.t > c.timedSec && s.dronesDown < c.drones) { s.failed = 'The swarm window closed with shards still flying.'; ev.push({ type: 'failed' }); }
    else if (s.dronesDown >= c.drones) finish();
  } else if (c.type === 'boss') {
    const dCentre = Math.hypot(plane.x - site.x, plane.z - site.z);
    if (s.bossPhase === 1) {
      if (dCentre < 210 && plane.airborne) { s.bossPhase = 2; ev.push({ type: 'phase', n: 2 }); }
    } else {
      if (dCentre < 250) s.keptSec += dt;
      const a = s.anchors.find(a => !a.done);
      if (a) {
        const near = Math.hypot(plane.x - a.x, plane.z - a.z) < 120 && Math.abs(plane.y - a.y) < 88 && plane.speed < (ctx.holdSpeed ?? 36);
        s.holdT = near ? s.holdT + dt : Math.max(0, s.holdT - dt * 2);
        if (s.holdT >= 3) { a.done = true; s.spearsDone++; s.holdT = 0; ev.push({ type: 'spear', at: a }); }
      }
      if (s.spearsDone >= c.spears && s.keptSec >= c.keepSec) { ev.push({ type: 'phase', n: 3 }); finish(); }
    }
  }
  return ev;
}

export function failSortie(s, reason) {
  if (s.phase !== 'failed') { s.phase = 'failed'; s.failed = reason; }
}

// Called by main when the plane settles on the destination cradle.
export function settleSortie(s, plane, grade) {
  const c = s.contract;
  if (c.type === 'harvest' && c.deliver && plane.capacitor < c.quotaMJ) {
    return { ok: false, lines: [`Came home light: ${Math.round(plane.capacitor)} of ${c.quotaMJ} MJ aboard.`], total: 0, rep: 0 };
  }
  const lines = [{ label: c.name + ' — contract pay', amount: c.pay }];
  let total = c.pay;
  if (grade === 'feather') {
    const bonus = Math.round(c.pay * 0.05);
    lines.push({ label: 'Feather catch bonus', amount: bonus });
    total += bonus;
  }
  if (c.type === 'harvest' && !c.deliver) lines.push({ label: `Charge bottled: ${Math.round(s.harvested)} MJ`, amount: 0 });
  if (c.type === 'boss') lines.push({ label: 'The Eye remembers your name', amount: 0 });
  return { ok: true, lines, total, rep: c.rep };
}

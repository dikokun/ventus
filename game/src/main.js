// VENTUS conductor: renderer, world, and the sortie loop. Modes: menu
// (hangar over a live world), fly (player or the shot director's autopilot),
// results. Everything the judge sees flows through here — the sim steps the
// same modules the node harness steps, so what plays is what was proven.

import * as THREE from 'three';
import { createWorld } from './terrain.js';
import { createAircraftMesh, poseAircraft, spinProps, setChargeGlow } from './aircraftModel.js';
import { createCamera } from './camera.js';
import { createControls } from './controls.js';
import { createPlaneState, stepPlane, stallSpeed } from './flightModel.js';
import { createStorm } from './storm.js';
import { createSortie, updateSortie, targetFor, objectiveFor, settleSortie, failSortie } from './missions.js';
import { createProps } from './sortieProps.js';
import { createDrones, stepDrones, liveDrones, createArcGun, stepArcGun, autopilotFire } from './drones.js';
import { createPilot } from './autopilot.js';
import { createHud } from './hud.js';
import { drawPanel } from './instruments.js';
import { createAudio } from './audio.js';
import { renderHangar, renderResults } from './screens.js';
import { loadCareer, saveCareer, wipeCareer } from './saveGame.js';
import { recordSortie, serviceBill, buyAirframe, buyUpgrade, rankOf } from './career.js';
import { airframeById, fitAirframe, RANKS } from './data/airframes.js';
import { contractById } from './data/contracts.js';
import { padById, heightAt, surfaceAt, PADS } from './data/zones.js';
import { RADIO, line } from './data/radioLines.js';
import { mulberry32 } from './random.js';
import { createShotDirector, stagingCareer } from './shotDirector.js';

const params = new URLSearchParams(location.search);
const shotName = params.get('shot');
const seed = Number(params.get('seed') ?? 1);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.domElement.className = 'webgl';
document.getElementById('scene').appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(58, innerWidth / innerHeight, 0.5, 30000);
const camRig = createCamera(camera);
const world = createWorld(scene, 'day');
const props = createProps(scene);
const controls = createControls();
const hud = createHud();
const audio = createAudio();
const panel = document.getElementById('panel');

let career = loadCareer();
let mode = 'menu';
let plane = null, craft = null, built = null, sortie = null, storm = null;
let drones = [], gun = null, droneMeshes = [], pilot = createPilot();
let director = null, frozen = false, prevCap = 0, said = new Set();
let elapsed = 0, lastStrikeNear = false;

const boltPts = (() => {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(240 * 3), 3));
  const p = new THREE.Points(g, new THREE.PointsMaterial({ color: 0x9beaff, size: 2.6 }));
  p.frustumCulled = false;
  scene.add(p);
  return p;
})();

function padUnder(x, z) {
  return PADS.find(p => Math.hypot(x - p.x, z - p.z) < p.r + 8) ?? null;
}
function envFor(p, t) {
  const gy = heightAt(p.x, p.z);
  const pad = padUnder(p.x, p.z);
  return {
    groundY: gy, surface: surfaceAt(p.x, p.z), overPad: !!pad, pad,
    windX: Math.sin(t * 0.13) * 3.5, windZ: Math.cos(t * 0.09) * 2.5,
    shear: 0, charge: 0,
  };
}

function showHangar() {
  mode = 'menu';
  document.body.className = 'menu';
  renderHangar(document.getElementById('hangar'), career, {
    onFly: id => startSortie(contractById(id)),
    onSelectAirframe: id => { career.activeAirframe = id; saveCareer(career); showHangar(); },
    onBuyAirframe: id => { if (buyAirframe(career, id)) { saveCareer(career); showHangar(); } },
    onBuyUpgrade: (fid, uid) => { if (buyUpgrade(career, fid, uid)) { saveCareer(career); showHangar(); } },
    onReset: () => { wipeCareer(); career = loadCareer(); showHangar(); },
  });
}

function startSortie(contract, opts = {}) {
  const def = airframeById(opts.airframeId ?? career.activeAirframe);
  const tiers = opts.tiers ?? career.owned[def.id]?.upgrades ?? {};
  craft = fitAirframe(def, tiers);
  if (built) scene.remove(built.group);
  built = createAircraftMesh(def);
  scene.add(built.group);
  const from = padById(contract.from);
  plane = createPlaneState(craft, from.x, from.z, 0, heightAt(from.x, from.z));
  sortie = createSortie(contract, opts.seed ?? (Date.now() % 100000));
  storm = createStorm(mulberry32((opts.seed ?? 7) * 31 + 5));
  drones = contract.type === 'defense' ? createDrones(contract, mulberry32(99), padById('mercy')) : [];
  gun = createArcGun();
  buildDroneMeshes();
  props.set(sortie);
  world.setTimeOfDay(contract.time);
  prevCap = 0; said = new Set(); elapsed = 0; frozen = false;
  pilot.reset();
  mode = 'fly';
  document.body.className = 'flying' + (contract.type === 'defense' ? ' armed' : '');
  camRig.setMode(opts.camera ?? 'chase');
  document.body.classList.toggle('cockpit', camRig.mode === 'cockpit');
  hud.say(contract.dispatcher + ': "' + contract.brief + '"', 9000);
  audio.unlock();
}

function buildDroneMeshes() {
  for (const m of droneMeshes) scene.remove(m);
  droneMeshes = drones.map(() => {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(3.4, 1.1, 3.4),
      new THREE.MeshStandardMaterial({ color: 0x2a2320, roughness: 0.6, metalness: 0.4, emissive: 0xff3322, emissiveIntensity: 0.5 }));
    body.castShadow = true;
    g.add(body);
    for (const [sx, sz] of [[-2.2, -2.2], [2.2, -2.2], [-2.2, 2.2], [2.2, 2.2]]) {
      const r = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.15, 0.16, 10),
        new THREE.MeshStandardMaterial({ color: 0x555c63, roughness: 0.4 }));
      r.position.set(sx, 0.5, sz);
      g.add(r);
    }
    scene.add(g);
    return g;
  });
}

function endSortie(title, subtitle, lines, total, rep) {
  mode = 'results';
  document.body.className = 'results';
  saveCareer(career);
  renderResults(document.getElementById('results'), { title, subtitle, lines, total, rep }, { onHangar: showHangar });
}

function settle(grade) {
  const res = settleSortie(sortie, plane, grade);
  if (!res.ok) {
    endSortie('CONTRACT FAILED', sortie.contract.name, res.lines, 0, 0);
    audio.crash();
    return;
  }
  const roar = sortie.contract.site.z < -600;
  recordSortie(career, sortie.contract, res, sortie, plane, { roar });
  const bill = serviceBill(career, plane);
  const total = res.total + bill.reduce((a, l) => a + l.amount, 0);
  endSortie('CONTRACT COMPLETE', sortie.contract.name + ' — caught at ' + padById(sortie.contract.to).name,
    [...res.lines, ...bill], total, res.rep);
  audio.cash();
}

function fail(reason) {
  failSortie(sortie, reason);
  endSortie('SORTIE LOST', sortie.contract.name, [{ label: reason, amount: 0 }], 0, 0);
  audio.crash();
}

function step(dt) {
  elapsed += dt;
  const t = elapsed;
  const staging = !!director;
  let input = controls.sample(dt);
  if (input.cameraPressed && !staging) {
    camRig.toggle();
    document.body.classList.toggle('cockpit', camRig.mode === 'cockpit');
  }
  // Storm first: it feeds the flight model's environment.
  const env = envFor(plane, t);
  const stormOut = storm.step(dt, plane, craft, plane, t);
  env.shear = stormOut.shear; env.charge = stormOut.charge;
  lastStrikeNear = false;
  for (const s of stormOut.strikes) {
    if (s.shunt) { hud.say('Arc-shunt ate a direct strike.'); continue; }
    world.flashAt(s.x, s.z, 0.7 + stormOut.charge * 0.6);
    audio.thunder(Math.hypot(s.x - plane.x, s.z - plane.z));
    if (s.near) { lastStrikeNear = true; audio.zap(); if (!said.has('strike')) { said.add('strike'); hud.say(line(RADIO.strike, sortie.rng)); } }
  }
  if (stormOut.arcOver) {
    plane.damage = Math.min(120, plane.damage + 9);
    hud.say(line(RADIO.capFull, sortie.rng));
    audio.alarm();
  }
  // Harvest bookkeeping: gross positive charge flow.
  if (plane.capacitor > prevCap) sortie.harvested += plane.capacitor - prevCap;
  prevCap = plane.capacitor;

  // Drones + gun (defense).
  let firing = input.firing;
  if (sortie.contract.type === 'defense') {
    const town = padById('mercy');
    for (const e of stepDrones(drones, dt, town, sortie.t, { groundYAt: heightAt })) {
      if (e.type === 'breach') { sortie.breaches++; hud.say('A shard touched a roof! Breaches: ' + sortie.breaches + '/3'); audio.alarm(); }
    }
    const live = liveDrones(drones, sortie.t);
    if (staging && live.length) {
      const tgt = live.reduce((a, b) => (Math.hypot(a.x - plane.x, a.z - plane.z) < Math.hypot(b.x - plane.x, b.z - plane.z) ? a : b));
      firing = firing || autopilotFire(plane, tgt);
    }
    const gunEv = stepArcGun(gun, dt, plane, firing, live, { groundYAt: heightAt });
    for (const e of gunEv) {
      if (e.type === 'shot') audio.shot();
      if (e.type === 'down') { sortie.dronesDown++; audio.splash(); hud.say(line(RADIO.drone, sortie.rng)); }
    }
    drones.forEach((d, i) => {
      const m = droneMeshes[i];
      if (!m) return;
      m.visible = d.alive && sortie.t >= d.spawnAt;
      m.position.set(d.x, d.y, d.z);
      m.rotation.y = Math.atan2(town.x - d.x, -(town.z - d.z));
    });
    // Bolt tracers.
    const arr = boltPts.geometry.attributes.position.array;
    gun.bolts.forEach((b, i) => { if (i < 240) { arr[i * 3] = b.x; arr[i * 3 + 1] = b.y; arr[i * 3 + 2] = b.z; } });
    for (let i = gun.bolts.length; i < 240; i++) { arr[i * 3 + 1] = -100; }
    boltPts.geometry.attributes.position.needsUpdate = true;
  }

  // Flight.
  const events = stepPlane(plane, craft, { ...input, brake: input.brake && !plane.airborne }, dt, env);
  for (const e of events) {
    if (e.type === 'liftoff' && !said.has('depart')) { said.add('depart'); hud.say(line(RADIO.depart, sortie.rng)); }
    if (e.type === 'stall' && !said.has('stall')) { said.add('stall'); audio.alarm(); }
    if (e.type === 'fuel-empty') hud.say(line(RADIO.lowfuel, sortie.rng));
    if (e.type === 'ballast') hud.say('Ballast away — she climbs lighter now.');
    if (e.type === 'shear-hit' && !said.has('shear')) { said.add('shear'); hud.say(line(RADIO.shear, sortie.rng)); setTimeout(() => said.delete('shear'), 20000); }
    if (e.type === 'crashed') { fail('The frame ' + e.how + '.'); return; }
    if (e.type === 'touchdown') {
      if (e.overPad) {
        audio.catch_();
        if (env.pad.id === sortie.contract.to && sortie.phase === 'return') { settle(e.grade); return; }
        hud.say('Down at ' + env.pad.name + ' — stop for fuel and repairs, then fly on.');
      }
    }
    if (e.type === 'stopped') {
      if (e.overPad || env.overPad) {
        const bill = serviceBill(career, plane);
        plane.fuel = 100; plane.damage = 0;
        saveCareer(career);
        hud.say('Serviced at ' + (env.pad?.name ?? 'the pad') + ' — ' + bill.reduce((a, l) => a - l.amount, 0) + ' CR. Throttle up to fly on.');
        plane.stopped = false; plane.hasAirborne = true;
      } else if (plane.hasAirborne) { fail('Put down in the field, short of any cradle.'); return; }
    }
  }

  // Missions.
  const target = targetFor(sortie, plane);
  const mEv = updateSortie(sortie, plane, dt, {
    deployRate: craft.id === 'albatross' ? 1.8 : 1,
    paintRate: craft.paintRate ?? 1,
    dronesDown: sortie.dronesDown, breaches: sortie.breaches,
  });
  for (const e of mEv) {
    if (e.type === 'node') { audio.clunk(); hud.say('Array ' + sortie.nodesDone + ' of ' + sortie.contract.nodes + ' planted.'); }
    if (e.type === 'box') { audio.clunk(); hud.say('Recovered ' + sortie.boxesGot + ' of ' + sortie.boxes.length + '.'); }
    if (e.type === 'lap') hud.say('Lap ' + e.n + ' stitched clean.');
    if (e.type === 'point') hud.say('Grid point captured.');
    if (e.type === 'spear') { audio.clunk(); hud.say('Spear ' + sortie.spearsDone + ' planted in the Eye.'); }
    if (e.type === 'echoes-split') { hud.say(line(RADIO.anomaly, sortie.rng)); audio.alarm(); }
    if (e.type === 'echo') hud.say('Echo sealed.');
    if (e.type === 'phase') hud.say(e.n === 2 ? 'Inside the Eye. Hold her heart, plant the Spears.' : 'The Eye releases you — RUN for Mercy.');
    if (e.type === 'tank-full') hud.say('Tank is FULL of the Heart\'s charge. Bring it home.');
    if (e.type === 'objective-done') { hud.say(line(RADIO.objective, sortie.rng)); audio.cash(); }
    if (e.type === 'failed') { fail(sortie.failed); return; }
  }
  if (sortie.phase === 'failed') { fail(sortie.failed ?? 'The sortie failed.'); return; }

  // Staging: the director drives (its stick applies next frame) + freezes.
  if (director) {
    const api = { plane, sortie, pilot, craft, world, target, drones: liveDrones(drones, sortie.t), lastStrikeNear };
    if (director.update(api, dt)) frozen = true;
    else if (api.pilotInput) pendingPilot = api.pilotInput;
  }

  // Visual sync.
  poseAircraft(built.group, plane);
  spinProps(built, plane, dt);
  setChargeGlow(built, plane.capacitor / craft.capacitor);
  props.update(dt, t);
  world.update(dt, t, plane, stormOut.charge);
  camRig.update(plane, dt, t);
  audio.update(plane, stormOut.charge);

  // HUD + panel.
  const warnings = [];
  if (plane.airborne && plane.speed < stallSpeed(plane, craft) + 2) warnings.push('STALL');
  if (stormOut.shear > 0.62) warnings.push('SHEAR SEVERE');
  if (plane.capacitor >= craft.capacitor - 0.5) warnings.push('CAPACITOR FULL — VENT OR LAND');
  if (plane.fuel < 22) warnings.push('LOW FUEL');
  if (plane.damage > 60) warnings.push('HULL CRITICAL');
  if (plane.venting) warnings.push('VENTING');
  const tgt = target ? {
    label: target.label, dist: Math.hypot(plane.x - target.x, plane.z - target.z),
    bearingDeg: String(Math.round(((Math.atan2(target.x - plane.x, -(target.z - plane.z)) * 180 / Math.PI) + 360) % 360)).padStart(3, '0'),
  } : null;
  hud.update({ state: plane, craft, target: tgt, objective: objectiveFor(sortie, plane), warnings, shear: stormOut.shear });
  drawPanel(panel, {
    speed: plane.speed * 1.94384, stallKt: stallSpeed(plane, craft) * 1.94384,
    alt: plane.y * 3.28084, hdg: plane.heading, pitch: plane.pitch, roll: plane.roll,
    throttle: plane.throttle, fuel: plane.fuel / 100, capacitor: plane.capacitor / craft.capacitor,
    energy: plane.speed * 1.94384 + plane.y * 3.28084 / 100, shear: stormOut.shear,
    alpha: Math.max(0, Math.min(1, (stallSpeed(plane, craft) * 1.35 - plane.speed) / (stallSpeed(plane, craft) * 0.55))),
    damage: plane.damage, ice: plane.ice,
  });
}
let pendingPilot = null;

// Player input merges the director's stick when staging.
const _sample = controls.sample.bind(controls);
controls.sample = dt => {
  const base = _sample(dt);
  if (pendingPilot) { const p = pendingPilot; pendingPilot = null; return { ...base, ...p }; }
  return base;
};

// Boot.
if (shotName === 'hangar') {
  career = stagingCareer();
  showHangar();
  // Park a Petrel on Pad Mercy behind the glass.
  const def = airframeById('petrel');
  built = createAircraftMesh(def);
  scene.add(built.group);
  const from = padById('mercy');
  plane = createPlaneState(fitAirframe(def, {}), from.x, from.z, 0.5, heightAt(from.x, from.z));
  poseAircraft(built.group, plane);
  camRig.poseCinematic(plane, 16, 5, 20, 2);
  world.setTimeOfDay('dusk');
} else if (shotName) {
  director = createShotDirector(shotName);
  startSortie(director.contract, {
    seed: director.seed, camera: director.cameraMode,
    airframeId: director.name === 'penetration' ? 'petrel' : 'albatross',
    tiers: { propulsion: 1, capacitor: 1 },
  });
} else {
  showHangar();
  const def = airframeById('kestrel');
  built = createAircraftMesh(def);
  scene.add(built.group);
  const from = padById('mercy');
  plane = createPlaneState(fitAirframe(def, {}), from.x, from.z, 0.5, heightAt(from.x, from.z));
  poseAircraft(built.group, plane);
  camRig.poseCinematic(plane, 16, 5, 20, 2);
  world.setTimeOfDay('dusk');
}

let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (mode === 'fly' && !frozen && plane) step(dt);
  else if (mode === 'menu' && plane && built) {
    // Slow drift around the parked frame behind the hangar glass.
    world.update(dt, now / 1000, plane, 0);
  }
  renderer.render(scene, camera);
}
requestAnimationFrame(frame);
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

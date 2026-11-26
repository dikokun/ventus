// The autopilot: a steering controller the shot director (and the node sims)
// fly with. Given a goal — fly to a point, orbit a point, or land on a
// cradle — it produces stick inputs for the same flight model the player
// uses. No state of its own except a progress watchdog: if a goal stops
// closing for 14 s it climbs and re-approaches instead of orbiting forever.

import { heightAt } from './data/zones.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function angNorm(a) { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; }

export function createPilot() {
  let lastDist = Infinity, stuckT = 0, mode = 'fly';
  return {
    reset() { lastDist = Infinity; stuckT = 0; },
    // goal: {x, y, z, speed, mode:'fly'|'orbit'|'land', radius}
    step(plane, craft, goal, dt) {
      const dx = goal.x - plane.x, dz = goal.z - plane.z;
      const dist = Math.hypot(dx, dz);
      // Watchdog.
      if (dist < lastDist - 2) { lastDist = dist; stuckT = 0; } else stuckT += dt;
      const reposition = stuckT > 14 && goal.mode !== 'land';
      if (reposition) stuckT = 0;

      let wantX = goal.x, wantZ = goal.z, wantY = goal.y;
      // Never ask the plane to fly slower than a safe margin over its stall.
      let wantSpeed = Math.max(goal.speed ?? 34, craft.stall + 6);
      // Long transits fly the high road: shear fades with altitude.
      if (goal.mode === 'fly' && dist > 900) wantY = Math.max(wantY, heightAt(plane.x, plane.z) + 360);
      // Final approach: never sink below 40 m over the ground under the keel.
      if (goal.mode === 'fly' && dist <= 900) wantY = Math.max(wantY, heightAt(plane.x, plane.z) + 40);
      if (goal.mode === 'orbit' && !reposition) {
        const r = goal.radius ?? 60;
        const bearing = Math.atan2(dx, -dz); // heading that points at centre
        const radialErr = dist - r;
        // Tangent heading, corrected by radial error.
        const tangent = bearing + Math.PI / 2 * (goal.dir ?? 1);
        const corr = clamp(radialErr * 0.01, -0.5, 0.5) * (goal.dir ?? 1);
        const wantHeading = tangent - corr * (goal.dir ?? 1);
        wantX = plane.x + Math.sin(wantHeading) * 300;
        wantZ = plane.z - Math.cos(wantHeading) * 300;
        wantY = goal.y;
      } else if (goal.mode === 'land') {
        // Glide to the cradle: aim at a threshold point, slope by distance.
        wantY = goal.y + Math.max(0, dist - 60) * 0.10;
        wantSpeed = dist > 700 ? 34 : dist > 220 ? 24 : 17;
        if (dist < 90) { wantY = goal.y; wantSpeed = 15; }
      } else if (reposition) {
        wantY = Math.max(goal.y, plane.y + 160);
        wantSpeed = 40;
      }

      const tdx = wantX - plane.x, tdz = wantZ - plane.z;
      const wantHeading = Math.atan2(tdx, -tdz);
      const err = angNorm(wantHeading - plane.heading);
      const rollCmd = clamp(err * 1.15, -0.85, 0.85);
      const altErr = wantY - plane.y;
      const pitchCmd = clamp(altErr * 0.006 - plane.vy * 0.012, -0.42, 0.5);
      // On the ground: roll out — pitch up once fast enough.
      let throttle = clamp(0.45 + (wantSpeed - plane.speed) * 0.03, 0, 1);
      let pitchIn = pitchCmd / 0.5;
      if (!plane.airborne) {
        throttle = plane.groundSpeed < (goal.speed ?? 30) ? 1 : 0.4;
        pitchIn = plane.groundSpeed > craft.stall * 1.12 ? 0.55 : 0;
        return { pitch: pitchIn, roll: 0, throttle, brake: false, vent: false, ballastPressed: false, firing: false };
      }
      // Energy: if slow and below goal altitude, don't climb into a stall.
      if (plane.speed < craft.stall + 4 && altErr > 0) pitchIn = Math.min(pitchIn, 0.05);
      const brake = goal.mode === 'land' && dist < 130 && plane.speed > 19;
      // Capacitor discipline: vent before the next strike can arc over —
      // unless the goal forbids it (a deliver contract's full tank is the pay).
      const vent = goal.ventOk !== false && plane.capacitor > craft.capacitor * 0.88;
      return {
        pitch: clamp(pitchIn, -1, 1),
        roll: clamp(rollCmd / 0.62, -1, 1),
        throttle, brake,
        vent, ballastPressed: false, firing: false,
      };
    },
  };
}

// Highest ground around a work circle + clearance: orbit altitudes must
// clear the whole circle, not just the centre — ridge nodes sit on slopes.
function clearY(x, z, r, lift) {
  let m = heightAt(x, z);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    m = Math.max(m, heightAt(x + Math.sin(a) * r, z + Math.cos(a) * r));
  }
  return m + lift;
}

// Goal selection from the sortie: the one place that knows every type's shape.
export function goalFor(sortie, plane, target, drones) {
  if (!target) return null;
  const c = sortie.contract;
  if (sortie.phase === 'return') return { ...target, mode: 'land', speed: 30 };
  const near = Math.hypot(plane.x - target.x, plane.z - target.z) < 500;
  switch (c.type) {
    case 'deploy': return near ? { ...target, y: Math.max(target.y, clearY(target.x, target.z, 85, 48)), mode: 'orbit', radius: 55, speed: 20 } : { ...target, mode: 'fly', speed: 34 };
    case 'salvage': return near ? { ...target, y: Math.max(target.y, clearY(target.x, target.z, 75, 42)), mode: 'orbit', radius: 42, speed: 17 } : { ...target, mode: 'fly', speed: 32 };
    case 'contain': return near ? { ...target, mode: 'orbit', radius: 85, speed: 24 } : { ...target, mode: 'fly', speed: 34 };
    case 'harvest': return { ...target, mode: 'orbit', radius: 210, speed: 31, ventOk: !c.deliver };
    case 'sensor': return { ...target, mode: 'fly', speed: 30 };
    case 'survey': return { ...target, mode: 'fly', speed: 30 };
    case 'defense': {
      const d = drones && drones.length ? drones.reduce((a, b) => (Math.hypot(a.x - plane.x, a.z - plane.z) < Math.hypot(b.x - plane.x, b.z - plane.z) ? a : b)) : null;
      return d ? { x: d.x, y: d.y, z: d.z, mode: 'fly', speed: 38, drone: d } : { ...target, mode: 'orbit', radius: 300, speed: 32 };
    }
    case 'boss': return sortie.bossPhase === 2 && !sortie.anchors.every(a => a.done) && near
      ? { ...target, y: Math.max(target.y, clearY(target.x, target.z, 80, 48)), mode: 'orbit', radius: 48, speed: 19 }
      : { ...target, mode: 'fly', speed: 34 };
  }
  return { ...target, mode: 'fly', speed: 30 };
}

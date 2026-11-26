// Shard drones (Calm Zone Defense) and the arc cannon that answers them.
// Drones ride the squall line low and fast toward the town; each carries 2 HP.
// The cannon fires tracer bolts from the collector spine — hits are checked
// against drone centres, the same pure pattern as the gun model, so the node
// sim can prove a defense contract end to end.

export const DRONE_HP = 2, DRONE_SPEED = 26;

export function createDrones(contract, rng, town) {
  const drones = [];
  for (let i = 0; i < contract.drones; i++) {
    const ang = -0.5 + (i / Math.max(1, contract.drones - 1)) * 1.0; // from the north
    const dist = 1500 + i * 260;
    drones.push({
      x: town.x + Math.sin(ang) * dist, z: town.z - Math.cos(ang) * dist,
      y: 0, hp: DRONE_HP, alive: true, phase: rng() * 6.28, spawnAt: i * 14,
    });
  }
  return drones;
}

// env: {groundYAt(x,z), t}
export function stepDrones(drones, dt, town, t, env) {
  const ev = [];
  for (const d of drones) {
    if (!d.alive || t < d.spawnAt) continue;
    const dx = town.x - d.x, dz = town.z - d.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 110) { d.alive = false; ev.push({ type: 'breach', drone: d }); continue; }
    const wob = Math.sin(t * 1.7 + d.phase) * 0.35;
    const hx = dx / dist, hz = dz / dist;
    d.x += (hx + -hz * wob * 0.4) * DRONE_SPEED * dt;
    d.z += (hz + hx * wob * 0.4) * DRONE_SPEED * dt;
    const gy = env.groundYAt(d.x, d.z);
    d.y += ((gy + 42) - d.y) * Math.min(1, dt * 2);
    if (d.y === 0) d.y = gy + 42;
  }
  return ev;
}
export function liveDrones(drones, t) { return drones.filter(d => d.alive && t >= d.spawnAt); }

// Arc cannon: bolt pool, hits vs drone centres.
export function createArcGun() {
  return { bolts: [], cooldown: 0 };
}
export function stepArcGun(gun, dt, plane, firing, drones, env) {
  const ev = [];
  gun.cooldown -= dt;
  const fx = Math.sin(plane.heading), fz = -Math.cos(plane.heading);
  if (firing && gun.cooldown <= 0 && plane.airborne) {
    gun.cooldown = 0.12;
    gun.bolts.push({
      x: plane.x, y: plane.y + 1.6, z: plane.z,
      vx: fx * 260 + fx * plane.speed, vy: Math.sin(plane.pitch) * 260 + plane.vy, vz: fz * 260 + fz * plane.speed,
      life: 1.1,
    });
    ev.push({ type: 'shot' });
  }
  for (const b of gun.bolts) {
    b.life -= dt;
    b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt;
    b.vy -= 2.2 * dt;
    if (b.life <= 0) continue;
    if (b.y < env.groundYAt(b.x, b.z)) { b.life = 0; continue; }
    for (const d of drones) {
      if (!d.alive) continue;
      if (Math.hypot(b.x - d.x, b.y - d.y, b.z - d.z) < 15) {
        b.life = 0;
        d.hp -= 1;
        ev.push({ type: 'hit', drone: d });
        if (d.hp <= 0) { d.alive = false; ev.push({ type: 'down', drone: d }); }
        break;
      }
    }
  }
  gun.bolts = gun.bolts.filter(b => b.life > 0);
  return ev;
}
export function autopilotFire(plane, target) {
  if (!target) return false;
  const dx = target.x - plane.x, dz = target.z - plane.z;
  const dist = Math.hypot(dx, dz);
  if (dist < 20 || dist > 320) return false;
  const fx = Math.sin(plane.heading), fz = -Math.cos(plane.heading);
  const dot = (dx * fx + dz * fz) / dist;
  return dot > 0.985 && Math.abs(target.y - plane.y) < 60;
}

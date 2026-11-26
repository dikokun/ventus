// The Stratum: one seeded slice of the Calm / Transition / Roar boundary.
// South (z > 800) is the Calm Zone — green mesas, towns, catch-cradle pads.
// The middle band is the Transition — ridges, passes, the Shear Wall.
// North (z < -600) is the Roar — storm cells, the Devil's Spine, the Eye.
// The east (x > 4300) is open sea. All heights come from heightAt(), an
// analytic field the flight model and the terrain mesh share, so the ground
// the pilot sees is the ground the physics feels.

// Deterministic hash noise (value noise, two octaves) — no Math.random here.
function hash2(ix, iz) {
  let n = ix * 374761393 + iz * 668265263;
  n = (n ^ (n >> 13)) * 1274126177;
  return ((n ^ (n >> 16)) >>> 0) / 4294967295;
}
function vnoise(x, z, scale) {
  const gx = x / scale, gz = z / scale;
  const ix = Math.floor(gx), iz = Math.floor(gz);
  const fx = gx - ix, fz = gz - iz;
  const sx = fx * fx * (3 - 2 * fx), sz = fz * fz * (3 - 2 * fz);
  const a = hash2(ix, iz), b = hash2(ix + 1, iz), c = hash2(ix, iz + 1), d = hash2(ix + 1, iz + 1);
  return (a + (b - a) * sx + (c - a) * sz + (a - b - c + d) * sx * sz) * 2 - 1;
}
function gauss(x, z, cx, cz, r, h) {
  const dx = x - cx, dz = z - cz;
  const d2 = (dx * dx + dz * dz) / (r * r);
  return d2 > 9 ? 0 : h * Math.exp(-d2 * 1.6);
}
// Ridge along a segment: height falls off with distance to the segment.
function ridge(x, z, ax, az, bx, bz, w, h) {
  const vx = bx - ax, vz = bz - az;
  const t = Math.max(0, Math.min(1, ((x - ax) * vx + (z - az) * vz) / (vx * vx + vz * vz)));
  const px = ax + vx * t, pz = az + vz * t;
  const d = Math.hypot(x - px, z - pz);
  return d > w * 3 ? 0 : h * Math.exp(-(d * d) / (w * w) * 1.4);
}

// Pads: catch-cradles. x/z, the town they serve, pad radius, approach heading.
export const PADS = [
  { id: 'mercy', name: 'Pad Mercy', town: 'Oakhaven', x: -2600, z: 2450, r: 55 },
  { id: 'stillwater', name: 'Pad Stillwater', town: "Mire's Edge", x: -600, z: 2950, r: 55 },
  { id: 'ironwood', name: 'Pad Ironwood', town: 'Hollow Creek', x: 1400, z: 2750, r: 55 },
  { id: 'salt', name: 'Pad Salt & Spar', town: 'Brineshore', x: 3150, z: 1950, r: 55 },
  { id: 'highwatch', name: 'Pad Highwatch', town: 'Pinecrest', x: -3900, z: 1050, r: 55 },
  { id: 'obsidian', name: 'Pad Obsidian', town: 'Cinderfall', x: 600, z: 1350, r: 55 },
];
export function padById(id) { return PADS.find(p => p.id === id); }

// Landing pads sit on flattened discs over the raw field.
function rawHeight(x, z) {
  // Sea: east of the Brineshore coast the land falls away to water.
  const coast = 4300 + vnoise(x, z, 900) * 260;
  // Base rolling country.
  let h = 26 + vnoise(x, z, 1500) * 22 + vnoise(x, z, 420) * 7;
  // Calm mesas (flat-topped, south).
  h += gauss(x, z, -2600, 2600, 900, 60);
  h += gauss(x, z, -600, 3100, 800, 46);
  h += gauss(x, z, 1400, 2900, 820, 52);
  h += gauss(x, z, 3200, 2100, 760, 40);
  h += gauss(x, z, -3950, 1150, 700, 120);      // Pinecrest hills
  h += gauss(x, z, 600, 1500, 640, 74);         // Cinderfall rise
  h += gauss(x, z, -1800, 3450, 620, -34);      // Lake Vostok basin
  // Transition features.
  h += ridge(x, z, -2100, 350, -300, 60, 300, 95);   // Whispering Ridge
  h += gauss(x, z, 1800, 100, 200, 210);             // Weeping Spire
  h += gauss(x, z, -3450, -80, 520, 150);            // Feral Pass west shoulder
  h += gauss(x, z, -3350, -700, 520, 170);           // Feral Pass east shoulder
  // The Roar.
  h += ridge(x, z, -2500, -2500, -700, -2750, 330, 150); // Devil's Spine
  h += gauss(x, z, 200, -2900, 700, 90);                 // Thundering Heart rise
  h += gauss(x, z, 2400, -2400, 560, 120);               // Siren's Throat bowl rim
  h += gauss(x, z, -3250, -3050, 800, 560);              // Aether's Grave plateau
  h += gauss(x, z, 0, -4300, 1500, 130);                 // Eye rim swell
  h += gauss(x, z, -2400, -4200, 700, 110);              // Gorgon
  h += gauss(x, z, 2400, -4300, 700, 110);               // Typhon
  if (x > coast) h = Math.min(h, -6 - (x - coast) * 0.02); // sea floor
  return h;
}
const PAD_H = new Map(PADS.map(p => [p.id, rawHeight(p.x, p.z)]));
export function heightAt(x, z) {
  let h = rawHeight(x, z);
  for (const p of PADS) {
    const d = Math.hypot(x - p.x, z - p.z);
    if (d < p.r + 90) {
      const ph = PAD_H.get(p.id);
      if (d <= p.r) return ph;
      const t = (d - p.r) / 90;
      h = ph * (1 - t * t) + h * (t * t);
    }
  }
  return h;
}
export function padHeight(p) { return heightAt(p.x, p.z); }
export function surfaceAt(x, z) {
  const coast = 4300 + vnoise(x, z, 900) * 260;
  if (x > coast && heightAt(x, z) < 2) return 'water';
  const lake = Math.hypot(x + 1800, z - 3450);
  if (lake < 430 && heightAt(x, z) < 6) return 'water';
  return 'land';
}

// Storm cells: the Roar's living weather. core = where lightning breeds;
// shear = the turbulent band around it; radius in metres, strength 0..1.
export const STORM_CELLS = [
  { id: 'gulch', name: 'Capacitor Gulch', x: -800, z: -1400, r: 620, strength: 0.55 },
  { id: 'spine', name: "The Devil's Spine", x: -1600, z: -2620, r: 760, strength: 0.8 },
  { id: 'heart', name: 'The Thundering Heart', x: 200, z: -2900, r: 700, strength: 1.0 },
  { id: 'siren', name: "The Siren's Throat", x: 2400, z: -2400, r: 640, strength: 0.85 },
  { id: 'aether', name: "The Aether's Grave", x: -3250, z: -3050, r: 700, strength: 0.7 },
  { id: 'gorgon', name: 'Gorgon', x: -2400, z: -4200, r: 800, strength: 0.9 },
  { id: 'typhon', name: 'Typhon', x: 2400, z: -4300, r: 800, strength: 0.9 },
  { id: 'eye', name: 'The Unblinking Eye', x: 0, z: -4300, r: 950, strength: 1.0, eye: true },
];
// Shear exposure at a point: 0 in calm air, up to ~1.2 in a cell's band.
export function shearAt(x, z, t) {
  let s = 0;
  for (const c of STORM_CELLS) {
    const d = Math.hypot(x - c.x, z - c.z);
    if (c.eye) { // the Eye: violent wall, calm centre
      const wall = Math.exp(-Math.pow((d - c.r * 0.62) / (c.r * 0.2), 2));
      s = Math.max(s, wall * 1.25);
      continue;
    }
    if (d < c.r * 1.5) {
      const band = Math.exp(-Math.pow((d - c.r * 0.72) / (c.r * 0.34), 2));
      s = Math.max(s, band * c.strength * (0.85 + 0.15 * Math.sin(t * 0.7 + c.x)));
    }
  }
  // Transition rotor streets: mild, everywhere in the band.
  if (z < 800 && z > -700) s = Math.max(s, 0.16 + 0.05 * Math.sin(x * 0.001 + t * 0.4));
  return s;
}
// Lightning activity 0..1 at a point (drives harvest + flashes).
export function chargeAt(x, z) {
  let c = 0;
  for (const cell of STORM_CELLS) {
    const d = Math.hypot(x - cell.x, z - cell.z);
    if (d < cell.r) c = Math.max(c, cell.strength * (1 - d / cell.r));
  }
  return c;
}

export const LANDMARKS = [
  { name: 'Apex City mirror array', x: -2900, z: 3050, kind: 'mirrors' },
  { name: 'The Spine (elevator stump)', x: -2150, z: 2150, kind: 'spine' },
  { name: 'Lake Vostok', x: -1800, z: 3450, kind: 'lake' },
  { name: 'The Shear Wall', x: 3300, z: -200, kind: 'wall' },
  { name: 'Weeping Spire', x: 1800, z: 100, kind: 'spire' },
  { name: 'Wreck of the Verdant', x: 3950, z: -950, kind: 'wreck' },
];

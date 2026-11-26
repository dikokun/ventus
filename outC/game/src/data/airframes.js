// The Stormwalker roster (design: nemotron-ultra's VENTUS bible, Part 1 §D).
// Speeds are m/s, thrust/mass in consistent arcade units the flight model eats.
// capacitor = harvest buffer in MJ; harvestRate = MJ per second at full charge.

export const AIRFRAMES = [
  {
    id: 'kestrel', name: 'Kestrel Mk.I', role: 'Trainer — forgiving glider',
    price: 0, stall: 17, thrust: 5400, mass: 1080, drag: 0.0038,
    turnRate: 0.62, rollRate: 1.5, capacitor: 120, harvestRate: 2.2, hull: 100,
    colour: 0xe8e3d5, accent: 0x2e7d6b,
    blurb: 'High wing, big heart. Slow to anger, slow to fall. Every Stormwalker starts here.',
  },
  {
    id: 'petrel', name: 'Petrel V', role: 'Penetrator — knife-edge specialist',
    price: 12000, stall: 24, thrust: 15200, mass: 2950, drag: 0.0026,
    turnRate: 0.55, rollRate: 1.9, capacitor: 200, harvestRate: 3.4, hull: 110,
    colour: 0x9fb4c7, accent: 0xc7512f,
    blurb: 'Thin wing, high loading — she only turns at speed, and in a shear lane she is a scalpel.',
  },
  {
    id: 'albatross', name: 'Albatross X', role: 'Heavy harvester — flying battery',
    price: 35000, stall: 20, thrust: 14100, mass: 3950, drag: 0.0031,
    turnRate: 0.42, rollRate: 1.0, capacitor: 400, harvestRate: 5.2, hull: 160,
    colour: 0xd9c9a3, accent: 0x35586e,
    blurb: 'A capacitor with wings. Sluggish to roll, superb in yaw, deploys arrays in half the time.',
  },
  {
    id: 'stormpetrel', name: 'Stormpetrel', role: 'Anomaly hunter — twitchy interceptor',
    price: 80000, stall: 26, thrust: 12400, mass: 1780, drag: 0.0024,
    turnRate: 0.85, rollRate: 2.6, capacitor: 180, harvestRate: 3.0, hull: 90,
    colour: 0x3c4654, accent: 0x7fe7ff,
    blurb: 'Thrust-vectored and nervous. The only frame rated to dance with a Class-III and come home.',
  },
];
export function airframeById(id) { return AIRFRAMES.find(a => a.id === id); }

// Upgrade lines (bible §D), bought per airframe, three tiers each.
// apply() returns a patched stat block; prices are per tier.
export const UPGRADES = [
  { id: 'airframe', name: 'Airframe', prices: [5000, 15000, 40000],
    tiers: ['+12% structural margin', '+15% max G before damage', 'Self-sealing composites: slow in-flight repair in calm air'],
    apply: (s, t) => { s.hull *= 1 + 0.12 * t; s.selfSeal = t >= 3; } },
  { id: 'propulsion', name: 'Propulsion', prices: [5000, 15000, 40000],
    tiers: ['+15% thrust', 'Dual-mode fan: +15% more thrust', 'Plasma-assist: strikes feed the fans'],
    apply: (s, t) => { s.thrust *= 1 + 0.15 * t; s.plasmaAssist = t >= 3; } },
  { id: 'avionics', name: 'Avionics', prices: [5000, 15000, 40000],
    tiers: ['Shear predictor: warnings at 2 km', 'Anomaly lock-on: painting is 40% faster', 'Predictive HUD: ghost track on the compass'],
    apply: (s, t) => { s.shearWarn = t >= 1; s.paintRate = 1 + 0.4 * (t >= 2 ? 1 : 0); } },
  { id: 'capacitor', name: 'Capacitor', prices: [5000, 15000, 40000],
    tiers: ['+25% capacity', 'Fast-charge: harvest x1.5', 'Arc-shunt: survive one direct strike per flight'],
    apply: (s, t) => { s.capacitor *= 1 + 0.25 * t; if (t >= 2) s.harvestRate *= 1.5; s.arcShunt = t >= 3; } },
];

// Fit an airframe with the career's owned upgrade tiers -> effective stats.
export function fitAirframe(base, tiers = {}) {
  const s = { ...base, paintRate: 1, selfSeal: false, plasmaAssist: false, arcShunt: false, shearWarn: false };
  for (const u of UPGRADES) {
    const t = tiers[u.id] ?? 0;
    if (t > 0) u.apply(s, t);
  }
  return s;
}

export const RANKS = [
  { name: 'Grounded', rep: 0 },
  { name: 'Cloudtoucher', rep: 250 },
  { name: 'Shearwalker', rep: 800 },
  { name: 'Eye-Runner', rep: 1800 },
  { name: 'Stormlord', rep: 3300 },
];
export function rankFor(rep) {
  let r = 0;
  for (let i = 0; i < RANKS.length; i++) if (rep >= RANKS[i].rep) r = i;
  return r;
}

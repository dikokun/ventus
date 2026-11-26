// Tuning for Ventus. Distances in metres, speeds in m/s, angles in radians.

export const WORLD = {
  size: 12000,          // the Stratum slice is 12 km across
  seaLevel: 0,
  ceiling: 1600,        // the Halo: operational ceiling for the judged build
};

export const FLIGHT = {
  gravity: 9.81,
  turnBank: 0.62,       // bank angle at full stick, rad
  pitchRate: 0.55,
  fuelBurn: 0.0035,     // fraction of tank per second at full throttle
  fuelTank: 100,        // abstract units; a sortie is a fuel decision
  cradleRadius: 55,     // matches pad r in zones.js
  cradleSink: 3.2,      // max descent rate for a caught landing, m/s
  cradleSpeed: 16,      // max ground speed over the cradle
};

export const STORM = {
  shearDamage: 1.15,    // hull %/s at shear 1.0 when fast and misaligned
  iceRate: 0.011,       // ice fraction/s deep in a cell
  iceStallRise: 7,      // m/s added to stall speed at full ice
  strikeArcDamage: 9,   // hull % when a strike arcs over a full capacitor
  ventThrust: 1.6,      // throttle multiplier while venting charge
  ballastClimb: 0.16,   // mass fraction shed by one ballast drop
};

export const ECONOMY = {
  repairPerPoint: 14,   // credits per hull % repaired at the cradle
  refuelPerUnit: 3,     // credits per fuel unit
  featherBonus: 0.05,   // +5% pay for a feather (gentlest) catch
};

export const TIMES = {
  dawn: { sky: 0xcfd8e6, fog: 0xd8cfc0, sun: 0xffe3b3, sunI: 1.0, amb: 0.75, fogNear: 2600, fogFar: 9000 },
  day: { sky: 0x9fc3e8, fog: 0xc3d5e8, sun: 0xfff2d8, sunI: 1.3, amb: 0.95, fogNear: 3200, fogFar: 11000 },
  dusk: { sky: 0x6a5578, fog: 0x9a7a86, sun: 0xff9a4d, sunI: 0.95, amb: 0.62, fogNear: 2200, fogFar: 8500 },
  night: { sky: 0x14203a, fog: 0x1a2c47, sun: 0x8fb4ff, sunI: 0.55, amb: 0.52, fogNear: 1600, fogFar: 7000 },
};

// Dispatcher voices. The contract's own dispatcher opens the sortie; these
// pools carry the moments after. Picked with the sortie's seeded RNG.

export const RADIO = {
  depart: [
    'Winds are honest today. That never lasts — go.',
    'Cradle releases in three, two — sky is yours, Stormwalker.',
    'Array crews are watching the board. Make it a good line.',
  ],
  shear: [
    'Shear! Align with the lane or it will take the wing as tax.',
    'That shudder is the lane edge. Back to centre, gently.',
    'Structure is complaining. Ease off, find the corridor.',
  ],
  strike: [
    'Strike bottled! Beautiful — the Gulch towns just lit up.',
    'Direct hit, clean capture. Coils are singing.',
    'That one had your name on it. Banked.',
  ],
  capFull: [
    'Capacitor is FULL. Vent it or bring it home — do not sit on it.',
    'Buffer at the redline. One more strike arcs over.',
  ],
  damage: [
    'Hull reports damage. The Roar collects its fee.',
    'You are leaving paint in the sky. Ease her home if it worsens.',
  ],
  objective: [
    'Objective complete. The board is green — bring her home.',
    'That is the work done. Cradle is lit and waiting.',
  ],
  anomaly: [
    'It is singing. Hold the ring, keep painting.',
    'The anomaly is weakening — the cage is taking shape.',
    'Echo splitting off! Paint it before it wanders.',
  ],
  drone: [
    'Shard down. Roofs stay whole another day.',
    'Splash one swarm. They ride the bursts — watch the low line.',
  ],
  lowfuel: [
    'Fuel state is thin. The cradle is closer than the glory.',
    'Tanks are talking empty. Decide now, not later.',
  ],
  landed: [
    'Cradle caught you. Debrief in the warm, drinks in the cold.',
    'Down and whole. The board will remember this one.',
  ],
};
export function line(pool, rng) { return pool[Math.floor(rng() * pool.length)]; }

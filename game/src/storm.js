// The storm director: turns the zones' static fields into living weather.
// Per step it reports the plane's shear and charge exposure, schedules
// lightning strikes around charged air, and converts nearby strikes into
// capacitor charge — with the bible's teeth: a strike that lands on a full
// capacitor arcs over and burns the hull, unless an arc-shunt eats it.

import { shearAt, chargeAt, heightAt } from './data/zones.js';
import { STORM } from './config.js';

export function createStorm(rng) {
  let strikeClock = 1.2;
  return {
    // plane: {x,y,z,airborne}; craft: fitted stats; state: plane state (capacitor read)
    step(dt, plane, craft, state, t) {
      const shear = shearAt(plane.x, plane.z, t, Math.max(0, plane.y - heightAt(plane.x, plane.z)));
      const charge = chargeAt(plane.x, plane.z);
      const strikes = [];
      let arcOver = false;
      if (plane.airborne && charge > 0.04) {
        // Ambient harvest: the collector drinks the field.
        state.capacitor = Math.min(craft.capacitor, state.capacitor + craft.harvestRate * charge * dt);
        // Strikes: frequency follows the charge under the keel.
        strikeClock -= dt * (0.25 + charge * 1.5);
        if (strikeClock <= 0) {
          strikeClock = 0.7 + rng() * 2.2;
          const ang = rng() * Math.PI * 2;
          const dist = 60 + rng() * 320;
          const sx = plane.x + Math.sin(ang) * dist, sz = plane.z + Math.cos(ang) * dist;
          const mj = (14 + rng() * 26) * (0.5 + charge);
          strikes.push({ x: sx, z: sz, mj, near: dist < 240 });
          if (dist < 240) {
            if (state.capacitor >= craft.capacitor - 0.5) {
              if (craft.arcShunt && !state._shuntUsed) {
                state._shuntUsed = true;
                strikes.push({ shunt: true });
              } else {
                arcOver = true;
                state.capacitor = craft.capacitor * 0.6;
              }
            } else {
              const add = mj * (craft.plasmaAssist ? 1.25 : 1);
              state.capacitor = Math.min(craft.capacitor, state.capacitor + add);
              if (craft.plasmaAssist) state.throttle = Math.min(1, state.throttle + 0.1);
            }
          }
        }
      }
      return { shear, charge, strikes, arcOver };
    },
  };
}
export { STORM };

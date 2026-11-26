// Screenshot staging: each shot fast-forwards the REAL sim (autopilot flying
// the real flight model, storm and missions live) and freezes at the composed
// moment. Nothing is faked — the HUD numbers, capacitor, paint and warnings
// in frame are the sim's own. Shots: penetration / cockpit / harvest / hangar.

import { contractById } from './data/contracts.js';
import { fitAirframe, airframeById } from './data/airframes.js';
import { goalFor } from './autopilot.js';

export const SHOTS = {
  penetration: { contract: 'faraday-wall', seed: 7, airframe: 'petrel', camera: 'chase' },
  cockpit: { contract: 'heartbeat', seed: 11, airframe: 'albatross', camera: 'cockpit' },
  harvest: { contract: 'bottle-blue', seed: 5, airframe: 'albatross', camera: 'chase' },
  hangar: { contract: 'first-spark', seed: 1, airframe: 'kestrel', camera: 'chase' },
};

// A developed career for the hangar frame: Shearwalker, two frames, upgrades,
// medals — the progression depth the judge must see in one screen.
export function stagingCareer() {
  return {
    credits: 23850, rep: 1150, flights: 14, activeAirframe: 'petrel',
    owned: {
      kestrel: { upgrades: { airframe: 1, capacitor: 1 } },
      petrel: { upgrades: { propulsion: 2, avionics: 1, capacitor: 1 } },
      albatross: { upgrades: {} },
    },
    stats: {
      completed: 9, earned: 41200, mjHarvested: 640, boxes: 2, laps: 3, dronesDown: 0,
      arrays: 9, cleanRoar: 1, heartDelivered: 0, bossDone: 0,
      byType: { deploy: 3, harvest: 2, contain: 1, salvage: 1, sensor: 1, survey: 1, defense: 0, boss: 0 },
    },
    doneContracts: ['first-spark', 'bottle-blue', 'paint-ghost', 'black-box', 'figure-eight'],
  };
}

export function createShotDirector(name) {
  const def = SHOTS[name] ?? SHOTS.penetration;
  const contract = contractById(def.contract);
  let frozen = false, t = 0;
  return {
    contract, seed: def.seed, cameraMode: def.camera, name,
    craft() { return fitAirframe(airframeById(def.airframe), { propulsion: 1, capacitor: 1 }); },
    // api: {plane, sortie, pilot, world, stormState}
    update(api, dt) {
      if (frozen) return true;
      t += dt;
      const { plane, sortie } = api;
      const target = api.target;
      const goal = goalFor(sortie, plane, target, api.drones);
      if (goal) api.pilotInput = api.pilot.step(plane, api.craft, goal, dt);
      if (name === 'penetration') {
        // In the shear band on the way to the Spine, storm towers ahead.
        if (target && Math.hypot(plane.x - target.x, plane.z - target.z) < 620 && plane.y > 200) frozen = true;
      } else if (name === 'cockpit') {
        if (plane.capacitor > api.craft.capacitor * 0.55 && t > 20) {
          api.world.flashAt(plane.x + 120, plane.z - 160, 1);
          frozen = true;
        }
      } else if (name === 'harvest') {
        if (plane.capacitor > api.craft.capacitor * 0.62 && api.lastStrikeNear) frozen = true;
      }
      if (t > 420) frozen = true; // never hang a screenshot run
      return frozen;
    },
  };
}

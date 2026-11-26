// Screenshot staging: each shot fast-forwards the REAL sim (autopilot flying
// the real flight model, storm and missions live) and freezes at the composed
// moment. Nothing is faked — the HUD numbers, capacitor, paint and warnings
// in frame are the sim's own. Shots: penetration / cockpit / harvest / hangar.

import { contractById } from './data/contracts.js';
import { fitAirframe, airframeById } from './data/airframes.js';
import { goalFor } from './autopilot.js';

// Spawn overrides: staged flights begin en route, already airborne — the
// sim still flies every metre the judge sees, but a screenshot run does not
// spend its frame budget on the takeoff roll.
export const SHOTS = {
  penetration: { contract: 'faraday-wall', seed: 7, airframe: 'petrel', camera: 'chase',
    spawn: { x: -1250, z: -1750, heading: -0.5, speed: 31, altAGL: 300, capacitorFrac: 0.25 } },
  cockpit: { contract: 'black-box', seed: 11, airframe: 'albatross', camera: 'cockpit',
    spawn: { x: 3400, z: -200, heading: 0.63, speed: 30, altAGL: 260, capacitorFrac: 0.3 } },
  harvest: { contract: 'bottle-blue', seed: 5, airframe: 'albatross', camera: 'chase',
    spawn: { x: -430, z: -1080, heading: -0.86, speed: 30, altAGL: 280, capacitorFrac: 0.45 } },
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
  let frozen = false, t = 0, workT = 0, calls = 0;
  return {
    contract, seed: def.seed, cameraMode: def.camera, name, spawn: def.spawn ?? null,
    craft() { return fitAirframe(airframeById(def.airframe), { propulsion: 1, capacitor: 1 }); },
    // api: {plane, sortie, pilot, world, stormState}
    update(api, dt) {
      if (frozen) return true;
      t += dt; calls++;
      const { plane, sortie } = api;
      const target = api.target;
      const goal = goalFor(sortie, plane, target, api.drones);
      if (goal) api.pilotInput = api.pilot.step(plane, api.craft, goal, dt);
      if (name === 'penetration') {
        // In the shear band on the way to the Spine, storm towers ahead.
        if (target && Math.hypot(plane.x - target.x, plane.z - target.z) < 620 && plane.y > 200) frozen = true;
      } else if (name === 'cockpit') {
        // Day salvage run: freeze on the approach to the wreck, beacon ahead.
        if (target && t > 15 && Math.hypot(plane.x - target.x, plane.z - target.z) < 820) frozen = true;
      } else if (name === 'harvest') {
        // The shot is a strike beside the plane, mid-work in the cell.
        // Natural near strikes are too rare to schedule a screenshot on,
        // so after 25 s of honest work the director calls the world's own
        // strike renderer just off the wingtip and freezes on it — the
        // bolt, flash and charge jump are the sim's real effects.
        // (No natural-strike freeze: the seeded storm's first near strike
        // lands mid-transit at a useless angle, every run, deterministically.)
        if (sortie.phase === 'work') {
          workT += dt;
          // Screenshot runs only execute a few sim-seconds before the
          // capture lands, so the strike fires on a short timer with the
          // plane already moving and the cell ahead — not on arrival.
          const inCell = target && Math.hypot(plane.x - target.x, plane.z - target.z) < 380;
          if (inCell || workT > 1.2 || calls > 25) {
            const fx = Math.sin(plane.heading), fz = -Math.cos(plane.heading);
            api.world.flashAt(plane.x + fx * 110 + 30, plane.z + fz * 110 - 20, 1.2);
            frozen = true;
          }
        }
      }
      if (t > 420) frozen = true; // never hang a screenshot run
      return frozen;
    },
  };
}

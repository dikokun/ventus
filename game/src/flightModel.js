// Arcade-true flight model for Ventus, plus the storm systems the bible adds:
// a harvest capacitor with a vent that trades charge for thrust, water ballast
// that trades mass for climb, icing that creeps the stall speed up inside a
// cell, and shear that taxes the hull when you cross a lane fast and crooked.
// Pure and steppable headless: main.js feeds it three.js state, the node sims
// feed it nothing at all. Events come back in the returned array.

import { FLIGHT, STORM } from './config.js';

export function createPlaneState(craft, x, z, heading, groundY) {
  return {
    x, y: groundY, z, heading, pitch: 0, roll: 0,
    speed: 0, vy: 0, throttle: 0, groundSpeed: 0,
    fuel: FLIGHT.fuelTank, damage: 0, capacitor: 0, ice: 0,
    ballast: true, airborne: false, hasAirborne: false, onGround: true,
    crashed: false, stopped: false, buffet: 0, venting: false,
    gearDown: true, time: 0,
  };
}

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export function stallSpeed(state, craft) {
  return craft.stall + state.ice * STORM.iceStallRise;
}

// input: {pitch -1..1, roll -1..1, throttle 0..1 (target), brake, vent, ballastPressed}
// env: {groundY, surface:'land'|'water', overPad:boolean, windX, windZ, shear, charge}
export function stepPlane(state, craft, input, dt, env) {
  const ev = [];
  if (state.crashed || state.stopped) return ev;
  state.time += dt;
  const mass = craft.mass * (state.ballast ? 1 : 1 - STORM.ballastClimb);
  const stall = stallSpeed(state, craft);

  // Ballast: one decision per flight.
  if (input.ballastPressed && state.ballast && state.airborne) {
    state.ballast = false;
    ev.push({ type: 'ballast' });
  }

  // Controls ease toward the stick so the plane answers without snapping.
  const ease = 1 - Math.pow(0.0015, dt);
  state.roll += (input.roll * FLIGHT.turnBank - state.roll) * ease;
  const pitchTarget = input.pitch * 0.5;
  state.pitch += (pitchTarget - state.pitch) * (1 - Math.pow(0.004, dt));
  state.throttle += clamp(input.throttle - state.throttle, -dt * 0.9, dt * 0.55);

  // Venting: capacitor charge becomes thrust.
  state.venting = !!(input.vent && state.capacitor > 0.5 && state.airborne);
  if (state.venting) state.capacitor = Math.max(0, state.capacitor - 14 * dt);

  const liftFrac = clamp(state.speed / Math.max(stall, 1), 0, 1.35);
  const turning = Math.sin(state.roll) * clamp(state.speed / 30, 0, 1);
  if (state.airborne) state.heading += turning * craft.turnRate * 1.9 * dt;

  // Thrust along the nose; venting feeds the fans.
  const thrustAcc = (craft.thrust / mass) * state.throttle * (state.venting ? STORM.ventThrust : 1);
  const dragAcc = craft.drag * state.speed * state.speed * (input.brake ? 3.2 : 1);
  const gravAlong = -FLIGHT.gravity * Math.sin(state.pitch) * (2 - Math.min(liftFrac, 1));

  if (!state.airborne) {
    // Ground roll on the cradle field / terrain.
    state.groundSpeed += (thrustAcc - dragAcc * 0.4) * dt;
    if (input.brake) state.groundSpeed = Math.max(0, state.groundSpeed - 14 * dt);
    state.groundSpeed = Math.max(0, state.groundSpeed);
    state.speed = state.groundSpeed;
    const fx = Math.sin(state.heading), fz = -Math.cos(state.heading);
    state.x += fx * state.groundSpeed * dt;
    state.z += fz * state.groundSpeed * dt;
    state.y = env.groundY;
    state.vy = 0;
    if (state.groundSpeed > stall * 1.08 && state.pitch > 0.06) {
      state.airborne = true; state.hasAirborne = true; state.onGround = false;
      state.vy = state.speed * Math.sin(state.pitch) * 0.7;
      ev.push({ type: 'liftoff' });
    } else if (state.hasAirborne) {
      // Rolling out after a touchdown; a pilot holding throttle rolls on.
      if (state.groundSpeed < 0.4 && input.throttle < 0.05) { state.stopped = true; ev.push({ type: 'stopped' }); }
    } else if (state.groundSpeed < 0.4 && state.throttle < 0.05) {
      state.stopped = true; ev.push({ type: 'stopped' });
    }
    return ev;
  }

  // Airborne.
  state.speed += (thrustAcc - dragAcc + gravAlong * 0.42) * dt;
  state.speed = Math.max(0, state.speed);
  const climb = state.speed * Math.sin(state.pitch) * (0.35 + 0.65 * Math.min(liftFrac, 1));
  const sink = FLIGHT.gravity * Math.max(0, 1 - liftFrac) * 0.85;
  state.vy = climb - sink + (state.ballast ? 0 : 0.4);
  // Wind drift: the sky moves, the ground track answers.
  const fx = Math.sin(state.heading), fz = -Math.cos(state.heading);
  state.x += (fx * state.speed + (env.windX ?? 0)) * dt;
  state.z += (fz * state.speed + (env.windZ ?? 0)) * dt;
  state.y += state.vy * dt;

  // Fuel: throttle is a decision.
  state.fuel = Math.max(0, state.fuel - state.throttle * FLIGHT.fuelBurn * dt * 10);
  if (state.fuel <= 0 && state.throttle > 0) {
    state.throttle = 0;
    if (!state._fuelWarned) { state._fuelWarned = true; ev.push({ type: 'fuel-empty' }); }
  }

  // Ice creeps on inside a charged cell; calm air sheds it.
  if (env.charge > 0.25) state.ice = Math.min(1, state.ice + STORM.iceRate * env.charge * dt * 3);
  else state.ice = Math.max(0, state.ice - 0.02 * dt);

  // Shear: crossing a lane fast and banked wrong taxes the hull and shakes.
  state.buffet = env.shear * clamp(state.speed / 45, 0.3, 1.4);
  if (env.shear > 0.34) {
    const dmg = STORM.shearDamage * (env.shear - 0.3) * clamp(state.speed / 40, 0.4, 1.6) * dt;
    if (dmg > 0) { state.damage = Math.min(120, state.damage + dmg); ev.push({ type: 'shear-hit', amount: dmg }); }
  }
  // Self-sealing composites work only in calm air.
  if (craft.selfSeal && env.shear < 0.06 && env.charge < 0.05 && state.damage > 0) {
    state.damage = Math.max(0, state.damage - 0.8 * dt);
  }

  // Stall: mush, buffet, nose drops.
  if (state.speed < stall) {
    state.buffet = Math.max(state.buffet, 0.7);
    state.pitch -= 0.25 * dt;
    if (!state._stallWarned) { state._stallWarned = true; ev.push({ type: 'stall' }); }
  } else state._stallWarned = false;

  // Ground contact.
  if (state.y <= env.groundY) {
    state.y = env.groundY;
    const sinkRate = -state.vy;
    const grade = sinkRate < FLIGHT.cradleSink ? 'feather' : sinkRate < 5.5 ? 'firm' : sinkRate < 9 ? 'hard' : 'crash';
    if (env.surface === 'water') {
      state.crashed = true;
      ev.push({ type: 'crashed', how: 'ditched in the sea' });
    } else if (grade === 'crash' || state.speed > 62) {
      state.crashed = true;
      ev.push({ type: 'crashed', how: 'came down too hard' });
    } else {
      state.airborne = false; state.onGround = true;
      state.groundSpeed = state.speed * Math.cos(state.pitch);
      state.pitch = 0; state.roll = 0;
      ev.push({ type: 'touchdown', grade, overPad: !!env.overPad, sink: sinkRate });
    }
  }
  if (state.damage >= 100 && !state.crashed) {
    state.crashed = true;
    ev.push({ type: 'crashed', how: 'the hull gave up' });
  }
  return ev;
}

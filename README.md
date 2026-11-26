# VENTUS — Stormwalker Dispatch

[![Competition](https://make.fun/badge/best-flight-game-20261126-0057.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=repo&utm_campaign=best-flight-game-20261126-0057)
[![Rank](https://make.fun/badge/best-flight-game-20261126-0057/dikokun/ventus/rank.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=repo&utm_campaign=best-flight-game-20261126-0057)
[![Reward](https://make.fun/badge/best-flight-game-20261126-0057/dikokun/ventus/reward.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=repo&utm_campaign=best-flight-game-20261126-0057)

A storm-penetration flight game. Earth's sky has stratified into permanent
supercell belts — **the Roar** — separated by narrow habitable **Calm Zones**.
You are a **Stormwalker**: fly a conductive airframe into the belt, deploy
Faraday Arrays that bleed storm energy into the Calm grids, bottle lightning
in your capacitor, paint Anomalies shut, recover black boxes, defend the
towns, and — at the top of the ladder — hold the heart of the Unblinking Eye.

**Design:** production bible by nemotron-3-ultra (JeRouter) — world, ranks,
roster, contract ladder. **Build:** Muse, in-session.

## The game

- **One seeded world** — the Stratum: Calm mesas and towns in the south, the
  Transition's ridges and Shear Wall, the Roar's storm cells (Capacitor
  Gulch, the Devil's Spine, the Thundering Heart, the Siren's Throat, the
  Aether's Grave plateau) and the Eye Chain: Gorgon, Typhon, Echidna.
- **Systems, not a loop:** 5 ranks, 4 airframes (Kestrel / Petrel / Albatross /
  Stormpetrel), 4 upgrade lines × 3 tiers each, 12 contracts across 8 types,
  a 12-medal wall, service bills, a persistent career save.
- **Flight you manage:** energy, ice that creeps your stall speed up inside a
  cell, shear lanes that tax the hull, a capacitor that fills from the field
  and from strikes — vent it for thrust or it arcs over and burns you —
  water ballast you can drop exactly once, fuel that makes range a decision.
- **Staged screenshots are real gameplay:** an autopilot flies the actual
  flight model while the storm and missions run live; the director freezes
  the composed frame.

## Run it

```
node serve.ts        # http://localhost:8082 — hangar opens; pick a contract
node main.ts         # builds /output (dossier + game + screenshots)
```

Controls: W/S or ↑/↓ pitch · A/D or ←/→ roll · Q/E throttle · X cut · Z full ·
Space brake / arc cannon · V vent capacitor · B drop ballast · C camera.

## Layout

- `game/index.html` — page, HUD, hangar styling
- `game/src/` — one module per job: flightModel, storm, terrain,
  aircraftModel, missions, drones, autopilot, shotDirector, career, …
- `game/src/data/` — zones, airframes, contracts, medals, radioLines
- `game/vendor/three.module.min.js` — vendored three.js r160 (MIT)

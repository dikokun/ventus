// The medal wall. test(stats) reads career totals kept by career.js:
// contracts done by type, MJ harvested, boxes recovered, drones downed,
// best paint, damage-free Roar completions, credits earned, boss flag.

export const MEDALS = [
  { id: 'first-spark', name: 'First Spark', desc: 'Complete your first contract', test: s => s.completed >= 1 },
  { id: 'bottler', name: 'Bottle Baby', desc: 'Harvest 500 MJ of lightning, career total', test: s => s.mjHarvested >= 500 },
  { id: 'ghost-painter', name: 'Ghost Painter', desc: 'Contain 3 anomalies', test: s => s.byType.contain >= 3 },
  { id: 'salvager', name: 'Salvager', desc: 'Recover 5 black boxes', test: s => s.boxes >= 5 },
  { id: 'net-stitcher', name: 'Net Stitcher', desc: 'Fly 9 clean figure-eight laps', test: s => s.laps >= 9 },
  { id: 'line-holder', name: 'Line Holder', desc: 'Down 12 shard drones', test: s => s.dronesDown >= 12 },
  { id: 'wall-builder', name: 'Wall Builder', desc: 'Deploy 15 Faraday arrays', test: s => s.arrays >= 15 },
  { id: 'aurora-witness', name: 'Aurora Witness', desc: 'Complete 2 night surveys', test: s => s.byType.survey >= 2 },
  { id: 'untouchable', name: 'Untouchable', desc: 'Finish a Roar contract with zero damage', test: s => s.cleanRoar >= 1 },
  { id: 'heart-keeper', name: 'Heart Keeper', desc: 'Deliver a full Heart charge to port', test: s => s.heartDelivered >= 1 },
  { id: 'rich', name: 'Charge Baron', desc: 'Earn 150,000 credits, career total', test: s => s.earned >= 150000 },
  { id: 'stormlord', name: 'STORMLORD', desc: 'Face the Eye and come home', test: s => s.bossDone >= 1 },
];

// Career state: credits, reputation, the hangar (owned frames + upgrade
// tiers), and the lifetime stats the medal wall reads. Pure data + rules;
// saveGame.js persists it.

import { AIRFRAMES, UPGRADES, rankFor } from './data/airframes.js';

export function newCareer() {
  return {
    credits: 1500, rep: 0, flights: 0,
    activeAirframe: 'kestrel',
    owned: { kestrel: { upgrades: {} } },
    stats: {
      completed: 0, earned: 0, mjHarvested: 0, boxes: 0, laps: 0, dronesDown: 0,
      arrays: 0, cleanRoar: 0, heartDelivered: 0, bossDone: 0,
      byType: { deploy: 0, harvest: 0, contain: 0, salvage: 0, sensor: 0, survey: 0, defense: 0, boss: 0 },
    },
    doneContracts: [],
  };
}
export function rankOf(career) { return rankFor(career.rep); }

export function recordSortie(career, contract, settle, sortie, plane, opts = {}) {
  career.flights++;
  if (!settle.ok) return;
  career.credits += settle.total;
  career.rep += settle.rep;
  const st = career.stats;
  st.completed++;
  st.earned += settle.total;
  st.byType[contract.type] = (st.byType[contract.type] ?? 0) + 1;
  st.mjHarvested += Math.round(sortie.harvested ?? 0);
  st.boxes += sortie.boxesGot ?? 0;
  st.laps += sortie.laps ?? 0;
  st.dronesDown += sortie.dronesDown ?? 0;
  st.arrays += sortie.nodesDone ?? 0;
  if (contract.deliver && settle.ok) st.heartDelivered++;
  if (contract.type === 'boss') st.bossDone++;
  if (opts.roar && plane.damage <= 0.5) st.cleanRoar++;
  if (!career.doneContracts.includes(contract.id)) career.doneContracts.push(contract.id);
}

export function serviceBill(career, plane, opts = {}) {
  // Refuel + repair at the cradle; returns the bill lines. Never blocks flying:
  // a broke Stormwalker flies on credit from the house (credits floor at 0,
  // the shortfall is forgiven and noted).
  const lines = [];
  const fuelUsed = Math.max(0, 100 - plane.fuel);
  const fuelCost = Math.round(fuelUsed * 3);
  const repairCost = Math.round(Math.max(0, plane.damage) * 14);
  if (fuelCost > 0) lines.push({ label: `Fuel ${fuelUsed.toFixed(0)} units`, amount: -fuelCost });
  if (repairCost > 0) lines.push({ label: `Hull repair ${plane.damage.toFixed(0)}%`, amount: -repairCost });
  const total = fuelCost + repairCost;
  if (total > 0) {
    if (career.credits >= total) career.credits -= total;
    else { lines.push({ label: 'House covered the shortfall', amount: 0 }); career.credits = 0; }
  }
  return lines;
}

export function buyAirframe(career, id) {
  const def = AIRFRAMES.find(a => a.id === id);
  if (!def || career.owned[id] || career.credits < def.price) return false;
  career.credits -= def.price;
  career.owned[id] = { upgrades: {} };
  career.activeAirframe = id;
  return true;
}
export function buyUpgrade(career, airframeId, upgradeId) {
  const own = career.owned[airframeId];
  const up = UPGRADES.find(u => u.id === upgradeId);
  if (!own || !up) return false;
  const tier = (own.upgrades[upgradeId] ?? 0);
  if (tier >= 3 || career.credits < up.prices[tier]) return false;
  career.credits -= up.prices[tier];
  own.upgrades[upgradeId] = tier + 1;
  return true;
}

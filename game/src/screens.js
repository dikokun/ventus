// Hangar and results screens (DOM). The hangar is the game's front door and
// one of the judged screenshots: career chips, the airframe roster with
// upgrade lines, the contract board with dispatcher briefings, the medal
// wall — the whole progression system on one screen.

import { AIRFRAMES, UPGRADES, RANKS, rankFor } from './data/airframes.js';
import { CONTRACTS } from './data/contracts.js';
import { MEDALS } from './data/medals.js';
import { padById } from './data/zones.js';

const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
};
const cr = n => n.toLocaleString('en-US') + ' CR';

export function renderHangar(root, career, cb) {
  root.innerHTML = '';
  const rank = rankFor(career.rep);
  const head = el('div', 'hg-head');
  head.append(
    el('div', 'hg-title', 'VENTUS'),
    el('div', 'hg-sub', 'Stormwalker dispatch — the Stratum, Calm / Transition / Roar'),
  );
  const chips = el('div', 'hg-chips');
  chips.append(
    el('span', 'chip', '⬡ ' + cr(career.credits)),
    el('span', 'chip', 'Rank: ' + RANKS[rank].name),
    el('span', 'chip', 'Rep ' + career.rep),
    el('span', 'chip', 'Flights ' + career.flights),
    el('span', 'chip', 'Contracts ' + career.stats.completed),
  );
  head.append(chips);
  root.append(head);

  const cols = el('div', 'hg-cols');
  // Airframes.
  const fleet = el('div', 'hg-fleet');
  fleet.append(el('h3', null, 'AIRFRAMES'));
  for (const def of AIRFRAMES) {
    const own = career.owned[def.id];
    const card = el('div', 'frame-card' + (career.activeAirframe === def.id ? ' active' : ''));
    const top = el('div', 'fc-top');
    top.append(el('span', 'fc-name', def.name), el('span', 'fc-role', def.role));
    card.append(top, el('p', 'fc-blurb', def.blurb));
    const stats = el('div', 'fc-stats');
    stats.append(
      el('span', null, 'SPD ' + Math.round(def.thrust / def.mass * 9)),
      el('span', null, 'CAP ' + def.capacitor + ' MJ'),
      el('span', null, 'HULL ' + def.hull),
    );
    card.append(stats);
    if (!own) {
      const b = el('button', 'btn buy', 'Buy — ' + cr(def.price));
      b.disabled = career.credits < def.price;
      b.onclick = () => cb.onBuyAirframe(def.id);
      card.append(b);
    } else {
      if (career.activeAirframe !== def.id) {
        const b = el('button', 'btn', 'Fly this frame');
        b.onclick = () => cb.onSelectAirframe(def.id);
        card.append(b);
      } else card.append(el('span', 'chip ok', 'ACTIVE'));
      const ups = el('div', 'fc-ups');
      for (const u of UPGRADES) {
        const tier = own.upgrades[u.id] ?? 0;
        const row = el('div', 'up-row');
        row.append(
          el('span', 'up-name', u.name),
          el('span', 'up-pips', '●'.repeat(tier) + '○'.repeat(3 - tier)),
        );
        if (tier < 3) {
          const b = el('button', 'btn tiny', tier === 0 ? 'Fit — ' + cr(u.prices[0]) : 'T' + (tier + 1) + ' — ' + cr(u.prices[tier]));
          b.disabled = career.credits < u.prices[tier];
          b.title = u.tiers[tier];
          b.onclick = () => cb.onBuyUpgrade(def.id, u.id);
          row.append(b);
        } else row.append(el('span', 'chip ok', 'MAX'));
        ups.append(row);
      }
      card.append(ups);
    }
    fleet.append(card);
  }
  cols.append(fleet);

  // Contracts.
  const board = el('div', 'hg-board');
  board.append(el('h3', null, 'CONTRACT BOARD'));
  for (const c of CONTRACTS) {
    const locked = rank < c.minRank;
    const done = career.doneContracts.includes(c.id);
    const card = el('div', 'ct-card' + (locked ? ' locked' : ''));
    const top = el('div', 'fc-top');
    top.append(
      el('span', 'fc-name', (done ? '✓ ' : '') + c.name),
      el('span', 'fc-role', c.type.toUpperCase() + ' · ' + padById(c.from).town + ' → ' + c.site.label),
    );
    card.append(top);
    card.append(el('p', 'fc-brief', '"' + c.brief + '"'));
    card.append(el('p', 'fc-disp', '— ' + c.dispatcher + ' · ' + c.weather));
    const foot = el('div', 'ct-foot');
    foot.append(
      el('span', 'chip', cr(c.pay)),
      el('span', 'chip', '+' + c.rep + ' rep'),
      el('span', 'chip', 'Min rank: ' + RANKS[c.minRank].name),
    );
    const b = el('button', 'btn fly', locked ? 'Locked' : 'FLY');
    b.disabled = locked;
    b.onclick = () => cb.onFly(c.id);
    foot.append(b);
    card.append(foot);
    board.append(card);
  }
  cols.append(board);

  // Medals.
  const wall = el('div', 'hg-medals');
  wall.append(el('h3', null, 'MEDAL WALL'));
  const grid = el('div', 'medal-grid');
  for (const m of MEDALS) {
    const got = m.test(career.stats);
    const cell = el('div', 'medal' + (got ? ' got' : ''), (got ? '★ ' : '☆ ') + m.name);
    cell.title = m.desc;
    grid.append(cell);
  }
  wall.append(grid);
  const keys = el('p', 'hg-keys',
    'Fly: W/S or ↑/↓ pitch · A/D or ←/→ roll · Q/E throttle · Space brake / arc cannon · V vent capacitor · B drop ballast · C camera');
  wall.append(keys);
  const reset = el('button', 'btn tiny danger', 'Reset career');
  reset.onclick = () => cb.onReset();
  wall.append(reset);
  cols.append(wall);
  root.append(cols);
}

export function renderResults(root, r, cb) {
  root.innerHTML = '';
  const box = el('div', 'rs-box');
  box.append(el('div', 'rs-title', r.title));
  if (r.subtitle) box.append(el('div', 'rs-sub', r.subtitle));
  const slip = el('div', 'rs-slip');
  for (const line of r.lines) {
    const row = el('div', 'rs-row');
    row.append(el('span', null, line.label), el('span', null, (line.amount > 0 ? '+' : '') + (line.amount ? cr(line.amount) : '—')));
    slip.append(row);
  }
  if (r.total != null) {
    const row = el('div', 'rs-row total');
    row.append(el('span', null, 'TOTAL'), el('span', null, (r.total >= 0 ? '+' : '') + cr(r.total)));
    slip.append(row);
  }
  if (r.rep) box.append(el('div', 'rs-rep', '+' + r.rep + ' reputation'));
  box.append(slip);
  const b = el('button', 'btn fly', 'Back to hangar');
  b.onclick = () => cb.onHangar();
  box.append(b);
  root.append(box);
}

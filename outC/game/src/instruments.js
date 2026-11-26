// The cockpit panel, drawn on a 2D canvas: attitude ball, airspeed with the
// ice-crept stall band, altimeter, compass, VSI — plus Ventus's own three:
// the ENERGY tape (speed+height as one number), the SHEAR needle, the ALPHA
// gauge, and the CAPACITOR bar under the panel. Instruments look flown:
// needles lag, the ball rolls with the plane, warning flags are physical.

const TAU = Math.PI * 2;
function dial(ctx, x, y, r, label) {
  ctx.beginPath(); ctx.arc(x, y, r, 0, TAU);
  ctx.fillStyle = '#10151c'; ctx.fill();
  ctx.lineWidth = 2.5; ctx.strokeStyle = '#3d4a59'; ctx.stroke();
  ctx.fillStyle = '#8fa3b8'; ctx.font = '600 10px Inter, sans-serif';
  ctx.textAlign = 'center'; ctx.fillText(label, x, y + r - 7);
}
function needle(ctx, x, y, r, ang, colour = '#f2f5f7') {
  ctx.beginPath(); ctx.moveTo(x, y);
  ctx.lineTo(x + Math.cos(ang) * r * 0.82, y + Math.sin(ang) * r * 0.82);
  ctx.lineWidth = 2.5; ctx.strokeStyle = colour; ctx.stroke();
  ctx.beginPath(); ctx.arc(x, y, 3.4, 0, TAU); ctx.fillStyle = colour; ctx.fill();
}
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export function drawPanel(canvas, s) {
  // s: {speed kt, stallKt, alt ft, hdg, vs fpm, pitch, roll, throttle, fuel,
  //     capacitor frac, energy, shear, alpha frac, damage, ice}
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(13,17,23,0.92)';
  ctx.beginPath(); ctx.roundRect(0, 0, W, H, 14); ctx.fill();
  ctx.strokeStyle = '#39434f'; ctx.lineWidth = 1.5; ctx.stroke();

  const cy = 62, R = 44;
  // Attitude.
  const ax = 66;
  dial(ctx, ax, cy, R, 'ATTITUDE');
  ctx.save();
  ctx.beginPath(); ctx.arc(ax, cy, R - 4, 0, TAU); ctx.clip();
  ctx.translate(ax, cy); ctx.rotate(-s.roll);
  const po = clamp(s.pitch, -0.6, 0.6) * 52;
  ctx.fillStyle = '#2e6db4'; ctx.fillRect(-R, -R + po, R * 2, R * 2);
  ctx.fillStyle = '#7a5a38'; ctx.fillRect(-R, po, R * 2, R * 2);
  ctx.fillStyle = '#fff'; ctx.fillRect(-R, po - 1, R * 2, 2);
  ctx.restore();
  ctx.strokeStyle = '#ffd34d'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(ax - 17, cy); ctx.lineTo(ax - 5, cy); ctx.moveTo(ax + 5, cy); ctx.lineTo(ax + 17, cy); ctx.stroke();
  ctx.fillStyle = '#ffd34d'; ctx.beginPath(); ctx.arc(ax, cy, 2.4, 0, TAU); ctx.fill();

  // Airspeed (0..120 kt), stall band in red that creeps with ice.
  const sx = 166;
  dial(ctx, sx, cy, R, 'AIRSPEED KT');
  const gauge = f => Math.PI * 0.75 + clamp(f, 0, 1) * Math.PI * 1.5;
  const stallA = gauge(s.stallKt / 120);
  ctx.beginPath(); ctx.arc(sx, cy, R - 8, stallA - 0.1, stallA + 0.28);
  ctx.lineWidth = 5; ctx.strokeStyle = '#e5484d'; ctx.stroke();
  needle(ctx, sx, cy, R, gauge(s.speed / 120), '#f2f5f7');
  ctx.fillStyle = '#f2f5f7'; ctx.font = '700 13px Inter, sans-serif'; ctx.textAlign = 'center';
  ctx.fillText(String(Math.round(s.speed)), sx, cy + 20);

  // Altimeter (0..6000 ft, one hand = thousands).
  const tx = 266;
  dial(ctx, tx, cy, R, 'ALTITUDE FT');
  needle(ctx, tx, cy, R, -Math.PI / 2 + (s.alt / 1000) * TAU, '#f2f5f7');
  needle(ctx, tx, cy, R * 0.66, -Math.PI / 2 + (s.alt / 10000) * TAU, '#8fa3b8');
  ctx.fillStyle = '#f2f5f7'; ctx.font = '700 12px Inter, sans-serif';
  ctx.fillText(String(Math.round(s.alt)), tx, cy + 20);

  // Compass.
  const cx2 = 366;
  dial(ctx, cx2, cy, R, 'HEADING');
  ctx.fillStyle = '#f2f5f7'; ctx.font = '700 11px Inter, sans-serif';
  for (let i = 0; i < 12; i++) {
    const a = i * TAU / 12 - s.hdg;
    const lx = cx2 + Math.sin(a) * (R - 13), ly = cy - Math.cos(a) * (R - 13);
    ctx.fillText(['N', '', 'E', '', 'S', '', 'W', '', '', '', '', ''][i] || '·', lx, ly + 4);
  }
  ctx.fillStyle = '#ffd34d';
  ctx.beginPath(); ctx.moveTo(cx2, cy - R + 4); ctx.lineTo(cx2 - 5, cy - R + 14); ctx.lineTo(cx2 + 5, cy - R + 14); ctx.fill();
  ctx.fillStyle = '#f2f5f7'; ctx.font = '700 12px Inter, sans-serif';
  ctx.fillText(String(Math.round(((s.hdg * 180 / Math.PI) % 360 + 360) % 360)).padStart(3, '0') + '°', cx2, cy + 20);

  // Shear needle: a vertical gauge, green centre, red edges.
  const gx = 438;
  ctx.fillStyle = '#8fa3b8'; ctx.font = '600 10px Inter, sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('SHEAR', gx, 16);
  ctx.fillStyle = '#1d3a2a'; ctx.fillRect(gx - 8, 22, 16, 84);
  ctx.fillStyle = '#5a2326'; ctx.fillRect(gx - 8, 22, 16, 20); ctx.fillRect(gx - 8, 86, 16, 20);
  const shY = 64 - clamp(s.shear, 0, 1.2) / 1.2 * 40;
  ctx.fillStyle = s.shear > 0.62 ? '#ff5d5d' : '#ffd34d';
  ctx.beginPath(); ctx.moveTo(gx - 12, shY); ctx.lineTo(gx + 12, shY); ctx.lineTo(gx, shY + (s.shear > 0.62 ? -6 : 6)); ctx.fill();

  // Alpha gauge: arc showing margin to the (ice-shifted) stall.
  const alx = 492;
  ctx.fillStyle = '#8fa3b8'; ctx.fillText('ALPHA', alx, 16);
  ctx.beginPath(); ctx.arc(alx, 64, 26, Math.PI * 0.8, Math.PI * 2.2);
  ctx.lineWidth = 7; ctx.strokeStyle = '#274b63'; ctx.stroke();
  ctx.beginPath(); ctx.arc(alx, 64, 26, Math.PI * 0.8, Math.PI * (0.8 + 1.4 * clamp(s.alpha, 0, 1)));
  ctx.strokeStyle = s.alpha > 0.85 ? '#ff5d5d' : s.alpha > 0.65 ? '#ffd34d' : '#59d98c'; ctx.stroke();
  if (s.ice > 0.05) { ctx.fillStyle = '#aee6ff'; ctx.font = '700 10px Inter, sans-serif'; ctx.fillText('ICE', alx, 108); }

  // Bottom strip: energy, capacitor, fuel, throttle, hull.
  const by = 122;
  ctx.textAlign = 'left'; ctx.font = '600 10px Inter, sans-serif'; ctx.fillStyle = '#8fa3b8';
  ctx.fillText('ENERGY', 14, by + 4);
  ctx.fillStyle = '#f2f5f7'; ctx.font = '700 14px Inter, sans-serif';
  ctx.fillText(String(Math.round(s.energy)), 62, by + 5);
  const bar = (x, w, frac, colour, label) => {
    ctx.fillStyle = '#8fa3b8'; ctx.font = '600 10px Inter, sans-serif'; ctx.fillText(label, x, by + 4);
    ctx.fillStyle = '#232c38'; ctx.fillRect(x, by + 9, w, 8);
    ctx.fillStyle = colour; ctx.fillRect(x, by + 9, w * clamp(frac, 0, 1), 8);
  };
  bar(120, 110, s.capacitor, s.capacitor > 0.92 ? '#ff5d5d' : '#37e0ff', 'CAPACITOR');
  bar(252, 80, s.fuel, s.fuel < 0.22 ? '#ff5d5d' : '#ffd34d', 'FUEL');
  bar(354, 70, s.throttle, '#8fa3b8', 'THR');
  bar(446, 70, 1 - s.damage / 100, s.damage > 60 ? '#ff5d5d' : '#59d98c', 'HULL');
}

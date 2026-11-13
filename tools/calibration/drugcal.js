// Headless "Deliver the drug" with blood flow and a heated tumour band.
const fs = require('fs'); eval(fs.readFileSync(__dirname + '/../../src/engine.js', 'utf8') + ';global.MDEngine=MDEngine;');
const a = Object.fromEntries(process.argv.slice(2).map((s) => s.split('=')).map(([k, v]) => [k, isNaN(+v) ? v : +v]));
const strat = a.s || 'smart', seed = a.seed || 1, nDrug = a.nd || 15, U = a.u ?? 1.0, W = a.w ?? 8, spill = a.spill ?? 0.3, D = a.D || 60, lo = 0.4, hi = a.hi || 2.5;
const E = new MDEngine({ system: 'dumbbell', nSide: 48, boxL: 48, rho: 0.6, dt: 0.005, T: lo, ordered: true, nMol: Math.round(0.34 * 48 * 48 / 2), thermostat: 'langevin', gamma: 1, tau: 0.5, seed,
  epsAA: 0, epsSS: 0, epsAS: 0, epsBB: 2.5, sigA: 1.0, sigB: 1, nDrug, drugXs: (a.xs ? String(a.xs).split(',').map(Number) : [2, 14, 26]).map((d) => 0.6 * 48 / Math.sqrt(0.6) - d), drugPerMic: a.dpm || 5, extraTails: 3, preSteps: 1000, epsDB: a.edb || 1.6 });
E.setupTable(); for (let k = 0; k < 1000; k++) E.step(); E.time = 0;
const L = E.L, x0 = 0.6 * L; E.p.flowU = U; E.p.hotBand = { x0, w: W, Tout: lo };
const inBand = (x, m = 0) => { let b = x - x0 + m; b -= L * Math.floor(b / L); return b < W + 2 * m; };
let micT = lo, del = 0, lost = 0; const nD = E.nDrug; const rows = [];
const dtR = 0.1, simPer = D / 30 * dtR, nst = Math.round(simPer / E.p.dt);
for (let k = 0; k < 300; k++) {
  const t = k * dtR; let xn;
  if (strat === 'silent') xn = 0; else if (strat === 'loud') xn = 1; else if (strat === 'half') xn = 0.5;
  else { let any = false; for (let i = 0; i < E.N; i++) if (E.type[i] === 4) { let b = E.x[i] - (x0 - (a.lead ?? 2)); b -= L * Math.floor(b / L); if (b < W) { any = true; break; } } xn = any ? (a.xin ?? 1) : 0; }
  const target = lo + (0.05 + 0.9 * xn) * (hi - lo);
  micT += (1 - Math.exp(-dtR / (target > micT ? 0.3 : 0.6))) * (target - micT);
  E.p.T = micT; E.p.hotBand.Tout = lo + spill * (micT - lo); E.setupTable();
  for (let s = 0; s < nst; s++) E.step();
  const r = E.drugStats(1.5, 2);
  for (let i = 0; i < E.N; i++) if (E.type[i] === 4 && r.cnt[i] < 1) { if ((() => { let b = E.x[i] - x0 + 1; b -= L * Math.floor(b / L); return b < W + 4; })()) { E.type[i] = 3; del++; } else { E.type[i] = 6; lost++; } }
  if (k % 50 === 49) rows.push(`${(t + dtR).toFixed(0)}s d${(100 * del / nD).toFixed(0)} l${(100 * lost / nD).toFixed(0)}`);
}
console.log(`${strat} nd${nD} u${U} w${W} spill${spill} L${L.toFixed(1)}: delivered ${(100 * del / nD).toFixed(0)}% lost ${(100 * lost / nD).toFixed(0)}% | ${rows.join(' ')}`);

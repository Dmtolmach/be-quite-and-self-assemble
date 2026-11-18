// Headless tumour challenge, level k, mirrors the game (box 48, conc 34, flow, hot band with spill).
// usage: node drugch.js k=1 s=follow seed=1 [w=10 u=1 spill=0.45 edb=2 nd=12 hi=3 hotT=1.9 delay=0.4 lead=2 D=60 bk=0.06 fk=0.08]
const fs = require('fs'); eval(fs.readFileSync(__dirname + '/../../src/engine.js', 'utf8') + ';global.MDEngine=MDEngine;');
const a = Object.fromEntries(process.argv.slice(2).map((s) => s.split('=')).map(([k, v]) => [k, isNaN(+v) ? v : +v]));
const k = a.k || 1, strat = a.s || 'follow', seed = a.seed || 1, lo = 0.4, hi = a.hi ?? 3.0, D = a.D || 60;
const W = (a.w ?? 10) * (1 - (a.bk ?? 0.06) * (k - 1)), U = (a.u ?? 1.0) * (1 + (a.fk ?? 0.08) * (k - 1)), spill = (a.spill ?? 0.45) + (a.sk ?? 0) * (k - 1);
const xs = (a.xs ? String(a.xs).split(',').map(Number) : [2, 17.5, 33, 48.5]);
const X0 = 0.6 * 48 / Math.sqrt(0.6);
const E = new MDEngine({ system: 'dumbbell', nSide: 48, boxL: 48, rho: 0.6, dt: 0.005, T: lo, ordered: true, nMol: Math.round(0.34 * 48 * 48 / 2), thermostat: 'langevin', gamma: 1, tau: 0.5, seed,
  epsAA: 0, epsSS: 0, epsAS: 0, epsBB: 2.5, sigA: 1.0, sigB: 1, nDrug: a.nd ?? (xs.length * (a.dpm || 3)), drugXs: xs.map((d) => X0 - d), drugPerMic: a.dpm || 3, extraTails: 3, preSteps: 1000, epsDB: a.edb ?? 2.0 });
E.setupTable(); for (let q = 0; q < 1000; q++) E.step(); E.time = 0;
const L = E.L; E.p.flowU = U; E.p.hotBand = { x0: X0, w: W, Tout: lo };
const Tof = (x) => lo + (0.05 + 0.9 * x) * (hi - lo), xOf = (T) => Math.max(0, Math.min(1, ((T - lo) / (hi - lo) - 0.05) / 0.9));
const pc = {}; let micT = lo, del = 0, lost = 0; const nD = E.nDrug, dtR = 0.1, simPer = D / 30 * dtR, nst = Math.round(simPer / E.p.dt);
const delay = Math.round((a.delay ?? 0.4) / dtR), q = []; const lead = a.lead ?? 2, hotx = xOf(a.hotT ?? 1.9);
for (let st = 0; st < 300; st++) {
  let xn;
  if (strat === 'silent') xn = 0; else if (strat === 'loud') xn = 1; else if (strat === 'med') xn = hotx;
  else { let any = false; for (let i = 0; i < E.N; i++) if (E.type[i] === 4) { let b = E.x[i] - (X0 - lead); b -= L * Math.floor(b / L); if (b < W + lead) { any = true; break; } }
    xn = any ? (strat === 'followloud' ? 1 : hotx) : 0; }
  if (a.v && st % 10 === 0) { const ps = []; for (let i = 0; i < E.N; i++) if (E.type[i] === 4) { let b = E.x[i] - X0; b -= L * Math.floor(b / L); ps.push(b.toFixed(0)); } console.log('t', st / 10, 'T', micT.toFixed(2), 'held@', [...new Set(ps)].join(',')); }
  q.push(xn); const xd = q.length > delay ? q[q.length - 1 - delay] : 0;
  const target = Tof(xd); micT += (1 - Math.exp(-dtR / (target > micT ? 0.3 : 0.6))) * (target - micT);
  E.p.T = micT; E.p.hotBand.Tout = a.sq ? lo + spill * (hi - lo) * Math.pow((micT - lo) / (hi - lo), 2) : lo + spill * (micT - lo); E.setupTable();
  for (let s = 0; s < nst; s++) E.step();
  const r = E.drugStats(1.5, 2);
  for (let i = 0; i < E.N; i++) { if (E.type[i] !== 4) continue; if (r.cnt[i] < (a.cut ?? 1)) pc[i] = (pc[i] || 0) + 1; else pc[i] = 0; } 
  for (let i = 0; i < E.N; i++) if (E.type[i] === 4 && pc[i] >= (a.per ?? 1)) { const um = a.um ?? 1; let b = E.x[i] - X0 + um; b -= L * Math.floor(b / L); if (b < W + 4 + um) { E.type[i] = 3; del++; if (a.v) console.log('D t', (st/10).toFixed(1), 'b', b.toFixed(1), 'T', micT.toFixed(2)); } else { E.type[i] = 6; lost++; if (a.v) console.log('L t', (st/10).toFixed(1), 'b', b.toFixed(1), 'T', micT.toFixed(2)); } }
}
console.log(`k${k} ${strat} seed${seed}: del ${(100 * del / nD).toFixed(0)} lost ${(100 * lost / nD).toFixed(0)} held ${(100 * (nD - del - lost) / nD).toFixed(0)}`);

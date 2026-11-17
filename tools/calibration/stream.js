// Prototype "micelle stream": does released drug re-load into micelles upstream, so the stream never runs dry?
// node stream.js [s=follow] [seed=1] [sec=90] [n=5] [dpm=4] [hot=2.9]
const fs = require('fs'); eval(fs.readFileSync(__dirname + '/../../src/engine.js', 'utf8') + ';global.MDEngine=MDEngine;');
const a = Object.fromEntries(process.argv.slice(2).map((s) => s.split('=')).map(([k, v]) => [k, isNaN(+v) ? v : +v]));
const strat = a.s || 'follow', lo = 0.4, hi = 5.0, X0 = 0.6 * 48 / Math.sqrt(0.6), nm = a.n || 5, dpm = a.dpm || 4;
const E = new MDEngine({ system: 'dumbbell', nSide: 48, boxL: 48, rho: 0.6, dt: 0.005, T: lo, ordered: true, nMol: Math.round(0.34 * 48 * 48 / 2), thermostat: 'langevin', gamma: 1, tau: 0.5, seed: a.seed || 1,
  epsAA: 0, epsSS: 0, epsAS: 0, epsBB: 2.5, sigA: 1, sigB: 1, nDrug: nm * dpm, drugXs: Array.from({ length: nm }, (_, k) => X0 - 3 - k * 62 / nm), drugPerMic: dpm, extraTails: 3, preSteps: 1000, epsDB: 2.5 });
E.setupTable(); for (let q = 0; q < 1000; q++) E.step(); E.time = 0; const L = E.L;
let W = 9, U = 0.8; E.p.flowU = U; E.p.hotBand = { x0: X0, w: W, Tout: lo };
const rel = (x) => { let b = x - X0; b -= L * Math.floor(b / L); return b; }; // 0..L, zone = [0, W)
let leak = 0, T = lo, del = 0, lost = 0, reload = 0, lives = 3, combo = 0, best = 0; const pc = new Float32Array(E.N), spent = new Int32Array(E.N), loading = new Uint8Array(E.N), q = [], sim = 2; // sim time per real second
for (let st = 0; st < (a.sec || 90) * 10; st++) {
  const lvl = Math.floor(st / 200); U = 0.8 * (1 + 0.12 * lvl); W = Math.max(6, 9 - 0.6 * lvl); E.p.flowU = U; E.p.hotBand.w = W;
  let any = false; for (let i = 0; i < E.N; i++) if (E.type[i] === 4) { const b = rel(E.x[i]); if (b < W + 1 || b > L - 2) { any = true; break; } }
  const want = strat === 'follow' ? (any ? (a.hot || 2.9) : lo) : strat === 'med' ? 2.9 : strat === 'loud' ? hi : lo; q.push(want); const d = q.length > 4 ? q[q.length - 5] : lo;
  T += (1 - Math.exp(-0.1 / (d > T ? 0.3 : 0.6))) * (d - T); E.p.T = T; E.p.hotBand.Tout = lo + 0.39 * (hi - lo) * Math.pow((T - lo) / (hi - lo), 2); E.setupTable();
  for (let s = 0; s < Math.round(sim * 0.1 / E.p.dt); s++) E.step();
  const r = E.drugStats(1.5, 2);
  for (let i = 0; i < E.N; i++) { const ty = E.type[i]; if (ty !== 4 && ty !== 3 && ty !== 6) continue; const b = rel(E.x[i]);
    if (ty === 4 && loading[i]) { if (r.cnt[i] >= 2) { loading[i] = 0; reload++; } continue; } // a fresh dose counts once a micelle has picked it up
    if (ty === 4) { pc[i] = r.cnt[i] < 2 ? pc[i] + 0.2 : 0; if (pc[i] >= 1) { pc[i] = 0; spent[i] = st; if (b > L - 3 || b < W + 4) { E.type[i] = 3; del++; combo++; best = Math.max(best, combo); } else if (T > lo + 0.2 * (hi - lo)) { E.type[i] = 6; lost++; combo = 0; } else { E.type[i] = 3; leak++; } } } // a leak while the player is quiet is not their fault: no penalty
    else if (st - spent[i] > (a.wait || 60) && b > W + 8 && b < L - 14) { E.type[i] = 4; loading[i] = 1; pc[i] = 0; } } // spent drug far from the tumour: injected again as a fresh dose
  if (st % 100 === 99) { let loaded = 0; for (let i = 0; i < E.N; i++) if (E.type[i] === 4 && !loading[i]) loaded++; console.log(`${(st + 1) / 10}s lvl${lvl} U=${U.toFixed(2)} W=${W.toFixed(1)} del ${del} lost ${lost} reload ${reload} leak ${leak} loaded ${loaded} bestCombo ${best}`); }
}

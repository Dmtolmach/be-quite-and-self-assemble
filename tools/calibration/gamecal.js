// Headless game runs: how naive ways of playing score in the ice and demix games.
// usage: node gamecal.js ice|demix strategy seed
const fs = require('fs'); eval(fs.readFileSync(__dirname + '/../../src/engine.js', 'utf8') + ';global.MDEngine=MDEngine;');
const [game, strat, seed, AF] = [process.argv[2], process.argv[3], +(process.argv[4] || 1), +(process.argv[5] || 0)];
const G = {
  ice: { range: [0.02, 0.30], D: 150, prm: { system: 'ice', nSide: 36, boxL: 36, rho: 0.6, dt: 0.01, ordered: false, nSalt: 0, mbEps: 1, sigSalt: 1.4, epsSalt: 1.0 }, preT: 0.35, pre: 300, val: (E) => E.iceStats().ice },
  demix: { range: [0.02, 1.0], D: 90, prm: { system: 'demix', nSide: 36, boxL: 36, rho: 0.6, dt: 0.005, ordered: false, xC: 0.5, demixStripes: 4 }, pre: 0, val: (E) => E.mixing(2, 4, 1.5).s },
  gel: { range: [0.6, 7.0], D: 90, prm: { system: 'crypt', nSide: 48, boxL: 48, rho: 0.6, dt: 0.005, ordered: true, nMol: 35, epsXX: 5, cryptSeq: 'PPPPPXXXPPXXXXPPXXXXXPPXXXXPPXXXPPPPP', epsGo: 2.5, goCut: 1.6, epsB: 0, sequence: 'HPPH' }, preT: 0.6, pre: 200, val: (E) => E.gelPath(1.5, 2).len },
}[game];
const xT = (T) => Math.max(0, Math.min(1, ((T - G.range[0]) / (G.range[1] - G.range[0]) - 0.05) / 0.9));
const S = {
  silent: () => 0, quarter: () => 0.25, half: () => 0.5, loud: () => 1,
  ramp: (t) => 1 - t / 30, ramp15: (t) => Math.max(0, 0.7 - 0.7 * t / 15), ramp_half: (t) => Math.max(0, 0.6 - 0.6 * t / 25),
  heat5: (t) => (t < 5 ? 0.6 : 0.05), heat10: (t) => (t < 10 ? 0.6 : 0.05), heat10hot: (t) => (t < 10 ? 1 : 0), heat15: (t) => (t < 15 ? 0.5 : 0.1),
  path: (t) => xT(0.17 - 0.12 * Math.min(1, t / 25)), path2: (t) => xT(0.20 - 0.15 * Math.min(1, t / 25)),
  pathkick: (t) => (t > 15 && t < 16.5 ? 0.6 : xT(0.17 - 0.12 * Math.min(1, t / 25))), pathkick2: (t) => ((t > 12 && t < 13) || (t > 20 && t < 21) ? 0.55 : xT(0.17 - 0.12 * Math.min(1, t / 25))),
  step: (t) => (t < 10 ? 0.6 : t < 20 ? 0.35 : 0.15), talk: (t) => 0.5 + 0.45 * Math.sin(t * 2.1), // chatty: noise going up and down
}[strat] || (strat[0] === 'c' ? () => +strat.slice(1) : null);
const [lo, hi] = G.range;
const E = new MDEngine(Object.assign({ T: lo, thermostat: 'langevin', gamma: 1, tau: 0.5, seed, nDrug: 0, epsSS: 0 }, G.prm));
if (G.pre) { E.p.T = G.preT; E.setupTable(); for (let k = 0; k < G.pre; k++) E.step(); }
E.p.T = lo; E.setupTable(); E.time = 0;
const sc = Math.sqrt(lo / Math.max(1e-6, E.tempKin())); for (let i = 0; i < E.N; i++) { E.vx[i] *= sc; E.vy[i] *= sc; if (E.om) E.om[i] *= sc; }
let micT = lo, ema = null, peak = 0, peakAt = 0; const rows = [];
const dtR = 0.1, simPer = G.D / 30 * dtR, nst = Math.round(simPer / E.p.dt);
for (let k = 0; k < 300; k++) {
  const t = k * dtR, x = S(t), target = lo + (0.05 + 0.9 * x) * (hi - lo);
  micT += (1 - Math.exp(-dtR / (target > micT ? 0.4 : 2.5))) * (target - micT);
  E.p.T = micT; E.setupTable();
  if (AF) { const want = Math.round(AF * Math.min(1, t / 25)); let have = 0; for (let i = 0; i < E.N; i++) if (E.type[i] === 3) have++; while (have < want) { const j = Math.floor(Math.random() * E.N); if (E.type[j] === 7) { E.type[j] = 3; have++; } } }
  for (let s = 0; s < nst; s++) E.step();
  const v = G.val(E); ema = ema === null ? v : ema + (1 - Math.exp(-simPer / 2.0)) * (v - ema);
  if (ema > peak) { peak = ema; peakAt = t; }
  if (k % 30 === 29) rows.push(`${(t + dtR).toFixed(0)}s T=${micT.toFixed(3)} v=${ema.toFixed(2)}`);
}
console.log(`${game} ${strat} seed ${seed} af ${AF}: peak ${peak.toFixed(3)} at ${peakAt.toFixed(1)}s | ${rows.join(' | ')}`);

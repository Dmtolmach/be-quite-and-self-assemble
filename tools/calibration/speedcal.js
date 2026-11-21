// Speed run calibration: game seconds until the smoothed score reaches a target and stays there for HOLD s.
// usage: node speedcal.js ice|demix|gel target strategy seed
const fs = require('fs'); eval(fs.readFileSync(__dirname + '/../../src/engine.js', 'utf8') + ';global.MDEngine=MDEngine;');
const [game, TGT, strat, seed] = [process.argv[2], +process.argv[3], process.argv[4], +(process.argv[5] || 1)]; const HOLD = 1.5, MAXS = +(process.env.MAXS || 60);
const G = {
  ice: { range: [0.02, 0.30], D: 150, prm: { system: 'ice', nSide: 36, boxL: 36, rho: 0.6, dt: 0.01, ordered: false, nSalt: 0, mbEps: 1, sigSalt: 1.4, epsSalt: 1.0 }, preT: 0.35, pre: 300, val: (E) => E.iceStats().ice },
  demix: { range: [0.02, 1.0], D: 90, prm: { system: 'demix', nSide: 36, boxL: 36, rho: 0.6, dt: 0.005, ordered: false, xC: 0.5, demixStripes: 4 }, pre: 0, val: (E) => E.mixing(2, 4, 1.5).s },
  gel: { range: [0.6, 7.0], D: 90, prm: { system: 'crypt', nSide: 48, boxL: 48, rho: 0.6, dt: 0.005, ordered: true, nMol: 35, epsXX: 5, cryptSeq: 'PPPPPXXXPPXXXXPPXXXXXPPXXXXPPXXXPPPPP', epsGo: 2.5, goCut: 1.6, epsB: 0, sequence: 'HPPH' }, preT: 0.6, pre: 200, val: (E) => E.gelPath(1.5, 2).len },
}[game];
const [lo, hi] = G.range;
// strategies: x(t) in 0..1 (0 = silence = coldest); cX = constant, rA_B_D = ramp from A to B over D s then hold
const S = strat[0] === 'c' ? () => +strat.slice(1) : strat[0] === 'r' ? ((a, b, d) => (t) => a + (b - a) * Math.min(1, t / d))(...strat.slice(1).split('_').map(Number)) : null;
const E = new MDEngine(Object.assign({ T: lo, thermostat: 'langevin', gamma: 1, tau: 0.5, seed, nDrug: 0, epsSS: 0 }, G.prm));
if (G.pre) { E.p.T = G.preT; E.setupTable(); for (let k = 0; k < G.pre; k++) E.step(); }
E.p.T = lo; E.setupTable(); E.time = 0;
const sc = Math.sqrt(lo / Math.max(1e-6, E.tempKin())); for (let i = 0; i < E.N; i++) { E.vx[i] *= sc; E.vy[i] *= sc; if (E.om) E.om[i] *= sc; }
let micT = lo, ema = null, since = -1, done = -1, peak = 0;
const dtR = 0.1, simPer = G.D / 30 * dtR, nst = Math.round(simPer / E.p.dt);
for (let k = 0; k < MAXS / dtR; k++) {
  const t = k * dtR, x = S(t), target = lo + x * (hi - lo);
  micT += (1 - Math.exp(-dtR / (target > micT ? 0.4 : 2.5))) * (target - micT);
  E.p.T = micT; E.setupTable();
  for (let s = 0; s < nst; s++) E.step();
  const v = G.val(E); ema = ema === null ? v : ema + (1 - Math.exp(-simPer / 2.0)) * (v - ema); peak = Math.max(peak, ema);
  if (ema >= TGT) { if (since < 0) since = t + dtR; if (t + dtR - since >= HOLD) { done = since; break; } } else since = -1;
}
console.log(`${game} ${TGT} ${strat} seed ${seed}: ${done < 0 ? 'not reached (peak ' + peak.toFixed(2) + ')' : done.toFixed(1) + ' s'}`);

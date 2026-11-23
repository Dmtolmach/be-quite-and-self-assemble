// usage: node geltarget.js seed heatX heatSeconds coolX  -> writes gel_<...>.json with the best snapshot (encode it into GEL_AIM in src/app/10-preview-film.js)
// search for a gel snapshot with a long path: heat-then-cool runs like the game, keep the best snapshot
const fs = require('fs'); eval(fs.readFileSync(__dirname + '/../../src/engine.js', 'utf8') + ';global.MDEngine=MDEngine;');
const [seed, heatX, heatS, coolX] = [+process.argv[2], +process.argv[3], +process.argv[4], +process.argv[5]];
const prm = { system: 'crypt', nSide: 48, boxL: 48, rho: 0.6, dt: 0.005, ordered: true, nMol: 36, epsXX: 5, cryptSeq: 'PPPPPXXXPPXXXXPPXXXXXPPXXXXPPXXXPPPPP', epsGo: 2.5, goCut: 1.6, epsB: 0 };
const lo = 0.6, hi = 7.0;
const E = new MDEngine(Object.assign({ T: 0.6, thermostat: 'langevin', gamma: 1, tau: 0.5, seed, nDrug: 0, epsSS: 0 }, prm));
E.setupTable(); for (let k = 0; k < 200; k++) E.step();
let micT = lo, best = 0, snap = null, bestT = 0; const dtR = 0.1, nst = Math.round(90 / 30 * dtR / E.p.dt);
for (let k = 0; k < 300; k++) { const t = k * dtR, x = t < heatS ? heatX : coolX, target = lo + (0.05 + 0.9 * x) * (hi - lo);
  micT += (1 - Math.exp(-dtR / (target > micT ? 0.4 : 2.5))) * (target - micT); E.p.T = micT; E.setupTable();
  for (let s = 0; s < nst; s++) E.step();
  if (k % 5 === 4) { const g = E.gelPath(1.5, 2); if (g.len > best) { best = g.len; bestT = t; snap = { x: Array.from(E.x.subarray(0, E.N), (v) => +v.toFixed(3)), y: Array.from(E.y.subarray(0, E.N), (v) => +v.toFixed(3)), N: E.N, L: E.L, nMol: E.nMol, Lc: E.Lc }; } } }
console.log(seed, heatX, heatS, coolX, 'best', best.toFixed(0), 'at', bestT.toFixed(1));
fs.writeFileSync(`gel_${seed}_${heatX}_${heatS}_${coolX}.json`, JSON.stringify({ best, snap }));

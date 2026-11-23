// usage: node gelage.js seed heatX heatSeconds coolX [duration=120] [cycle=0]  (x = noise level 0..1 as in gamecal.js; writes the gel path every second)
// gel speed-run question: after heat-then-cool, does the strand get shorter (or less likely to reach the goal) the longer you wait?
// plays the gel game headless like geltarget.js, for 120 s of game time, and logs the gel path every second
const fs = require('fs'); eval(fs.readFileSync(__dirname + '/../../src/engine.js', 'utf8') + ';global.MDEngine=MDEngine;');
const [seed, heatX, heatS, coolX, dur, cycle] = [+process.argv[2], +process.argv[3], +process.argv[4], +process.argv[5], +(process.argv[6] || 120), +(process.argv[7] || 0)]; // cycle > 0: heat again every `cycle` s
const prm = { system: 'crypt', nSide: 48, boxL: 48, rho: 0.6, dt: 0.005, ordered: true, nMol: 36, epsXX: 5, cryptSeq: 'PPPPPXXXPPXXXXPPXXXXXPPXXXXPPXXXPPPPP', epsGo: 2.5, goCut: 1.6, epsB: 0 };
const lo = 0.6, hi = 7.0;
const E = new MDEngine(Object.assign({ T: 0.6, thermostat: 'langevin', gamma: 1, tau: 0.5, seed, nDrug: 0, epsSS: 0 }, prm));
E.setupTable(); for (let k = 0; k < 200; k++) E.step();
let micT = lo; const dtR = 0.1, nst = Math.round(90 / 30 * dtR / E.p.dt), out = [];
for (let k = 0; k < dur / dtR; k++) { const t = k * dtR, tc = cycle > 0 ? t % cycle : t, x = tc < heatS ? heatX : coolX, target = lo + (0.05 + 0.9 * x) * (hi - lo);
  micT += (1 - Math.exp(-dtR / (target > micT ? 0.4 : 2.5))) * (target - micT); E.p.T = micT; E.setupTable();
  for (let s = 0; s < nst; s++) E.step();
  if (k % 10 === 9) { const g = E.gelPath(1.5, 2); out.push(+g.len.toFixed(1)); } }
fs.writeFileSync(`${process.env.OUT || '.'}/age_${seed}_${heatX}_${heatS}_${coolX}_${cycle}.json`, JSON.stringify(out));
console.log(seed, heatX, heatS, coolX, 'done');

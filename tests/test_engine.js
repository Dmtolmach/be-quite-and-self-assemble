// Physics smoke test (node, no browser): every system builds, runs 400 steps and stays finite.
// node tests/test_engine.js
const fs = require('fs'), path = require('path');
const MDEngine = (() => { const m = { exports: {} }; new Function('module', fs.readFileSync(path.join(__dirname, '..', 'src', 'engine.js'), 'utf8'))(m); return m.exports; })();
const SYS = {
  ice: { system: 'ice', nSide: 24, boxL: 24, rho: 0.6, dt: 0.01, T: 0.2 },
  demix: { system: 'demix', nSide: 24, boxL: 24, rho: 0.6, dt: 0.005, T: 0.5, xC: 0.5, demixStripes: 4 },
  dumbbell: { system: 'dumbbell', nSide: 24, boxL: 24, rho: 0.6, dt: 0.005, T: 0.6, nMol: 60 },
  drug: { system: 'dumbbell', nSide: 32, boxL: 32, rho: 0.6, dt: 0.005, T: 0.5, nMol: 120, nDrug: 12, drugPerMic: 3, extraTails: 3, epsDB: 2.5 },
  polymer: { system: 'polymer', nSide: 24, boxL: 24, rho: 0.6, dt: 0.005, T: 0.6 },
  crypt: { system: 'crypt', nSide: 32, boxL: 32, rho: 0.6, dt: 0.005, T: 1.0, nMol: 10, epsXX: 5, cryptSeq: 'PPPPPXXXPPXXXXPPXXXXXPPXXXXPPXXXPPPPP', epsGo: 2.5, goCut: 1.6 },
  lcst: { system: 'lcst', nSide: 24, boxL: 24, rho: 0.6, dt: 0.005, T: 0.6 },
  mbpoly: { system: 'mbpoly', nSide: 24, boxL: 24, rho: 0.6, dt: 0.01, T: 0.3 },
};
const bad = [];
for (const [name, prm] of Object.entries(SYS)) {
  try {
    const E = new MDEngine(Object.assign({ thermostat: 'langevin', gamma: 1, tau: 0.5, seed: 1, ordered: false }, prm)); E.setupTable();
    for (let k = 0; k < 400; k++) E.step();
    let ok = Number.isFinite(E.tempKin()); for (let i = 0; i < E.N && ok; i++) ok = Number.isFinite(E.x[i]) && Number.isFinite(E.y[i]);
    if (!ok) bad.push(`${name}: positions or temperature not finite`); else if (E.tempKin() > 50 * prm.T + 5) bad.push(`${name}: blew up, T=${E.tempKin().toFixed(2)}`);
  } catch (e) { bad.push(`${name}: ${e.message}`); }
}
console.log((bad.length ? 'FAIL' : 'PASS') + ' engine: ' + Object.keys(SYS).length + ' systems' + (bad.length ? '' : ' run and stay finite')); bad.forEach((b) => console.log('     ', b));
process.exit(bad.length ? 1 : 0);

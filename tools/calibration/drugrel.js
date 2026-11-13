const fs = require('fs'); eval(fs.readFileSync(__dirname + '/../../src/engine.js', 'utf8') + ';global.MDEngine=MDEngine;');
const T=+process.argv[2], eDB=+process.argv[3]||2.5;
const E = new MDEngine({ system: 'dumbbell', nSide: 48, boxL: 48, rho: 0.6, dt: 0.005, T: 0.4, ordered: true, nMol: Math.round(0.34 * 48 * 48 / 2), thermostat: 'langevin', gamma: 1, tau: 0.5, seed:1,
  epsAA: 0, epsSS: 0, epsAS: 0, epsBB: 2.5, sigA: 1.0, sigB: 1, nDrug:30, drugRow:true, drugPerMic: 3, extraTails: 3, preSteps: 1000, epsDB: eDB });
E.setupTable(); for (let k = 0; k < 1000; k++) E.step(); E.p.T=T; E.setupTable();
const o=[]; for(let t=1;t<=12;t++){ for(let k=0;k<200;k++)E.step(); const r=E.drugStats(1.5,2); o.push(t+'τ:'+(100*r.released/r.n).toFixed(0)); } console.log('T',T,'eDB',eDB,o.join(' '));

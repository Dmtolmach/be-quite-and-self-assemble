  // ---- one definition per system ----
  const SYS = {
    brush: { scan: [0.4, 1.0], conc: 480, min: 120, max: 900, count: true, rebuildConc: true, cold: 0.5, hot: 0.7, start: 0.5, chainLen: 10, kBend: 1.0,
      trange: [0.4, 1.0], tstep: 0.01, dt: 0.005, preT: 'set', concLab: 'Droplet size, liquid beads (rebuilds on release)',
      plotLab: 'Liquid contacts with teal (water-loving) beads', plotMax: 100,
      legend: [['tail', 'Water-fearing bead'], ['head', 'Water-loving bead'], ['mixS', 'Liquid']] },
    mbpoly: { scan: [0.14, 0.40], conc: 60, min: 1, max: 150, count: true, cold: 0.16, hot: 0.34, start: 0.34, ordT: 0.22, box: 36, chainLen: 1, lenMin: 1, epsPP: 0.1, epsH: 1.0, epsW: 0.4, gamma: 0.1,
      trange: [0.12, 0.40], tstep: 0.005, rho: 0.85, dt: 0.01, preT: 0.35, concLab: 'Number of nonpolar solutes',
      plotLab: 'Fraction of solutes in clusters of 3 or more', hl: 'Highlight clustered solutes',
      legend: [['poly', 'Particle'], ['cryst', 'Particle in cluster'], ['solv', 'Water']] },
    plates: { scan: [0.14, 0.40], conc: 0, min: 0, max: 1, count: true, cold: 0.16, hot: 0.34, start: 0.18, ordT: 0.18, box: 36, epsH: 0.6, gamma: 0.1,
      trange: [0.12, 0.40], tstep: 0.005, rho: 0.85, dt: 0.01, concLab: '', plotMax: 12,
      plotLab: 'Water molecules in the gap between the plates', hl: '',
      legend: [['poly', 'Plate'], ['cold', 'Water at plate'], ['solv', 'Water']] },
    ice: { scan: [0.10, 0.30], conc: 0, min: 0, max: 100, count: true, rebuildConc: true, cold: 0.12, hot: 0.26, start: 0.26, ordT: 0.08, box: 36,
      trange: [0.08, 0.36], tstep: 0.005, dt: 0.01, preT: 0.35, concLab: 'Antifreeze particles',
      plotLab: 'Fraction of molecules in ice', hl: 'Highlight ice (blue)',
      legend: [['cold', 'Ice'], ['solv', 'Liquid water'], ['tail', 'Antifreeze particle'], ...(/[?&]debug(=1)?\b/.test(location.search) || location.hash === '#debug' ? [['cryst', 'Ice wall']] : [])] },
    dumbbell: { scan: [0.4, 2.0], conc: 50, min: 2, max: 60, cold: 0.5, hot: 2.0, start: 2.0, concLab: 'Dumbbell concentration (fraction of beads)',
      plotLab: 'Fraction of molecules in aggregates (bilayers, micelles)', hl: 'Color by aggregate',
      legend: [['head', 'Head'], ['tail', 'Tail'], ['solv', 'Solvent']] },
    polymer: { scan: [1.0, 2.5], conc: 40, min: 2, max: 95, cold: 1.2, hot: 2.0, start: 2.2, chainLen: 12, epsPP: 1.75, concLab: 'Polymer concentration (fraction of beads)',
      plotLab: 'Crystalline fraction of polymer beads', hl: 'Highlight crystallites',
      legend: [['poly', 'Polymer'], ['cryst', 'Crystal'], ['solv', 'Solvent']] },
    diblock: { scan: [0.6, 2.4], conc: 70, min: 5, max: 95, cold: 0.8, hot: 2.2, start: 2.2, chainLen: 16, concLab: 'Copolymer concentration (fraction of beads)',
      plotLab: 'A–B segregation s (0 mixed, 1 separated)',
      legend: [['head', 'A block'], ['tail', 'B block'], ['solv', 'Solvent']] },
    demix: { scan: [0.6, 2.2], conc: 50, min: 5, max: 95, cold: 0.8, hot: 2.0, start: 2.0, concLab: 'Fraction of liquid C',
      plotLab: 'Demixing s (0 mixed, 1 separated)',
      legend: [['mixS', 'Liquid S'], ['mixC', 'Liquid C']] },
    crypt: { scan: [0.8, 6.0], conc: 30, min: 2, max: 40, count: true, cold: 1.0, hot: 2.2, start: 1.0, ordT: 0.6, box: 48, trange: [0.6, 7.0], concLab: 'Number of proteins',
      plotLab: 'Proteins stuck in clumps (sticky beads touching another protein)', hl: 'Color proteins by clump',
      legend: [['tail', 'Sticky bead'], ['head', 'Protein bead'], ['solv', 'Solvent']] },
    hp: { scan: [0.8, 2.5], conc: 1, min: 1, max: 8, count: true, cold: 1.0, hot: 2.3, start: 2.3, box: 36, concLab: 'Number of chains',
      plotLab: 'Buried hydrophobic beads (H with ≥ 2 H neighbours)',
      legend: [['tail', 'Hydrophobic'], ['head', 'Polar'], ['solv', 'Solvent']] },
    lcst: { scan: [0.5, 2.3], conc: 5, min: 1, max: 40, cold: 0.6, hot: 2.2, start: 2.2, chainLen: 20, epsPP: 1.0, preT: 3.0, concLab: 'Polymer concentration (fraction of beads)',
      plotLab: 'Polymer self-contact fraction (P–P share of polymer contacts)',
      legend: [['poly', 'Polymer'], ['solv', 'Solvent']] }
  };

  // ---- analysis per system: returns plotted value and six readouts ----
  function report() {
    const p = eng.p, rg = () => eng.meanRg().toFixed(2) + ' σ';
    switch (sys) {
      case 'dumbbell': { const c = eng.clusters(RCUT, MIN_AGG, 1); an = c;
        return { v: c.fracAgg, cells: [['Aggregated', pct(c.fracAgg)], ['Aggregates', c.nAgg], ['Largest', c.largest],
          ['Mean N<sub>agg</sub>', c.nAgg ? c.meanAgg.toFixed(1) : '–'], ['Dumbbells', eng.nMol],
          ['Free, per σ²', (eng.nMol * (1 - c.fracAgg) / (eng.L * eng.L)).toFixed(4)]] }; }
      case 'polymer': { const k = eng.crystal(1.45, 4, 10); an = k;
        return { v: k.frac, cells: [['Crystalline', pct(k.frac)], ['Crystallites', k.nCl], ['Largest (beads)', k.largest >= 10 ? k.largest : '–'],
          ['Mean size', k.nCl ? k.meanCl.toFixed(0) : '–'], ['Chains', eng.nMol], ['Mean R<sub>g</sub>', rg()]] }; }
      case 'diblock': { const m = eng.mixing(0, 1, 1.5, true);
        return { v: m.s, cells: [['Segregation s', m.s.toFixed(2)], ['A–B contacts / bead', m.unlikePerBead.toFixed(2)], ['Mean R<sub>g</sub>', rg()],
          ['Chains', eng.nMol], ['Block f<sub>A</sub>', (eng.seq.filter((t) => t === 0).length / eng.Lc).toFixed(2)], ['Chain length', eng.Lc]] }; }
      case 'demix': { const m = eng.mixing(2, 4, 1.5);
        return { v: m.s, cells: [['Demixing s', m.s.toFixed(2)], ['Interface beads', pct(m.ifaceFrac)],
          ['Domain width (est.)', (2 * SPACING / Math.max(m.ifaceFrac, 0.02)).toFixed(1) + ' σ'],
          ['Liquid C', pct(m.nb / Math.max(1, m.na + m.nb))], ['Unlike contacts / bead', m.unlikePerBead.toFixed(2)], ['Beads', eng.N]] }; }
      case 'crypt': { const c = eng.cryptStats(1.5); an = c; if (appMode === 'game' && gameSel && gameSel.id === 'gel') gelShow = eng.gelPath(1.5, 2);
        return { v: c.agg, cells: [['Proteins in clumps', pct(c.agg)], ['Largest clump (proteins)', c.largest], ['Folded (native contacts)', pct(c.folded)],
          ['Hidden beads exposed', pct(c.exposed)], ['Sticky contacts between proteins', c.xx], ['Proteins', eng.nMol]] }; }
      case 'hp': { const h = eng.hpStats(1.5);
        return { v: h.buried, cells: [['Buried H', pct(h.buried)], ['H–H contacts / chain', h.intra.toFixed(1)], ['Mean R<sub>g</sub>', rg()],
          ['Chains', eng.nMol], ['Chain length', eng.Lc], ['Interchain H–H', h.inter]] }; }
      case 'brush': { const b = eng.brushStats();
        const teal = p.invert ? b.wEnd : b.wMid;
        return { v: teal, cells: [['Contact angle', b.theta.toFixed(0) + '°'], ['Footprint', b.width.toFixed(1) + ' σ'], ['Liquid inside brush', (100 * b.inside).toFixed(1) + '%'],
          ['Brush order', b.order.toFixed(2)], ['Liquid contacts: orange / teal', (p.invert ? b.wMid : b.wEnd) + ' / ' + (p.invert ? b.wEnd : b.wMid)], ['Droplet beads', b.liquid]] }; }
      case 'plates': { const q = eng.plateStats(), sh = eng.shellStats(1.15); shellMask = sh.mask.slice(0, eng.N); an = null;
        if (eng2) { const q2 = eng2.plateStats(), s2 = eng2.shellStats(1.15); shellMask2 = s2.mask.slice(0, eng2.N);
          const two = (a, b) => `${a} | ${b}`;
          return { v: q.gap, cells: [['Water in the gap (left | right)', two(q2.gap, q.gap)], ['Plate distance', two(q2.sep.toFixed(1), q.sep.toFixed(1)) + ' σ'],
            ['Water touching plates', two(s2.shell, sh.shell)], ['H-bonds / touching water', two(s2.hbShell.toFixed(1), sh.hbShell.toFixed(1))],
            ['H-bonds / bulk water', two(s2.hbBulk.toFixed(1), sh.hbBulk.toFixed(1))], ['Right-hand surface', T(plateKind().name)]] }; }
        return { v: q.gap, cells: [['Water in the gap', q.gap], ['Plate distance', q.sep.toFixed(2) + ' σ'], ['Water touching plates', sh.shell],
          ['H-bonds / touching water', sh.hbShell.toFixed(2)], ['H-bonds / bulk water', sh.hbBulk.toFixed(2)], ['Plate angle', q.ang.toFixed(0) + '°']] }; }
      case 'mbpoly': { const rc = 1.3 * p.sigP, m = eng.mbStats(rc), sh = eng.shellStats(0.5 * (p.sigP + 0.7) + 0.3); shellMask = sh.mask;
        if (eng.Lc === 1) { const c = eng.clusters(rc, 3, 3); an = c;
          return { v: c.fracAgg, cells: [['In clusters (≥ 3)', pct(c.fracAgg)], ['Largest cluster', c.largest], ['Shell water', sh.shell],
            ['H-bonds / shell water', sh.hbShell.toFixed(2)], ['H-bonds / bulk water', sh.hbBulk.toFixed(2)], ['Solutes', eng.nMol]] }; }
        an = null;
        return { v: m.f, cells: [['Self-contact', m.f.toFixed(2)], ['Water contacts / bead', m.waterPerBead.toFixed(2)], ['Mean R<sub>g</sub>', rg()],
          ['H-bonds / water', m.hbPerWater.toFixed(2)], ['Chains', eng.nMol], ['Chain length', eng.Lc]] }; }
      case 'ice': { const q = eng.iceStats(); an = q;
        return { v: q.ice, cells: [['Ice', pct(q.ice)], ['H-bonds / molecule', q.hbPerWater.toFixed(2)], ['With 3 H-bonds', pct(q.full)],
          ['Molecules', eng.N], ['Energy / molecule', (eng.U / eng.N).toFixed(2)], ['Density', (eng.N / (eng.L * eng.L)).toFixed(2) + ' / σ²']] }; }
      case 'lcst': { const c = eng.lcstStats(1.5), r = eng.meanRg(); an = null;
        return { v: c.f, cells: [['Self-contact', c.f.toFixed(2)], ['Mean R<sub>g</sub>', r.toFixed(2) + ' σ'], ['Solvent contacts / bead', c.psPerBead.toFixed(2)],
          ['Chains', eng.nMol], ['Chain length', eng.Lc], ['R<sub>g</sub> vs rebuild', (r / rg0).toFixed(2) + '×']] }; }
    }
  }
  const labCache = [];
  function showReport(rep) {
    rep.cells.forEach(([lab, val], i) => {
      if (labCache[i] !== LANG + lab) { $('l' + i).innerHTML = T(lab); labCache[i] = LANG + lab; }
      $('r' + i).textContent = val;
    });
  }

  // ---- building ----
  const cleanSeq = () => { let q = $('seq').value.toUpperCase().replace(/[^HP]/g, '').slice(0, 60); return q.length >= 3 ? q : 'HPHPPHHPHPPHPHHPPHPH'; };
  function chainLength() {
    if (sys === 'dumbbell') return 2;
    if (sys === 'demix') return 1;
    if (sys === 'hp') return cleanSeq().length;
    if (sys === 'crypt') return 37;
    if (sys === 'mbpoly') return Math.max(1, +$('chainLen').value);
    if (sys === 'brush') return 0; // not used: chain count comes from the grafting
    return Math.max(sys === 'diblock' ? 4 : 3, +$('chainLen').value);
  }
  function build(opts) {
    opts = opts || {};
    if (game && !opts.game) { endGame(null); }
    if (!opts.game && !game) gameRange = null;
    if (!opts.keepThermo) { if (scan) stopScan(false); thermoReset(); }
    const S = SYS[sys], n = +$('size').value, Lc = chainLength(), v = +$('conc').value;
    const nMol = sys === 'demix' || sys === 'brush' ? 0 : S.count ? v : Math.round(v / 100 * n * n / Lc);
    const prm = { system: sys, nSide: n, nMol, rho: S.rho || 0.6, dt: S.dt || 0.005, T: tset,
      mbEps: $('mbHB').checked ? 1 : 0, epsPW: sys === 'plates' ? plateKind().epsPW : 0, plateHB: sys === 'plates' ? plateKind().plateHB : 0, sigP: sys === 'plates' ? 1.0 : 1.5,
      plateLen: +$('plateLen').value, plateGap: +$('plateGap').value, plateFix: $('plateHold').checked,
      ordered: sys === 'plates' ? true : opts.ordered !== undefined ? opts.ordered : isOrdered(), demixStripes: 4, bilayerSpacing: 1.15,
      boxL: n, gravity: +$('grav').value, graftSpacing: +$('graft').value, epsCC: +$('epsCC').value, epsQL: +$('epsQL').value, epsHL: +$('epsHL').value, invert: $('bInvert').checked, nEnd: +$('nEnd').value, nWater: v,
      thermostat: $('thermo').value, gamma: +$('gamma').value, tau: +$('tau').value, seed: (battle && battle.seed) || (Math.random() * 1e9) | 0,
      epsSS: 0, epsAS: +$('epsAS').value, epsBB: +$('epsBB').value, sigA: +$('sigA').value, sigB: 1,
      nSalt: sys === 'ice' ? v : 0, iceWall: sys === 'ice' && !opts.game && $('iceWall').checked, epsPP: +$('epsPP').value, epsH: (sys === 'mbpoly' || sys === 'plates') ? +$('epsH').value : 0, epsW: sys === 'mbpoly' ? +$('epsW').value : 0, kBend: sys === 'plates' ? 150 : +$('kBend').value, chainLen: +$('chainLen').value,
      fA: +$('fA').value, epsAB: +$('epsAB').value, epsSC: +$('epsSC').value, xC: v / 100,
      epsHH: +$('epsHH').value, sequence: cleanSeq(), cryptSeq: 'PPPPPXXXPPXXXXPPXXXXXPPXXXXPPXXXPPPPP', epsGo: 2.5, goCut: 1.6, epsXX: +$('epsXX').value, epsB: 0 };
    const gcf = opts.game ? gameCfg() : null; if (gcf && gcf.prm) Object.assign(prm, gcf.prm); else prm.nDrug = 0;
    prm.baro = baroOn(opts); prm.P0 = null; // target set from the pressure the box has after it settles
    eng = new MDEngine(prm); baroShown = null; follow = null;
    eng2 = sys === 'plates' && $('plateCompare').checked ? new MDEngine(Object.assign({}, prm, { epsPW: 0, plateHB: 0 })) : null;
    const ord = eng.p.ordered;
    if (ord || (sys !== 'dumbbell' && sys !== 'demix')) { // ordered: relax the built structure; disordered: melt the lattice
      eng.p.T = ord || S.preT === 'set' ? tset : S.preT !== undefined ? S.preT : 3.0; eng.setupTable();
      const pre = ord ? (prm.preSteps || 200) : 300;
      for (const E of eng2 ? [eng, eng2] : [eng]) {
        const h = E.p.epsH, hw = E.p.epsW; E.p.epsH = 0; E.p.epsW = 0; // no added hydrophobic attraction while the start is prepared, so solutes start apart
        E.p.T = eng.p.T; E.setupTable();
        for (let k = 0; k < pre; k++) E.step();
        E.p.epsH = h; E.p.epsW = hw; E.p.T = tset; E.setupTable(); E.time = 0;
        const sc = Math.sqrt(tset / Math.max(1e-6, E.tempKin())); // start at the set temperature
        for (let i = 0; i < E.N; i++) { E.vx[i] *= sc; E.vy[i] *= sc; E.om[i] *= sc; }
      }
    }
    hist.tset.length = hist.tkin.length = hist.frac.length = 0; tkinAvg = null;
    rg0 = Math.max(0.5, eng.meanRg());
    plotMax = S.plotMax || 1;
    if (sys === 'mbpoly') $('plotFlab').innerHTML = T(eng.Lc === 1 ? S.plotLab : 'Chain self-contact fraction (P–P share of chain contacts)');
    showReport(report());
    $('boxinfo').textContent = `L = ${eng.L.toFixed(1)}σ · ${eng.N} ` + T('beads'); concNote();
  }

  // ---- temperature control ----
  let tset = 2.0, mode = 'slider';
  const isPhone = matchMedia('(max-width: 700px)').matches || matchMedia('(pointer: coarse)').matches;
  function setT(v) {
    const [lo, hi] = curRange();
    tset = Math.max(lo, Math.min(hi, v));
    if (eng) { eng.p.T = tset + (coachReady && game ? game.bump || 0 : 0); if (eng.p.hotBand) eng.p.hotBand.Tout = coachReady && game ? toutOf(game, tset) : lo; }
    $('tset').textContent = $('tsetM').textContent = tset.toFixed((SYS[sys].tstep || 0.01) < 0.01 ? 3 : 2); $('tslider').value = $('tsliderM').value = tset;
    if (coachReady) tWordShow();
  }
  var coachReady = false, fcReady = false, gameLevel = 0, battle = null; // set once the game helpers and the cards below exist
  $('tslider').addEventListener('input', (e) => { if (scan) stopScan(false); if (mode === 'slider') setT(+e.target.value); });
  $('tsliderM').addEventListener('input', (e) => { if (scan) stopScan(false); if (mode === 'slider') setT(+e.target.value); });
  $('micM').addEventListener('click', () => setMode(mode === 'mic' ? 'slider' : 'mic'));
  $('quench').addEventListener('click', () => { if (scan) stopScan(false); if (mode === 'mic') setMode('slider'); setT(SYS[sys].cold); });
  $('melt').addEventListener('click', () => { if (scan) stopScan(false); if (mode === 'mic') setMode('slider'); setT(SYS[sys].hot); });
  $('pause').addEventListener('click', () => { running = !running; $('pause').textContent = T(running ? 'Pause' : 'Resume'); });


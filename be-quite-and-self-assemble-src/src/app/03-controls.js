  // ---- controls ----
  const bindRange = (id, fmt, apply) => { const el = $(id), o = $(id + 'O');
    const f = () => { o.textContent = fmt(+el.value); if (apply) apply(+el.value); }; el.addEventListener('input', f); f(); };
  const live = (key) => (v) => { if (eng) { eng.p[key] = v; eng.setupTable(); } };
  bindRange('epsBB', (v) => v.toFixed(2), live('epsBB'));
  bindRange('sigA', (v) => v.toFixed(2), live('sigA'));
  bindRange('epsAS', (v) => v.toFixed(2), live('epsAS'));
  bindRange('epsPP', (v) => v.toFixed(2), live('epsPP'));
  bindRange('epsW', (v) => v.toFixed(2), (v) => { if (eng && sys === 'mbpoly') { eng.p.epsW = v; eng.setupTable(); } });
  bindRange('epsH', (v) => v.toFixed(2), (v) => { if (eng && (sys === 'mbpoly' || sys === 'plates')) { eng.p.epsH = v; eng.setupTable(); if (eng2) { eng2.p.epsH = v; eng2.setupTable(); } } });
  bindRange('kBend', (v) => v.toFixed(1), (v) => { if (eng) eng.p.kBend = v; });
  bindRange('epsAB', (v) => v.toFixed(2), live('epsAB'));
  bindRange('epsSC', (v) => v.toFixed(2), live('epsSC'));
  bindRange('epsHH', (v) => v.toFixed(2), live('epsHH'));
  bindRange('fA', (v) => v.toFixed(2));
  bindRange('chainLen', (v) => String(v));
  $('fA').addEventListener('change', () => { if (sys === 'diblock') build(); });
  $('chainLen').addEventListener('change', () => {
    if (sys === 'mbpoly') { // chain length 1 = free solutes: allow many of them
      const c = $('conc'), free = +$('chainLen').value === 1, wasFree = +c.max > 6;
      if (free !== wasFree) { c.max = free ? 150 : 6; c.value = free ? 60 : 1; $('concO').textContent = c.value; }
      $('concLab').textContent = T(free ? 'Number of nonpolar solutes' : 'Number of chains');
      $('byCluster').closest('label').hidden = !free;
    }
    if (sys !== 'dumbbell' && sys !== 'demix' && sys !== 'hp') build(); });
  $('mbHB').addEventListener('change', (e) => { if (eng && eng.mb) eng.p.mbEps = e.target.checked ? 1 : 0; });
  function plateKind() { const v = $('plateKind').value; return v === 'hb' ? { epsPW: 0, plateHB: 1, name: 'Hydrogen-bonding' } : +v > 0 ? { epsPW: +v, plateHB: 0, name: 'Water-attracting' } : { epsPW: 0, plateHB: 0, name: 'Water-fearing' }; }
  $('epsXX').addEventListener('input', (e) => { $('epsXXO').textContent = (+e.target.value).toFixed(1); if (eng && sys === 'crypt') { eng.p.epsXX = +e.target.value; eng.setupTable(); } });
  $('plateKind').addEventListener('change', () => { if (eng && sys === 'plates') { const k = plateKind(); eng.p.epsPW = k.epsPW; eng.p.plateHB = k.plateHB; eng.setupTable(); } });
  $('plateCompare').addEventListener('change', () => { if (sys === 'plates') { $('plateHold').checked = true; build(); } });
  $('plateGap').addEventListener('change', () => { if (sys === 'plates') { $('plateHold').checked = true; build(); } });
  $('plateHold').addEventListener('change', (e) => { if (!eng || sys !== 'plates') return;
    for (const E of eng2 ? [eng, eng2] : [eng]) { const n2 = E.nMol * E.Lc;
      if (e.target.checked) { E.fixed = new Uint8Array(E.N); E.fixed.fill(1, 0, n2); E.nFixed = n2; for (let i = 0; i < n2; i++) { E.vx[i] = 0; E.vy[i] = 0; } }
      else { E.fixed = null; E.nFixed = 0; } } });
  $('plateLen').addEventListener('input', (e) => { $('plateLenO').textContent = e.target.value; });
  $('plateLen').addEventListener('change', () => { if (sys === 'plates') build(); });
  $('seqPreset').addEventListener('change', (e) => { if (e.target.value !== 'custom') { $('seq').value = e.target.value; build(); } else $('seq').focus(); });
  $('seq').addEventListener('input', () => { $('seqPreset').value = 'custom'; });
  $('seq').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); applySeq(); } });
  $('seqApply').addEventListener('click', applySeq);
  bindRange('epsQL', (v) => v.toFixed(2), live('epsQL'));
  bindRange('epsCC', (v) => v.toFixed(2), live('epsCC'));
  bindRange('epsHL', (v) => v.toFixed(2), live('epsHL'));
  bindRange('nEnd', (v) => String(v));
  bindRange('graft', (v) => v.toFixed(1));
  bindRange('grav', (v) => v.toFixed(3), (v) => { if (eng && eng.walls) eng.p.gravity = v; });
  $('graft').addEventListener('change', () => { if (sys === 'brush') build(); });
  $('nEnd').addEventListener('change', () => { if (sys === 'brush') build(); });
  $('bInvert').addEventListener('change', () => { if (sys === 'brush') build(); });
  function applySeq() {
    const q = $('seq').value.toUpperCase().replace(/[^HP]/g, '');
    if (q.length < 3 || q.length > 60) { $('seqNote').className = 'note err'; $('seqNote').textContent = T('The sequence needs 3–60 letters H or P; it has {n}.', { n: q.length }); return; }
    $('seq').value = q; $('seqNote').className = 'note'; $('seqNote').textContent = T('{n} beads, {h} hydrophobic. Applied.', { n: q.length, h: q.split('H').length - 1 });
    build();
  }


  $('spf').addEventListener('input', (e) => { if (e.isTrusted) $('autoSpf').checked = false; });
  bindRange('gamma', (v) => v.toFixed(2), (v) => { if (eng) eng.p.gamma = v; });
  bindRange('tau', (v) => v.toFixed(2), (v) => { if (eng) eng.p.tau = v; });
  bindRange('spf', (v) => String(v));
  const BUDGET0 = isPhone ? 9 : 12; let BUDGET_MS = BUDGET0, msPerStep = null; // raised to ~25 ms (about 30 fps) when one step costs more than 1.5 ms
  function autoSpeed(n, ms) {
    if (!$('autoSpf').checked || n < 1) return;
    const m = ms / n; msPerStep = msPerStep === null ? m : 0.9 * msPerStep + 0.1 * m;
    if (frame % 20 !== 0) return;
    BUDGET_MS = msPerStep > 1.5 ? 25 : BUDGET0;
    const want = Math.max(1, Math.min(60, Math.round(BUDGET_MS / msPerStep)));
    if (want !== n) { $('spf').value = want; $('spfO').textContent = want; }
  }
  let wake = null;
  async function keepAwake() { try { if (navigator.wakeLock && !wake && document.visibilityState === 'visible') { wake = await navigator.wakeLock.request('screen'); wake.addEventListener('release', () => { wake = null; }); } } catch (e) { wake = null; } }
  document.addEventListener('pointerdown', keepAwake, { once: true });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && running) keepAwake(); });

  // concentration: live where possible; rebuild when there is too little solvent left to insert chains
  function concNote() { if (!eng) return; const solv = eng.N - eng.Lc * eng.nMol, t = $('concNote');
    t.className = 'note';
    if (sys === 'ice') t.textContent = T('Particles twice the size of a water molecule that attract water but cannot join the ice. They lower the melting point; about 80 keep most of the water liquid even when cold. The box rebuilds when you change the number.');
    else if (sys === 'demix') t.textContent = T('Changes apply live: beads switch between S and C.');
    else if (sys === 'brush') t.textContent = T('{n} grafted chains of {l} beads; droplet of {w} liquid beads.', { n: eng.nMol, l: eng.Lc, w: eng.nWaterPlaced });
    else if (sys === 'dumbbell') t.textContent = T('{n} dumbbells, {s} solvent beads. Changes apply live.', { n: eng.nMol, s: solv });
    else t.textContent = T('{n} chains of {l} beads, {s} solvent beads. Changes apply live: chains are grown from solvent beads or turned back into solvent.', { n: eng.nMol, l: eng.Lc, s: solv }); }
  let rebuildTimer = null;
  bindRange('conc', (v) => (SYS[sys].count ? String(v) : v + '%'), (v) => {
    if (!eng) return;
    if (sys === 'demix') { eng.setComposition(v / 100); showReport(report()); concNote(); return; }
    if (SYS[sys].rebuildConc) { clearTimeout(rebuildTimer); rebuildTimer = setTimeout(build, 400); return; }
    const target = Math.min(Math.floor(eng.N / eng.Lc) - 2, SYS[sys].count ? v : Math.round(v / 100 * eng.N / eng.Lc));
    eng.setMolCount(target); showReport(report()); concNote();
    clearTimeout(rebuildTimer);
    if (eng.nMol < target) { $('concNote').textContent = T('Too little solvent left to insert chains live. Rebuilding at this concentration…'); rebuildTimer = setTimeout(build, 400); }
  });
  // the ice wall switches live: water molecules move onto the wall sites, or the wall turns back into water
  $('iceWall').addEventListener('change', () => {
    if (!eng || sys !== 'ice' || game || !eng.addIceWall) return;
    if ($('iceWall').checked) eng.addIceWall(); else eng.removeIceWall();
    eng.p.iceWall = $('iceWall').checked; eng.computeForces(); showReport(report());
  });
  // barostat: only for fully periodic systems, only while exploring (games and scans stay at constant volume)
  const BARO_SYS = 'dumbbell polymer diblock demix crypt hp lcst mbpoly ice'.split(' ');
  let baroShown = null;
  const baroOn = (opts) => $('baro').checked && BARO_SYS.includes(sys) && !(opts && opts.game) && appMode === 'explore';
  function p0Range(P) { const el = $('p0'), mx = P > 1.5 ? Math.ceil(2 * P) : P > 0.5 ? 3 : 1, st = mx / 400;
    el.min = 0; el.max = mx; el.step = +st.toPrecision(2); el.value = Math.max(0, P); $('p0O').textContent = (+el.value).toFixed(mx < 2 ? 3 : 2); }
  function baroUI() { const on = $('baro').checked && BARO_SYS.includes(sys);
    $('p0Row').hidden = $('baroNote').hidden = !on; if (eng && eng.p.P0 !== null && eng.p.P0 !== undefined) p0Range(eng.p.P0); baroNote(); }
  function baroNote() { if (!eng || $('baroNote').hidden) return;
    const P = eng.Pema !== undefined ? eng.Pema : eng.pressure(), rho = eng.N / (eng.L * eng.L);
    $('baroNote').textContent = !eng.p.baro ? T('The barostat runs in Explore only; games and energy scans keep the box size fixed.')
      : eng.p.P0 === null ? T('Measuring the pressure of the current state…')
      : T('Pressure {p} (target {t}) · density {d} / σ² · box {l} σ ({r}% of the start)', { p: P.toFixed(3), t: eng.p.P0.toFixed(3), d: rho.toFixed(3), l: eng.L.toFixed(1), r: (100 * eng.L / eng.L0).toFixed(0) }); }
  $('pitchP').addEventListener('change', () => { // pitch control needs the barostat
    if ($('pitchP').checked) { if (mode !== 'mic') setMode('mic'); $('baro').checked = true; if (eng) { eng.p.baro = baroOn(); pitchP = null; } baroUI(); pitchNoteShow(); }
    pitchBar(); if (!$('pitchP').checked) $('pitchNote').textContent = T('Loudness sets the temperature, pitch sets the pressure: a high voice squeezes the box, a low voice lets it expand.');
  });
  $('baro').addEventListener('change', () => { if (eng) { eng.p.baro = baroOn(); if (eng.p.baro) eng.p.P0 = null; } baroUI(); });
  $('p0').addEventListener('input', () => { const v = +$('p0').value; $('p0O').textContent = v.toFixed(+$('p0').max < 2 ? 3 : 2); if (eng && eng.p.baro) eng.p.P0 = v; });
  $('thermo').addEventListener('change', (e) => { if (eng) eng.p.thermostat = e.target.value;
    $('gammaRow').hidden = e.target.value !== 'langevin'; $('tauRow').hidden = e.target.value === 'langevin'; });
  $('reset').addEventListener('click', () => build());
  $('initState').addEventListener('change', () => { if (mode !== 'mic') setT(startT()); build(); });
  $('size').addEventListener('change', () => {
    if (sys === 'brush') { // brush box is n σ wide and tall; scale the droplet with the box area so it fits under the ceiling
      const n = +$('size').value, c = $('conc'), v = Math.max(+c.min, Math.min(+c.max, Math.round(480 * (n / 48) * (n / 48))));
      c.value = v; $('concO').textContent = String(v);
    }
    build();
  });


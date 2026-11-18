  // ---------- thermodynamics: temperature scans ----------
  const NB = 30; let scan = null, thermo = null;
  function thermoReset() {
    const [lo, hi] = SYS[sys].scan, mk = () => ({ sum: new Float64Array(NB), cnt: new Float64Array(NB), sumT: new Float64Array(NB) });
    thermo = { lo, hi, heat: null, cool: null, last: null, mk };
    $('thSummary').textContent = ''; drawThermo();
  }
  function energyRef() { // energy of the molecules (solvent-solvent background removed) per molecule bead, or of the whole system per bead
    if (eng.solvMask) { let nm = 0; for (let i = 0; i < eng.N; i++) if (!(eng.solvMask >> eng.type[i] & 1)) nm++; return { n: Math.max(1, nm), mol: true }; }
    return { n: eng.N, mol: false };
  }
  function startScan(dir) {
    stopScan(false); if (game) endGame(null); gameRange = null;
    if (mode === 'mic') setMode('slider');
    const [lo, hi] = SYS[sys].scan, tau = +$('scanTau').value;
    if (!thermo || thermo.lo !== lo) thermoReset();
    if (dir === 'heat') { setT(lo); build({ ordered: true, keepThermo: true }); }
    else setT(hi);
    thermo[dir] = thermo.mk(); thermo.last = dir;
    scan = { dir, Ta: dir === 'heat' ? lo : hi, Tb: dir === 'heat' ? hi : lo, tau, hold: dir === 'heat' ? 3 : 5, t0: eng.time, ref: energyRef() };
    $('thUnit').textContent = scan.ref.mol
      ? T('Numbers are per molecule bead, in the simulation’s own units. The solvent’s energy is left out: it changes smoothly and would hide the melting point. Entropy and free energy are counted from the start of the scan.')
      : T(sys === 'ice' ? 'Numbers are per water molecule, in the simulation’s own units. Entropy and free energy are counted from the start of the scan.' : 'Numbers are per bead, in the simulation’s own units. Entropy and free energy are counted from the start of the scan.');
    for (const id of ['scanHeat', 'scanCool']) $(id).disabled = true; $('scanStop').disabled = false;
  }
  function stopScan(finished) {
    if (!scan) return;
    const d = scan.dir; scan = null;
    for (const id of ['scanHeat', 'scanCool']) $(id).disabled = false; $('scanStop').disabled = true;
    $('scanStatus').textContent = finished ? T(d === 'heat' ? 'Heating scan finished.' : 'Cooling scan finished.') + (d === 'heat' ? ' ' + T('Now try Cooling scan: does the structure come back at the same temperature?') : '') : T('Scan stopped.');
    drawThermo();
  }
  function scanStep() {
    const s = scan, t = eng.time - s.t0;
    if (t < s.hold) { setT(s.Ta); $('scanStatus').textContent = T(s.dir === 'heat' ? 'Settling at T = {t} before heating starts…' : 'Settling at T = {t} before cooling starts…', { t: s.Ta.toFixed(2) }); return; }
    const f = (t - s.hold) / s.tau;
    if (f >= 1) { stopScan(true); return; }
    setT(s.Ta + (s.Tb - s.Ta) * f);
    $('scanStatus').textContent = T(s.dir === 'heat' ? 'Heating slowly from {a} to {b}: {p}% done, now T = {t}. Watch the molecules and the graphs.' : 'Cooling slowly from {a} to {b}: {p}% done, now T = {t}. Watch the molecules and the graphs.', { a: s.Ta.toFixed(2), b: s.Tb.toFixed(2), p: (100 * f).toFixed(0), t: tset.toFixed(2) });
  }
  function scanSample() {
    const s = scan; if (eng.time - s.t0 < s.hold) return;
    const d = thermo[s.dir], k = Math.max(0, Math.min(NB - 1, Math.floor((tset - thermo.lo) / (thermo.hi - thermo.lo) * NB)));
    d.sum[k] += (eng.U - (eng.Uss || 0)) / s.ref.n; d.cnt[k]++; d.sumT[k] += tset;
  }
  function binsOf(d) { const T = [], U = []; if (!d) return { T, U }; for (let k = 0; k < NB; k++) if (d.cnt[k] >= 3) { T.push(d.sumT[k] / d.cnt[k]); U.push(d.sum[k] / d.cnt[k]); } return { T, U }; }
  // U(T) -> smoothed U, C = dU/dT, S = int dU/T, F = U - TS; low/high-T branches (linear U fits) give F_low, F_high, crossing at T*.
  function analyzeScan(T, U) {
    const nb = T.length; if (nb < 8) return null;
    const Us = U.map((_, k) => { let s = 0, n = 0; for (let j = k - 1; j <= k + 1; j++) if (j >= 0 && j < nb) { s += U[j]; n++; } return s / n; });
    const C = Us.map((_, k) => { const i = Math.max(0, k - 1), j = Math.min(nb - 1, k + 1); return (Us[j] - Us[i]) / (T[j] - T[i]); });
    const S = [0]; for (let k = 1; k < nb; k++) S.push(S[k - 1] + (Us[k] - Us[k - 1]) * 2 / (T[k] + T[k - 1]));
    const F = Us.map((u, k) => u - T[k] * S[k]);
    let kp = 1; for (let k = 1; k < nb - 1; k++) if (C[k] > C[kp]) kp = k;
    const avg = (i0, i1) => { let s = 0; for (let k = i0; k <= i1; k++) s += C[k]; return s / (i1 - i0 + 1); }, base = Math.max(avg(0, 2), avg(nb - 3, nb - 1), 1e-6),
      significant = kp >= 3 && kp <= nb - 4 && C[kp] > 1.5 * base; // a peak well inside the range, clearly above both ends
    const m = Math.max(2, Math.round(0.15 * nb));
    const fit = (i0, i1) => { let n = 0, sx = 0, sy = 0, sxx = 0, sxy = 0; for (let k = i0; k <= i1; k++) { n++; sx += T[k]; sy += U[k]; sxx += T[k] * T[k]; sxy += T[k] * U[k]; }
      const b = (n * sxy - sx * sy) / Math.max(1e-12, n * sxx - sx * sx), a = (sy - b * sx) / n, kr = Math.round((i0 + i1) / 2); return { a, b, Tr: T[kr], Sr: S[kr] }; };
    const br = (f) => ({ U: (x) => f.a + f.b * x, S: (x) => f.Sr + f.b * Math.log(x / f.Tr), F: (x) => f.a + f.b * x - x * (f.Sr + f.b * Math.log(x / f.Tr)) });
    const L = br(fit(0, Math.max(1, kp - m))), H = br(fit(Math.min(nb - 2, kp + m), nb - 1));
    let Tx = null, prev = null;
    for (let q = 0; q <= 400; q++) { const x = T[0] + (T[nb - 1] - T[0]) * q / 400, d = H.F(x) - L.F(x);
      if (prev && Math.sign(d) !== Math.sign(prev.d) && d !== 0) { Tx = prev.x + (x - prev.x) * prev.d / (prev.d - d); break; } prev = { x, d }; }
    if (Tx !== null && (Tx < T[Math.max(0, kp - 2 * m)] || Tx > T[Math.min(nb - 1, kp + 2 * m)])) Tx = null; // crossing far from the peak: not a two-state transition
    const Tt = Tx !== null ? Tx : T[kp];
    return { T, U, Us, C, S, F, Tpeak: T[kp], significant, Tx, Tt, dU: H.U(Tt) - L.U(Tt), dS: H.S(Tt) - L.S(Tt), L, H };
  }
  function xyPlot(c, xlim, series, vlines, yfmt) {
    const g = c.getContext('2d'), w = c.width, h = c.height, padL = 46 * dpr, padB = 18 * dpr, padT = 6 * dpr, padR = 6 * dpr;
    g.clearRect(0, 0, w, h);
    let y0 = Infinity, y1 = -Infinity;
    for (const s of series) for (const v of s.y) if (isFinite(v)) { if (v < y0) y0 = v; if (v > y1) y1 = v; }
    g.font = `${10 * dpr}px ${css('--f-mono') || 'monospace'}`; g.fillStyle = colors.muted;
    if (!isFinite(y0)) { g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(T('no data yet'), w / 2, h / 2); return; }
    if (y1 - y0 < 1e-9) { y0 -= 0.5; y1 += 0.5; } const py = 0.08 * (y1 - y0); y0 -= py; y1 += py;
    const X = (x) => padL + (w - padL - padR) * (x - xlim[0]) / (xlim[1] - xlim[0]), Y = (y) => padT + (h - padT - padB) * (1 - (y - y0) / (y1 - y0));
    g.strokeStyle = colors.line; g.lineWidth = 1; g.textAlign = 'right'; g.textBaseline = 'middle';
    for (let q = 0; q <= 2; q++) { const v = y0 + (y1 - y0) * q / 2, yy = Math.round(Y(v)) + 0.5; g.beginPath(); g.moveTo(padL, yy); g.lineTo(w - padR, yy); g.stroke(); g.fillText(yfmt(v), padL - 5 * dpr, yy); }
    g.textAlign = 'center'; g.textBaseline = 'top';
    for (let q = 0; q <= 4; q++) { const v = xlim[0] + (xlim[1] - xlim[0]) * q / 4; g.fillText(v.toFixed(2), X(v), h - padB + 4 * dpr); }
    g.save(); g.beginPath(); g.rect(padL, padT, w - padL - padR, h - padT - padB); g.clip();
    for (const s of series) { if (s.x.length < 2) continue;
      g.strokeStyle = s.color; g.lineWidth = (s.w || 1.8) * dpr; g.setLineDash(s.dash ? [5 * dpr, 4 * dpr] : []); g.beginPath();
      s.x.forEach((x, k) => { const xx = X(x), yy = Y(s.y[k]); k ? g.lineTo(xx, yy) : g.moveTo(xx, yy); }); g.stroke(); g.setLineDash([]);
      if (s.dots) { g.fillStyle = s.color; s.x.forEach((x, k) => { g.beginPath(); g.arc(X(x), Y(s.y[k]), 2 * dpr, 0, 6.2832); g.fill(); }); } }
    for (const v of vlines) { g.strokeStyle = v.color; g.lineWidth = 1.5 * dpr; g.setLineDash([2 * dpr, 3 * dpr]); g.beginPath(); g.moveTo(X(v.x), padT); g.lineTo(X(v.x), h - padB); g.stroke(); g.setLineDash([]); }
    g.restore();
  }
  // on wide screens the scan graphs sit in the right column, so the box keeps its size and the graphs stay in view; the buttons stay under the box
  function wideUI() { return matchMedia('(min-width: 961px)').matches; }
  function placeGraphs() {
    const g = $('thGraphs'), side = false, gp = $('graphPanel'); // graphs stay under the box (the right column holds the system and microphone)
    gp.hidden = !side;
    const target = side ? gp : $('thermoPanel');
    if (g.parentElement !== target) { target.appendChild(g); if (typeof drawThermo === 'function') requestAnimationFrame(drawThermo); }
  }
  matchMedia('(min-width: 961px)').addEventListener('change', placeGraphs);
  function drawThermo() {
    if (!thermo) return;
    const xl = [thermo.lo, thermo.hi], res = {}, f3 = (v) => v.toFixed(Math.abs(v) < 10 ? 2 : 1);
    for (const d of ['heat', 'cool']) { const b = binsOf(thermo[d]); res[d] = { b, a: analyzeScan(b.T, b.U), col: d === 'heat' ? colors.hot : colors.cold }; }
    const lastD = (res.heat.a && res.heat.a.significant) || !res.cool.a ? (res.heat.a ? 'heat' : thermo.last) : 'cool', A = lastD ? res[lastD].a : null, grid = [];
    for (let q = 0; q <= 60; q++) grid.push(xl[0] + (xl[1] - xl[0]) * q / 60);
    const vl = []; for (const d of ['heat', 'cool']) { const a = res[d].a; if (a && a.significant) vl.push({ x: a.Tt, color: res[d].col }); }
    const br = (fn, col) => (A && A.significant ? [{ x: grid, y: grid.map((x) => A.L[fn](x)), color: colors.accent, dash: true, w: 1.4 }, { x: grid, y: grid.map((x) => A.H[fn](x)), color: colors.tail, dash: true, w: 1.4 }] : []);
    xyPlot(thU, xl, [...br('U'), ...['heat', 'cool'].map((d) => ({ x: res[d].b.T, y: res[d].b.U, color: res[d].col, dots: true, w: 1.2 }))], vl, f3);
    xyPlot(thC, xl, ['heat', 'cool'].filter((d) => res[d].a).map((d) => ({ x: res[d].a.T, y: res[d].a.C, color: res[d].col, w: 2 })), vl, f3);
    xyPlot(thS, xl, A ? [...br('S'), { x: A.T, y: A.S, color: res[lastD].col, w: 2 }] : [], vl, f3);
    xyPlot(thF, xl, A ? [...br('F'), { x: A.T, y: A.F, color: res[lastD].col, w: 2 }] : [], vl, f3);
    // summary
    const unit = scan ? (scan.ref.mol ? ' per molecule bead' : ' per bead') : '';
    const hA = res.heat.a, cA = res.cool.a, sum = $('thSummary');
    if (!hA && !cA) { sum.textContent = scan ? T('Measuring… the result appears here after the scan passes the melting point.') : ''; return; }
    const one = (a, name) => !a ? '' : a.significant
      ? `<b>${T(name)}</b>: ` + T('melting point T ≈ <b>{t}</b>. Breaking the structure costs energy (ΔU = {du}) but gains disorder (ΔS = {ds}). At the melting point the two balance: T × ΔS = {t} × {ds} ≈ {tds}, the same as ΔU.',
          { t: a.Tt.toFixed(2), du: a.dU.toFixed(2), ds: a.dS.toFixed(2), tds: (a.Tt * a.dS).toFixed(2) })
      : name === 'Cooling' && hA && hA.significant
        ? `<b>${T('Cooling')}</b>: ` + T('no clear peak: the structure did not have time to rebuild. Building takes longer than breaking; try the slow scan, or wait at a low temperature and watch it form.')
        : `<b>${T(name)}</b>: ` + T('no sharp melting point. This system changes gradually, like butter softening rather than ice melting.');
    let txt = [one(hA, 'Heating'), one(cA, 'Cooling')].filter(Boolean).join('<br>');
    if ((hA && hA.significant) || (cA && cA.significant)) txt += '<br>' + T('Colder than the melting point, energy wins and the structure stays; hotter, disorder wins and it falls apart.');
    if (hA && cA && hA.significant && cA.significant) txt += '<br>' + T('Heating and cooling give different answers ({a} and {b}). Breaking up and building take time, so a scan overshoots in both directions; the true melting point lies in between. While cooling, structures often don’t finish rebuilding before the scan ends, so graphs 3 and 4 use the heating scan. A slower scan brings the two answers closer.', { a: hA.Tt.toFixed(2), b: cA.Tt.toFixed(2) });
    sum.innerHTML = txt;
  }
  const thU = $('thU'), thC = $('thC'), thS = $('thS'), thF = $('thF');
  $('scanHeat').addEventListener('click', () => startScan('heat'));
  $('scanCool').addEventListener('click', () => startScan('cool'));
  $('scanStop').addEventListener('click', () => stopScan(false));

  function setSys(s) {
    if (s === sys || !SYS[s]) return;
    if (game) endGame(null); gameRange = null;
    sys = s; applySysUI();
    $('size').value = SYS[s].box ? String(SYS[s].box) : userBox;
    if (mode !== 'mic') setT(startT());
    build();
  }
  for (const b of pickers) b.addEventListener('click', () => setSys(b.dataset.pick));


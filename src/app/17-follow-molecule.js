  // ---------- follow one molecule: click or tap it to ring it and draw its recent path ----------
  let follow = null; // { a, b: bead range, cx, cy: unwrapped centre, trail: [[x, y]...], v: smoothed speed }
  const canFollow = () => eng && !eng.walls && !eng2 && appMode !== 'game'; // not in games
  const molRange = (i) => { const n = eng.Lc * eng.nMol; if (eng.Lc > 1 && i < n) { const m = Math.floor(i / eng.Lc); return [m * eng.Lc, (m + 1) * eng.Lc]; } return [i, i + 1]; };
  function molCentre(a, b) { const L = eng.L, x0 = eng.x[a], y0 = eng.y[a]; let sx = 0, sy = 0;
    for (let i = a; i < b; i++) { let dx = eng.x[i] - x0, dy = eng.y[i] - y0; dx -= L * Math.round(dx / L); dy -= L * Math.round(dy / L); sx += dx; sy += dy; }
    return [x0 + sx / (b - a), y0 + sy / (b - a)]; }
  function followTick() { // once per frame: extend the path with the centre's real (unwrapped) motion
    if (!follow) return; if (!canFollow() || follow.b > eng.N) { follow = null; return; }
    const [x, y] = molCentre(follow.a, follow.b), L = eng.L, px = ((follow.cx % L) + L) % L, py = ((follow.cy % L) + L) % L;
    let dx = x - px, dy = y - py; dx -= L * Math.round(dx / L); dy -= L * Math.round(dy / L); follow.cx += dx; follow.cy += dy;
    follow.trail.push([follow.cx, follow.cy]); if (follow.trail.length > 240) follow.trail.shift();
    let vx = 0, vy = 0; for (let i = follow.a; i < follow.b; i++) { vx += eng.vx[i]; vy += eng.vy[i]; } const n = follow.b - follow.a, v = Math.hypot(vx / n, vy / n);
    follow.v = follow.v === null ? v : 0.92 * follow.v + 0.08 * v; }
  function drawFollow(inLens) { // ring around the molecule and its path; in box coordinates of the current transform
    const s = cv.width / eng.L, L = eng.L, tr = follow.trail; if (!tr.length) return;
    const ox = Math.floor(follow.cx / L) * L, oy = Math.floor(follow.cy / L) * L; // shift the path so its end sits inside the box
    ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = colors.hot; ctx.lineWidth = Math.max(1.5, (inLens ? 0.09 : 0.14) * s);
    ctx.globalAlpha = 0.8; ctx.beginPath(); tr.forEach(([x, y], k) => { const X = (x - ox) * s, Y = (y - oy) * s; k ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); }); ctx.stroke(); ctx.globalAlpha = 1;
    ctx.lineWidth = Math.max(2, (inLens ? 0.08 : 0.16) * s); ctx.beginPath();
    for (let i = follow.a; i < follow.b; i++) { const X = eng.x[i] * s, Y = eng.y[i] * s; ctx.moveTo(X + 0.85 * s, Y); ctx.arc(X, Y, 0.85 * s, 0, 6.2832); } ctx.stroke();
  }
  function pickAt(ev) {
    if (!canFollow()) return; const r = cv.getBoundingClientRect(), Wc = cv.width, s = Wc / eng.L, L = eng.L;
    let px = (ev.clientX - r.left) * Wc / r.width, py = (ev.clientY - r.top) * cv.height / r.height;
    if (eng.L0 && (eng.p.baro || eng.L !== eng.L0)) { const k = eng.L / eng.L0; px = (px - Wc / 2) / k + Wc / 2; py = (py - cv.height / 2) / k + cv.height / 2; }
    const X = (((px / s) % L) + L) % L, Y = (((py / s) % L) + L) % L; let best = -1, bd = 1.44;
    for (let i = 0; i < eng.N; i++) { let dx = eng.x[i] - X, dy = eng.y[i] - Y; dx -= L * Math.round(dx / L); dy -= L * Math.round(dy / L); const d = dx * dx + dy * dy; if (d < bd) { bd = d; best = i; } }
    if (best < 0) { follow = null; return; }
    const [a, b] = molRange(best); if (follow && follow.a === a) { follow = null; return; }
    const [cx, cy] = molCentre(a, b); follow = { a, b, cx, cy, trail: [], v: null };
  }
  cv.addEventListener('click', pickAt);
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && follow && tourI < 0) follow = null; });
  let heatGlow = 0; // 0..1, eases towards 1 during a heat wave
  function heatBg() {
    const want = demoDrawing ? 0 : coachReady && game && game.bump ? 1 : 0; /* the preview film keeps the normal background */ heatGlow += (want - heatGlow) * (demoDrawing ? 0.25 : 0.06); if (heatGlow < 0.004) { heatGlow = 0; return colors.cell; }
    const a = hexRgb(colors.cell), b = hexRgb(isDark() ? '#5c2438' : '#ffc4d6'), f = heatGlow;
    return `rgb(${Math.round(a[0] + (b[0] - a[0]) * f)},${Math.round(a[1] + (b[1] - a[1]) * f)},${Math.round(a[2] + (b[2] - a[2]) * f)})`;
  }
  const hexRgb = (h) => { h = String(h).trim(); if (h[0] === '#') { if (h.length === 4) h = '#' + h[1] + h[1] + h[2] + h[2] + h[3] + h[3]; return [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)); }
    const m = h.match(/\d+/g); return m ? m.slice(0, 3).map(Number) : [255, 255, 255]; };
  const isDark = () => { const c = hexRgb(colors.cell); return c[0] + c[1] + c[2] < 300; };
  function drawDrug() {
    const s = cv.width / eng.L, type = eng.type, hb = eng.p.hotBand;
    if (hb) { // the tumour: a red band; in the barostat-free game box the view is one box, so draw it and its periodic copy
      ctx.save(); ctx.fillStyle = colors.hot; ctx.globalAlpha = 0.13; const x0 = ((hb.x0 % eng.L) + eng.L) % eng.L;
      for (const off of [0, -eng.L]) ctx.fillRect((x0 + off) * s, 0, hb.w * s, cv.height);
      ctx.globalAlpha = 0.7; ctx.strokeStyle = colors.hot; ctx.lineWidth = 2 * dpr; ctx.setLineDash([6 * dpr, 5 * dpr]);
      for (const xe of [x0, x0 + hb.w]) { const X = (xe % eng.L) * s; ctx.beginPath(); ctx.moveTo(X, 0); ctx.lineTo(X, cv.height); ctx.stroke(); }
      ctx.setLineDash([]); ctx.globalAlpha = 1; ctx.font = `700 ${13 * dpr}px ${css('--f-body') || 'sans-serif'}`; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillStyle = colors.hot;
      ctx.fillText(T('Tumour'), ((x0 + hb.w / 2) % eng.L) * s, cv.height - 8 * dpr);
      ctx.textAlign = 'left'; ctx.fillStyle = colors.muted; ctx.fillText(T('Blood flow') + ' →', 8 * dpr, cv.height - 8 * dpr); ctx.restore(); }
    // drug as stars (drawn over everything, in all periodic copies near the edges) so it stands out from the beads
    const star = (col, t, R) => { ctx.fillStyle = col; ctx.strokeStyle = colors.ink; ctx.lineWidth = Math.max(1, 0.08 * s); ctx.beginPath();
      for (let i = 0; i < eng.N; i++) { if (type[i] !== t) continue; const X = eng.x[i] * s, Y = eng.y[i] * s;
        for (let k = 0; k < 10; k++) { const r = k & 1 ? 0.45 * R : R, a = -Math.PI / 2 + k * Math.PI / 5, px = X + r * Math.cos(a), py = Y + r * Math.sin(a); k ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
        ctx.closePath(); }
      ctx.fill(); ctx.stroke(); };
    star(colors.muted, 6, 0.8 * s); star(colors.poly, 4, 0.95 * s);
    ctx.save(); ctx.shadowColor = '#ffd400'; ctx.shadowBlur = 0.9 * s; star('#ffd400', 3, 1.05 * s); ctx.restore(); // delivered: bright and glowing
    const w = drugWindow(); if (!w) return;
    ctx.save(); ctx.font = `700 ${15 * dpr}px ${css('--f-body') || 'sans-serif'}`; ctx.textBaseline = 'top'; ctx.textAlign = 'center';
    if (w.on) { ctx.strokeStyle = colors.hot; ctx.lineWidth = 8 * dpr; ctx.strokeRect(4 * dpr, 4 * dpr, cv.width - 8 * dpr, cv.height - 8 * dpr); }
    const msg = w.on ? T('Target window: release now! {s} s', { s: w.left.toFixed(1) }) : w.left !== null ? T('Next target window in {s} s', { s: w.left.toFixed(1) }) : T('No more windows: keep it cold');
    const tw = ctx.measureText(msg).width + 16 * dpr; ctx.fillStyle = w.on ? colors.hot : colors.ink; ctx.globalAlpha = 0.85;
    ctx.fillRect((cv.width - tw) / 2, 10 * dpr, tw, 24 * dpr); ctx.globalAlpha = 1; ctx.fillStyle = colors.cell; ctx.fillText(msg, cv.width / 2, 14 * dpr); ctx.restore();
  }
  // longest gel path: thick red line through the centres of the linked proteins (minimum-image steps, drawn in all periodic copies)
  // a molecule is drawn as ice only after it has been ice for 1 s without a break, so the colour does not flicker at crystal edges
  let iceT0 = null, iceMask = null, iceE = null;
  function iceShown(ic) {
    const N = eng.N, now = performance.now();
    if (!iceT0 || iceE !== eng || iceT0.length !== N) { iceT0 = new Float64Array(N); iceMask = new Uint8Array(N); iceE = eng; }
    for (let i = 0; i < N; i++) { if (ic[i]) { if (!iceT0[i]) iceT0[i] = now; iceMask[i] = now - iceT0[i] >= 1000 ? 1 : 0; } else { iceT0[i] = 0; iceMask[i] = 0; } }
    return iceMask;
  }
  // the path through the beads: along each protein's chain, and from one protein to the next only through a pair of touching stickers (type 5)
  function gelBeads(gp) {
    if (gp._beads && gp._beadsN === gp.path.length) return gp._beads;
    const Lc = eng.Lc, L = eng.L, x = eng.x, y = eng.y, ty = eng.type, P = gp.path, links = [];
    for (let h = 1; h < P.length; h++) { const A = P[h - 1], B = P[h]; let best = null, bd = Infinity; // the closest sticker pair between the two proteins
      for (let qa = 0; qa < Lc; qa++) { const i = A * Lc + qa; if (ty[i] !== 5) continue;
        for (let qb = 0; qb < Lc; qb++) { const j = B * Lc + qb; if (ty[j] !== 5) continue; let dx = x[i] - x[j], dy = y[i] - y[j]; dx -= L * Math.round(dx / L); dy -= L * Math.round(dy / L); const d = dx * dx + dy * dy; if (d < bd) { bd = d; best = [i, j]; } } }
      links.push(best || [A * Lc + (Lc >> 1), B * Lc + (Lc >> 1)]); }
    const out = [], run = (from, to) => { const st = from <= to ? 1 : -1; for (let i = from; i !== to + st; i += st) out.push(i); };
    for (let h = 0; h < P.length; h++) { const m = P[h], m0 = m * Lc, m1 = m0 + Lc - 1, inB = h ? links[h - 1][1] : null, outB = h < P.length - 1 ? links[h][0] : null;
      if (inB === null && outB === null) run(m0, m1);
      else if (inB === null) run(Math.abs(outB - m0) > Math.abs(outB - m1) ? m0 : m1, outB); // the first protein: from its far chain end to the sticker that leads on
      else if (outB === null) run(inB, Math.abs(inB - m0) > Math.abs(inB - m1) ? m0 : m1); // the last protein: on to its far chain end
      else run(inB, outB); }
    gp._beads = out; gp._beadsN = P.length; return out;
  }
  function gelPts(gp) { // positions of the path beads, unwrapped (minimum-image steps)
    const L = eng.L, bs = gelBeads(gp), pts = [[eng.x[bs[0]], eng.y[bs[0]]]];
    for (let h = 1; h < bs.length; h++) { const [px, py] = pts[h - 1]; let dx = eng.x[bs[h]] - px, dy = eng.y[bs[h]] - py;
      dx -= L * Math.round(dx / L); dy -= L * Math.round(dy / L); pts.push([px + dx, py + dy]); }
    return pts; }
  const GEL_INK = '#c4122f'; // a deep red, clear against both kinds of protein beads
  function drawGel(gp) {
    const s = cv.width / eng.L, L = eng.L, pts = gelPts(gp), bs = gelBeads(gp);
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const ox of [-L, 0, L]) for (const oy of [-L, 0, L]) {
      ctx.strokeStyle = GEL_INK; ctx.globalAlpha = 0.85; ctx.lineWidth = 3 * dpr; ctx.beginPath();
      pts.forEach(([px, py], h) => { const X = (px + ox) * s, Y = (py + oy) * s; h ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); }); ctx.stroke();
      ctx.globalAlpha = 1; ctx.lineWidth = Math.max(1.5, 0.13 * s); ctx.strokeStyle = GEL_INK; // the beads on the path get a ring; stickers that carry the path a filled dot
      pts.forEach(([px, py], h) => { const X = (px + ox) * s, Y = (py + oy) * s; ctx.beginPath(); ctx.arc(X, Y, 0.55 * s, 0, 6.2832); ctx.stroke();
        if (eng.type[bs[h]] === 5) { ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(X, Y, 0.26 * s, 0, 6.2832); ctx.fill(); } }); }
    ctx.restore();
  }
  // side-by-side plates: the central half of each box (plates kept centred), water-fearing reference on the left
  function drawSplit() {
    const W = cv.width, main = eng, m1 = shellMask;
    for (const [E, ox, sm] of [[eng2, 0, shellMask2], [main, W / 2, m1]]) {
      E.recenterPlates();
      ctx.save(); ctx.beginPath(); ctx.rect(ox, 0, W / 2, cv.height); ctx.clip(); ctx.translate(ox - W / 4, 0);
      eng = E; shellMask = sm; drawScene(); ctx.restore();
    }
    eng = main; shellMask = m1;
    ctx.save(); ctx.strokeStyle = colors.ink; ctx.lineWidth = 2 * dpr; ctx.beginPath(); ctx.moveTo(W / 2, 0); ctx.lineTo(W / 2, cv.height); ctx.stroke();
    ctx.font = `600 ${13 * dpr}px ${css('--f-body') || 'sans-serif'}`; ctx.textBaseline = 'top'; ctx.fillStyle = colors.ink;
    ctx.textAlign = 'left'; ctx.fillText(T('Water-fearing'), 8 * dpr, 6 * dpr); ctx.fillText(T(plateKind().name), W / 2 + 8 * dpr, 6 * dpr); ctx.restore();
  }
  let noBg = false;
  // ---- speed glow: a soft halo behind each molecule, blue when it moves slowly, red when fast (temperature is motion) ----
  // each molecule's kinetic energy ½v² (= its share of k_BT in 2D) is smoothed over about 0.3 s so the colours follow the heat, not the noise of single collisions
  let kinS = null, kinE = null, kinT = 0;
  const GLOW_N = 9, glowCols = [];
  function glowCol(k) { const f = k / (GLOW_N - 1), c0 = hexRgb(colors.cold), c1 = hexRgb(colors.hot), mid = isDark() ? [70, 76, 86] : [236, 236, 240], a = f < 0.5 ? c0 : mid, b = f < 0.5 ? mid : c1, t = f < 0.5 ? f * 2 : (f - 0.5) * 2;
    return `rgba(${Math.round(a[0] + (b[0] - a[0]) * t)},${Math.round(a[1] + (b[1] - a[1]) * t)},${Math.round(a[2] + (b[2] - a[2]) * t)},${isDark() ? 0.42 : 0.32})`; }
  function velGlow(s) {
    if (demoDrawing || !$('velGlow').checked || qLevel >= 2 || eng.walls || !eng.vx) return;
    const N = eng.N, vx = eng.vx, vy = eng.vy, x = eng.x, y = eng.y, now = performance.now();
    if (!kinS || kinE !== eng || kinS.length !== N) { kinS = new Float32Array(N); for (let i = 0; i < N; i++) kinS[i] = 0.5 * (vx[i] * vx[i] + vy[i] * vy[i]); kinE = eng; kinT = now; }
    const a = 1 - Math.exp(-Math.min(500, Math.max(0, now - kinT)) / 300); kinT = now;
    const [lo, hi] = curRange(), span = Math.max(1e-6, hi - lo), r = 0.62 * s, paths = [];
    for (let k = 0; k < GLOW_N; k++) paths.push(new Path2D());
    for (let i = 0; i < N; i++) { kinS[i] += a * (0.5 * (vx[i] * vx[i] + vy[i] * vy[i]) - kinS[i]);
      const f = Math.max(0, Math.min(0.999, (kinS[i] - lo) / span)), k = Math.floor(f * GLOW_N); if (k === (GLOW_N >> 1)) continue; // the middle is neutral: no halo
      const X = x[i] * s, Y = y[i] * s; paths[k].moveTo(X + r, Y); paths[k].arc(X, Y, r, 0, 6.2832); }
    const key = colors.cold + colors.hot + isDark(); if (glowCols.key !== key) { for (let k = 0; k < GLOW_N; k++) glowCols[k] = glowCol(k); glowCols.key = key; }
    for (let k = 0; k < GLOW_N; k++) if (k !== (GLOW_N >> 1)) { ctx.fillStyle = glowCols[k]; ctx.fill(paths[k]); }
  }
  // ---- thermometer strip on the right edge of the box in Game mode: blue → red, the green band (when shown) and where the temperature is now ----
  function boxThermo() {
    if (demoDrawing || appMode !== 'game' || classOn || (game && game.g.proto)) return;
    const g = (game && game.g) || gameSel; if (!g) return; const [lo, hi] = g.range, W = cv.width, H = cv.height, u = dpr, w = 12 * u, x0 = W - w - 6 * u, top = 8 * u, h = H - 16 * u;
    const yOf = (Tv) => top + h * (1 - Math.max(0, Math.min(1, (Tv - lo) / (hi - lo)))), gr = ctx.createLinearGradient(0, top + h, 0, top);
    gr.addColorStop(0, colors.cold); gr.addColorStop(0.5, isDark() ? '#4a4f58' : '#ece8dc'); gr.addColorStop(1, colors.hot);
    ctx.save(); ctx.globalAlpha = 0.9; ctx.fillStyle = gr; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x0, top, w, h, w / 2) : ctx.rect(x0, top, w, h); ctx.fill(); ctx.globalAlpha = 1;
    const z = bandNow(); if (z) { ctx.strokeStyle = css('--good') || '#2f9e57'; ctx.lineWidth = 3 * u; ctx.strokeRect(x0 - 3 * u, yOf(z[1]), w + 6 * u, yOf(z[0]) - yOf(z[1])); }
    const yt = yOf(tset); ctx.fillStyle = colors.ink; ctx.beginPath(); ctx.moveTo(x0 - 9 * u, yt - 6 * u); ctx.lineTo(x0 - 1 * u, yt); ctx.lineTo(x0 - 9 * u, yt + 6 * u); ctx.closePath(); ctx.fill();
    ctx.fillRect(x0 - 1 * u, yt - 1.5 * u, w + 2 * u, 3 * u);
    ctx.font = `${11 * u}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillText('🔥', x0 + w / 2, 2 * u); ctx.textBaseline = 'bottom'; ctx.fillText('❄', x0 + w / 2, H - 1 * u);
    ctx.restore();
  }
  function drawScene() {
    const L = eng.L, s = cv.width / L, N = eng.N, x = eng.x, y = eng.y, type = eng.type, sig = eng.sig, Lc = eng.Lc, nCh = Lc * eng.nMol;
    if (!noBg) { ctx.fillStyle = heatBg(); ctx.fillRect(0, 0, cv.width, cv.height); }
    velGlow(s);
    if (eng.walls) {
      ctx.fillStyle = colors.line; ctx.fillRect(0, 0, cv.width, eng.walls.lo * s);
      if ($('showBonds').checked && eng.bonds2) {
        ctx.strokeStyle = colors.bond; ctx.lineWidth = Math.max(1, 0.12 * s); ctx.beginPath(); const bl = eng.bonds2, hL = L / 2;
        for (let q = 0; q < bl.length; q += 2) { const i = bl[q], j = bl[q + 1]; if (Math.abs(x[i] - x[j]) > hL) continue; ctx.moveTo(x[i] * s, y[i] * s); ctx.lineTo(x[j] * s, y[j] * s); }
        ctx.stroke();
      }
      disks(colors.mixS, 0.5 * s, (i) => type[i] === 4, nCh, N);
    }
    if (sys === 'demix') {
      disks(colors.mixS, 0.46 * s, (i) => type[i] === 2, 0, N);
      disks(colors.mixC, 0.46 * s, (i) => type[i] === 4, 0, N);
      return;
    }
    const bnd = sys === 'lcst' && an && an.bound ? an.bound : null;
    if (eng.mb) {
      if (sys === 'ice') {
        const ic = $('byCluster').checked && an && an.isIce ? iceShown(an.isIce) : null;
        // more contrast: liquid water pale and small, ice molecules strong blue and a little larger (their arms are drawn blue below)
        disks(ic ? mixHex(colors.solv, colors.cell, 0.5) : colors.solv, (ic ? 0.31 : 0.35) * s, ic ? (i) => type[i] === 7 && !ic[i] : (i) => type[i] === 7, 0, N);
        if (ic) disks(colors.cold, 0.4 * s, (i) => ic[i] === 1, 0, N);
        disks(colors.tail, 0.68 * s, (i) => type[i] === 3, 0, N); // antifreeze particles, drawn at their size (σ = 1.4)
        disks(colors.cryst, 0.5 * s, (i) => type[i] === 4, 0, N); // ice wall
      }
      if (sys === 'ice' || ($('showSolv').checked && qLevel < 3)) {
        if (sys !== 'ice') { const sm = $('showShell').checked && shellMask && (sys === 'mbpoly' || sys === 'plates') ? shellMask : null;
          disks(colors.solv, 0.35 * s, sm ? (i) => !sm[i] : () => true, nCh, N); if (sm) disks(colors.cold, 0.35 * s, (i) => sm[i] === 1, nCh, N); }
        if (qLevel < 2) { const arm = eng.arm, al = 0.5 * s, icA = sys === 'ice' && $('byCluster').checked && an && an.isIce ? iceShown(an.isIce) : null;
          const arms = (sel, col, w, alpha) => { ctx.strokeStyle = col; ctx.lineWidth = w; ctx.globalAlpha = alpha; ctx.beginPath();
            for (let i = nCh; i < N; i++) { if (sys === 'ice' && type[i] === 3) continue; if (!sel(i)) continue; const X = x[i] * s, Y = y[i] * s, o = 6 * i;
              for (let a = 0; a < 6; a += 2) { ctx.moveTo(X, Y); ctx.lineTo(X + al * arm[o + a], Y + al * arm[o + a + 1]); } }
            ctx.stroke(); ctx.globalAlpha = 1; };
          if (icA) { arms((i) => !icA[i], colors.bond, Math.max(1, 0.07 * s), 0.45); arms((i) => icA[i] === 1, colors.cold, Math.max(1.2, 0.13 * s), 1); }
          else arms(() => true, colors.bond, Math.max(1, 0.08 * s), 1); } // arms skipped on slow devices
      }
    } else if ($('showSolv').checked && qLevel < 3 && !eng.walls) disks(colors.solv, 0.42 * s, bnd ? (i) => !bnd[i] : eng.nDrug ? (i) => type[i] === 2 : () => true, nCh, N);
    if (bnd) disks(colors.mixS, 0.42 * s, (i) => bnd[i] === 1, nCh, N);
    if ($('showBonds').checked && Lc > 1) {
      ctx.strokeStyle = colors.bond; ctx.lineWidth = Math.max(1, 0.18 * s); ctx.beginPath(); const hL = L / 2;
      for (let m = 0; m < eng.nMol; m++) for (let q = 0; q < Lc - 1; q++) { const i = m * Lc + q, j = i + 1;
        let dx = x[j] - x[i], dy = y[j] - y[i]; if (dx > hL) dx -= L; else if (dx < -hL) dx += L; if (dy > hL) dy -= L; else if (dy < -hL) dy += L;
        ctx.moveTo(x[i] * s, y[i] * s); ctx.lineTo((x[i] + dx) * s, (y[i] + dy) * s); }
      ctx.stroke();
    }
    if (sys === 'polymer' && $('byCluster').checked && an && an.cryst) {
      disks(colors.poly, 0.5 * s, (i) => !an.cryst[i], 0, nCh);
      disks(colors.cryst, 0.5 * s, (i) => an.cryst[i] === 1, 0, nCh);
      return;
    }
    if (sys === 'dumbbell' && $('byCluster').checked && an && an.label) {
      const groups = new Map();
      for (let m = 0; m < eng.nMol; m++) { const lab = an.label[m]; const key = an.size[lab] >= MIN_AGG ? CPAL[lab % CPAL.length] : colors.muted;
        if (!groups.has(key)) groups.set(key, []); groups.get(key).push(m); }
      for (const [col, ms] of groups) { ctx.fillStyle = col; ctx.beginPath();
        for (const m of ms) for (const i of [2 * m, 2 * m + 1]) { const r = 0.5 * sig[type[i]] * s, X = x[i] * s, Y = y[i] * s; ctx.moveTo(X + r, Y); ctx.arc(X, Y, r, 0, 6.2832); }
        ctx.fill(); }
      return;
    }
    if (sys === 'crypt' && $('byCluster').checked && an && an.label) { // proteins in a clump share a colour; single proteins keep bead colours
      for (const t of [5, 6]) disks(colors[TYPECOL[t]], 0.5 * sig[t] * s, (i) => type[i] === t && an.size[an.label[(i / Lc) | 0]] < 2, 0, nCh);
      const groups = new Map();
      for (let m = 0; m < eng.nMol; m++) { const lab = an.label[m]; if (an.size[lab] < 2) continue; const key = CPAL[lab % CPAL.length];
        if (!groups.has(key)) groups.set(key, []); groups.get(key).push(m); }
      for (const [col, ms] of groups) { ctx.fillStyle = col; ctx.beginPath();
        for (const m of ms) for (let q = 0; q < Lc; q++) { const i = m * Lc + q, r = 0.5 * sig[type[i]] * s, X = x[i] * s, Y = y[i] * s; ctx.moveTo(X + r, Y); ctx.arc(X, Y, r, 0, 6.2832); }
        ctx.fill(); }
      return;
    }
    if (sys === 'mbpoly' && eng.Lc === 1 && $('byCluster').checked && an && an.label) {
      const r = 0.5 * sig[3] * s, inCl = (i) => an.size[an.label[i]] >= 3;
      disks(colors.poly, r, (i) => !inCl(i), 0, nCh); disks(colors.cryst, r, inCl, 0, nCh);
      return;
    }
    // generic: chain beads coloured by type (tails and hydrophobic beads first, heads on top)
    for (const t of [1, 5, 3, 0, 6]) disks(colors[TYPECOL[t]], 0.5 * sig[t] * s, (i) => type[i] === t, 0, nCh);
  }

  const pT = $('plotT'), pF = $('plotF');
  function sizePlots() { for (const c of [pT, pF, $('thU'), $('thC'), $('thS'), $('thF')]) { c.width = Math.round(c.clientWidth * dpr); c.height = Math.round(c.clientHeight * dpr); } if (typeof drawThermo === 'function' && thermo) drawThermo(); }
  function plot(c, series, ymin, ymax, ticks) {
    const g = c.getContext('2d'), w = c.width, h = c.height, padL = 30 * dpr, padB = 4 * dpr, padT = 6 * dpr;
    g.clearRect(0, 0, w, h);
    g.font = `${10 * dpr}px ${css('--f-mono') || 'monospace'}`; g.fillStyle = colors.muted; g.textAlign = 'right'; g.textBaseline = 'middle';
    const Y = (v) => padT + (h - padT - padB) * (1 - (v - ymin) / (ymax - ymin));
    g.strokeStyle = colors.line; g.lineWidth = 1;
    for (const t of ticks) { const yy = Math.round(Y(t)) + 0.5; g.beginPath(); g.moveTo(padL, yy); g.lineTo(w, yy); g.stroke(); g.fillText(t.toFixed(1), padL - 5 * dpr, yy); }
    for (const sr of series) { const d = sr.data; if (d.length < 2) continue;
      g.strokeStyle = sr.color; g.lineWidth = sr.w * dpr; g.setLineDash(sr.dash ? [4 * dpr, 3 * dpr] : []); g.beginPath();
      for (let k = 0; k < d.length; k++) { const X = padL + (w - padL) * k / (HMAX - 1), yy = Y(Math.max(ymin, Math.min(ymax, d[k]))); k ? g.lineTo(X, yy) : g.moveTo(X, yy); }
      g.stroke(); g.setLineDash([]);
      if (sr.dot) { const k = d.length - 1, X = padL + (w - padL) * k / (HMAX - 1); g.fillStyle = sr.color; g.beginPath(); g.arc(X, Y(Math.max(ymin, Math.min(ymax, d[k]))), 3 * dpr, 0, 6.2832); g.fill(); }
    }
  }
  const push = (a, v) => { a.push(v); if (a.length > HMAX) a.shift(); };


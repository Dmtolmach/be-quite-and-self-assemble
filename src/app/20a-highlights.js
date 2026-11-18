  // ---------- game highlights: water that has just turned into ice, liquid that has just found its own kind, and a gel path that has just grown flash for a moment ----------
  // A molecule counts as new only when it changes state for good: its state is smoothed over a few readings and has to cross from below 0.15 to above 0.85,
  // so molecules that flicker at a crystal edge do not sparkle all the time.
  const FX_DUR = 1100, FX_MAX = 500;
  const FX = { list: [], s: null, f: null, kind: '', pathMax: 0, pulse: 0, nodes: [], done: new Set(), rec: null, crys: [] };
  function fxReset() { FX.crys = []; FX.list.length = 0; FX.s = null; FX.f = null; FX.rec = null; FX.done = new Set(); FX.kind = ''; FX.pathMax = 0; FX.pulse = 0; FX.nodes = []; }
  const fxCalm = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  // hysteresis on a 0/1 state per molecule: returns the molecules that have just changed from 0 to 1 for good
  function fxCross(kind, val, n) {
    const out = [];
    if (FX.kind !== kind || !FX.s || FX.s.length !== n) { FX.kind = kind; FX.s = new Float32Array(n); FX.f = new Uint8Array(n); FX.tNew = new Float64Array(n); FX.rec = new Float32Array(n);
      for (let i = 0; i < n; i++) { const v = val(i); FX.s[i] = v; FX.f[i] = v; } return out; } // the start state does not flash
    for (let i = 0; i < n; i++) { const v = val(i), s = FX.s[i] += 0.3 * (v - FX.s[i]);
      if (!FX.f[i] && s > 0.85) { FX.f[i] = 1; out.push(i); } else if (FX.f[i] && s < 0.15) FX.f[i] = 0; }
    return out;
  }
  const fxAdd = (list) => { const now = performance.now(); FX.total = (FX.total || 0) + list.length; for (const i of list) if (FX.list.length < FX_MAX) FX.list.push({ i, t0: now - 120 * Math.random() }); };
  // ice: a new piece of crystal glows in its own shape. Molecules that have frozen for good in the last 2 s are joined by their hydrogen-bond
  // neighbours (closer than 1.25σ); a group of at least 5 joined molecules (a ring of the 2D ice lattice is 6) lights up along its bonds.
  const ICE_MIN = 5, ICE_R = 1.25, CRYS_DUR = 2200;
  function fxIce() {
    const ic = iceShown(an.isIce), ty = eng.type, now = performance.now(), fresh = fxCross('ice', (i) => ty[i] === 7 && ic[i] ? 1 : 0, eng.N); // the same 1 s rule as the colour
    for (const i of fresh) FX.tNew[i] = now;
    for (const i of FX.done) if (!FX.f[i]) FX.done.delete(i); // melted again: may glow next time it freezes into a crystal
    const rec = []; for (let i = 0; i < eng.N; i++) if (FX.f[i] && now - FX.tNew[i] < 2000 && !FX.done.has(i)) rec.push(i);
    if (rec.length < ICE_MIN) return;
    const L = eng.L, x = eng.x, y = eng.y, r2 = ICE_R * ICE_R, n = rec.length, par = rec.map((_, k) => k);
    const find = (k) => { while (par[k] !== k) { par[k] = par[par[k]]; k = par[k]; } return k; };
    for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) { const i = rec[a], j = rec[b];
      let dx = x[i] - x[j], dy = y[i] - y[j]; dx -= L * Math.round(dx / L); dy -= L * Math.round(dy / L); if (dx * dx + dy * dy < r2) par[find(a)] = find(b); }
    const groups = new Map(); for (let a = 0; a < n; a++) { const r = find(a); if (!groups.has(r)) groups.set(r, []); groups.get(r).push(rec[a]); }
    for (const m of groups.values()) if (m.length >= ICE_MIN && FX.crys.length < 40) { FX.crys.push({ m, t0: now }); FX.total = (FX.total || 0) + 1; for (const i of m) FX.done.add(i); }
  }
  function fxCrystals(now, s, calm) { // glowing bonds and molecules in the shape of each new piece of crystal
    FX.crys = FX.crys.filter((c) => now - c.t0 < CRYS_DUR); if (!FX.crys.length) return;
    const L = eng.L, x = eng.x, y = eng.y, r2 = ICE_R * ICE_R * 1.1;
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const c of FX.crys) { const u = (now - c.t0) / CRYS_DUR, a = Math.min(1, u / 0.1) * (u < 0.55 ? 1 : 1 - (u - 0.55) / 0.45), m = c.m, segs = [];
      for (let p = 0; p < m.length; p++) for (let q = p + 1; q < m.length; q++) { const i = m[p], j = m[q]; let dx = x[j] - x[i], dy = y[j] - y[i];
        dx -= L * Math.round(dx / L); dy -= L * Math.round(dy / L); if (dx * dx + dy * dy < r2) segs.push([x[i], y[i], x[i] + dx, y[i] + dy]); }
      const draw = (w, col, al, blur) => { ctx.globalAlpha = a * al; ctx.strokeStyle = col; ctx.lineWidth = w; ctx.shadowColor = '#4cc3ff'; ctx.shadowBlur = blur; ctx.beginPath();
        for (const [x0, y0, x1, y1] of segs) { ctx.moveTo(x0 * s, y0 * s); ctx.lineTo(x1 * s, y1 * s); } ctx.stroke(); };
      draw(1.05 * s, '#38b8ff', 0.75, calm ? 0 : 1.2 * s); draw(0.3 * s, '#ffffff', 1, 0);
      ctx.shadowBlur = 0; ctx.globalAlpha = a; ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#1597dd'; ctx.lineWidth = Math.max(1, 0.08 * s);
      for (const i of m) { ctx.beginPath(); ctx.arc(x[i] * s, y[i] * s, 0.34 * s, 0, 6.2832); ctx.fill(); ctx.stroke(); } }
    ctx.restore();
  }
  // liquids: domains are connected beads with only their own kind around them; a domain glows only where it grows beyond its own record size
  // (by 8 % and at least 3 beads), and only the beads that have just joined it, so domains breathing at their edges stay quiet
  function fxDemix() {
    const fa = eng._iface, ty = eng.type, N = eng.N, core = (i) => !fa[i] && (ty[i] === 2 || ty[i] === 4);
    const par = new Int32Array(N); for (let i = 0; i < N; i++) par[i] = i;
    const find = (i) => { while (par[i] !== i) { par[i] = par[par[i]]; i = par[i]; } return i; };
    eng.forPairs(1.5, (i, j) => { if (ty[i] !== ty[j] || !core(i) || !core(j)) return; const a = find(i), b = find(j); if (a !== b) par[a] = b; });
    const size = new Map(); for (let i = 0; i < N; i++) if (core(i)) { const r = find(i); size.set(r, (size.get(r) || 0) + 1); }
    const MIN = 12, inBig = (i) => core(i) && size.get(find(i)) >= MIN ? 1 : 0;
    const now = performance.now(); for (const i of fxCross('demix', inBig, N)) FX.tNew[i] = now; if (!FX.rec) return;
    for (const i of FX.done) if (!FX.f[i]) FX.done.delete(i);
    const best = new Map(); for (let i = 0; i < N; i++) if (inBig(i) && FX.rec[i] > 0) { const r = find(i); best.set(r, Math.max(best.get(r) || 0, FX.rec[i])); }
    const glow = [];
    for (let i = 0; i < N; i++) { if (!inBig(i)) { FX.rec[i] *= 0.97; continue; } const r = find(i), n = size.get(r), was = best.get(r) || 0;
      if (was > 0 && n >= was * 1.08 + 3 && now - FX.tNew[i] < 1200 && !FX.done.has(i)) { glow.push(i); FX.done.add(i); } } // only beads that have just joined for good (a full 0 → 1 change in the last 1.2 s)
    for (let i = 0; i < N; i++) if (inBig(i)) { const r = find(i); FX.rec[i] = Math.max(best.get(r) || 0, size.get(r)); }
    fxAdd(glow);
  }
  function fxSample() { // after each reading in a running game
    if (!game || game.g.proto || game.cd) return; const id = game.g.id;
    if (id === 'ice' && an && an.isIce) fxIce();
    else if (id === 'demix' && eng._iface) fxDemix();
    else if (id === 'gel' && gelShow) { const gp = gelShow; // the longest path has grown by a few σ beyond its record: a light runs along it and the new proteins ring
      if (gp.len > FX.pathMax + 4) { const old = new Set(FX.nodes); if (FX.pathMax > 0) { FX.pulse = performance.now(); FX.newNodes = gp.path.filter((m) => !old.has(m)); } FX.pathMax = gp.len; FX.nodes = gp.path.slice(); } }
  }
  const fxSprites = new Map();
  function fxSprite(col) { // a soft round glow in one colour, drawn once and then stretched
    if (fxSprites.has(col)) return fxSprites.get(col);
    const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,255,0.95)'); gr.addColorStop(0.3, col); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64); fxSprites.set(col, c); return c;
  }
  function fxDraw() { // in box coordinates; eng.x/eng.y are the drawn (smoothed) positions here
    if (!game || game.g.proto) { if (FX.list.length) FX.list.length = 0; return; }
    const now = performance.now(), s = cv.width / eng.L, calm = fxCalm();
    fxCrystals(now, s, calm);
    if (FX.list.length) {
      FX.list = FX.list.filter((e) => now - e.t0 < FX_DUR && e.i < eng.N);
      ctx.save();
      for (const e of FX.list) { const u = Math.max(0, (now - e.t0) / FX_DUR), i = e.i, X = eng.x[i] * s, Y = eng.y[i] * s;
        const col = FX.kind === 'ice' ? '#4cc3ff' : eng.type[i] === 4 ? colors.mixC : colors.mixS, sp = fxSprite(col);
        const r = (calm ? 1.6 : 0.7 + 1.9 * (1 - Math.pow(1 - u, 3))) * s; ctx.globalAlpha = 0.75 * Math.pow(1 - u, 1.4);
        ctx.drawImage(sp, X - r, Y - r, 2 * r, 2 * r); }
      if (!calm) { ctx.lineWidth = Math.max(1, 0.1 * s); // a thin ring runs outwards from every new molecule
        for (const e of FX.list) { const u = (now - e.t0) / FX_DUR; if (u < 0 || u > 0.7) continue; const X = eng.x[e.i] * s, Y = eng.y[e.i] * s;
          ctx.globalAlpha = 0.8 * (1 - u / 0.7); ctx.strokeStyle = FX.kind === 'ice' ? '#1597dd' : colors.ink; ctx.beginPath(); ctx.arc(X, Y, (0.6 + 2.6 * u) * s, 0, 6.2832); ctx.stroke(); } }
      ctx.restore();
    }
    if (FX.pulse && gelShow && gelShow.path.length > 1) { const u = (now - FX.pulse) / 1500; if (u >= 1) { FX.pulse = 0; return; } fxGel(gelShow, u, s, calm); }
  }
  function fxGel(gp, u, s, calm) { // the path glows, a bright spark runs along it and the newly joined proteins ring
    const pts = gelPts(gp), L = eng.L, seg = [0]; for (let h = 1; h < pts.length; h++) seg.push(seg[h - 1] + Math.hypot(pts[h][0] - pts[h - 1][0], pts[h][1] - pts[h - 1][1]));
    const tot = seg[seg.length - 1] || 1, head = (calm ? 1 : Math.min(1, u / 0.65)) * tot, fade = Math.pow(1 - u, 1.2);
    const at = (d) => { let h = 1; while (h < seg.length - 1 && seg[h] < d) h++; const f = (d - seg[h - 1]) / Math.max(1e-6, seg[h] - seg[h - 1]); return [pts[h - 1][0] + f * (pts[h][0] - pts[h - 1][0]), pts[h - 1][1] + f * (pts[h][1] - pts[h - 1][1])]; };
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const ox of [-L, 0, L]) for (const oy of [-L, 0, L]) {
      ctx.globalAlpha = 0.55 * fade; ctx.strokeStyle = '#ffd34d'; ctx.lineWidth = 11 * dpr; ctx.beginPath();
      for (let h = 0; h < pts.length && seg[h] <= head; h++) { const X = (pts[h][0] + ox) * s, Y = (pts[h][1] + oy) * s; h ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); }
      const [hx, hy] = at(head); ctx.lineTo((hx + ox) * s, (hy + oy) * s); ctx.stroke();
      if (!calm && u < 0.7) { ctx.globalAlpha = 1; const sp = fxSprite('#ffe680'), r = 3.2 * s; ctx.drawImage(sp, (hx + ox) * s - r, (hy + oy) * s - r, 2 * r, 2 * r); }
      ctx.lineWidth = 2.5 * dpr; ctx.strokeStyle = '#e09a00';
      for (const m of FX.newNodes || []) { const X = (gp.cx[m] + ox) * s, Y = (gp.cy[m] + oy) * s; ctx.globalAlpha = 0.9 * fade; ctx.beginPath(); ctx.arc(X, Y, (calm ? 2 : 1 + 3 * u) * s, 0, 6.2832); ctx.stroke(); } }
    ctx.restore();
  }
  window.__fx = () => FX.total || 0; // for tests

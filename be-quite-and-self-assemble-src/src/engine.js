// 2D MD engine for soft-matter self-assembly in explicit solvent.
// Systems: 'dumbbell' A-B amphiphiles | 'polymer' semiflexible crystallizing chains |
//          'diblock' A_nB_m copolymer | 'demix' binary liquid | 'hp' HP protein | 'lcst' thermoresponsive chains.
//          'mbpoly' nonpolar chain in Mercedes-Benz (MB) water | 'ice' MB water starting as hexagonal ice | 'brush' grafted brush with a droplet of an oligomer liquid.
// Bead types: 0 = A, 1 = B, 2 = S (solvent), 3 = P (polymer), 4 = C (second liquid), 5 = H (hydrophobic), 6 = Q (polar), 7 = W (MB water).
// Reduced LJ units (sigma_S = 1, eps = 1, m = 1, kB = 1).
function MDEngine(opts) {
  const E = this;
  E.p = Object.assign({
    system: 'dumbbell', nSide: 48, rho: 0.6, nMol: 300, chainLen: 12,
    epsSS: 0, epsAS: 0, epsAA: 0, epsBB: 2.5, epsPP: 3.0, kBend: 8,
    sigA: 1.2, sigB: 1.0, kBond: 200, T: 2.0, dt: 0.005,
    epsAB: 0.8, fA: 0.5, epsSC: 0.6, xC: 0.5, epsHH: 3.0, sequence: 'HPHPPHHPHPPHPHHPPHPH', epsB: 3.5, wB: 0.04, rB: 1.15,
    mbEps: 1.0, mbSig: 0.085, mbR: 1.0, mbI: 0.1, sigP: 1.0, epsPW: 0.1,
    boxL: 48, graftSpacing: 1.4, nWater: 480, nEnd: 2, invert: false, epsQW: 0.5, epsHW: 0.1, epsCC: 0.2,
    ordered: false,
    liqLen: 4, epsLL: 1.0, epsQL: 1.2, epsHL: 0.2, epsLg: 0, rLg: 2.2, wLg: 0.5, gravity: 0,
    thermostat: 'langevin', gamma: 1.0, tau: 0.5, fmax: 500, seed: 1
  }, opts || {});
  let s = E.p.seed >>> 0 || 1;
  E.rand = function () { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
  let spare = null;
  E.gauss = function () {
    if (spare !== null) { const g = spare; spare = null; return g; }
    let u = 0; while (u === 0) u = E.rand(); const v = E.rand();
    const r = Math.sqrt(-2 * Math.log(u)), th = 2 * Math.PI * v;
    spare = r * Math.sin(th); return r * Math.cos(th);
  };
  E.init();
}

MDEngine.prototype.makeSeq = function () {
  const p = this.p, n = Math.max(3, p.chainLen | 0);
  switch (p.system) {
    case 'dumbbell': return [0, 1];
    case 'polymer': case 'lcst': return new Array(n).fill(3);
    case 'mbpoly': return new Array(Math.max(1, p.chainLen | 0)).fill(3); // 1 = free nonpolar solutes
    case 'plates': return new Array(Math.max(3, p.plateLen | 0)).fill(3); // two stiff nonpolar plates
    case 'diblock': { const L = Math.max(4, n), nA = Math.max(1, Math.min(L - 1, Math.round(p.fA * L)));
      return new Array(L).fill(1).fill(0, 0, nA); }
    case 'crypt': { // Go-like protein: fold held by native contacts; X = sticky (cryptic) beads, type 5; the rest type 6
      let q = String(p.cryptSeq || '').toUpperCase().replace(/[^PX]/g, ''); if (q.length !== 20 && q.length !== 37) q = MDEngine.discSeq(3, 1);
      return q.split('').map((c) => (c === 'X' ? 5 : 6)); }
    case 'hp': { let q = String(p.sequence || '').toUpperCase().replace(/[^HP]/g, ''); if (q.length < 3) q = 'HPHPPHHPHPPHPHHPPHPH';
      return q.split('').map((c) => (c === 'H' ? 5 : 6)); }
    default: return []; // demix: no molecules
  }
};
MDEngine.prototype.beadType = function (k) { return this.seq[k]; };

MDEngine.prototype.init = function () {
  const E = this, p = E.p, n = p.nSide;
  E.fixed = null; E.walls = null; E.nFixed = 0; E.bonds2 = null; E.hbN = null;
  if (p.system === 'brush') { E.initBrush(); E.finishInit(); return; }
  if (p.system === 'ice') { E.initIce(); E.finishInit(); return; }
  const a = 1 / Math.sqrt(p.rho);
  E.L = n * a; const N = n * n; E.N = N;
  E.seq = E.makeSeq(); const Lc = Math.max(1, E.seq.length); E.Lc = Lc;
  E.mb = p.system === 'mbpoly' || p.system === 'ice' || p.system === 'plates'; E.solv = E.mb ? 7 : 2;
  if (p.ordered || p.system === 'plates') { E.initOrdered(); E.finishInit(); return; }
  E.x = new Float64Array(N); E.y = new Float64Array(N);
  E.vx = new Float64Array(N); E.vy = new Float64Array(N);
  E.fx = new Float64Array(N); E.fy = new Float64Array(N);
  E.mb = p.system === 'mbpoly' || p.system === 'ice' || p.system === 'plates'; E.solv = E.mb ? 7 : 2;
  E.th = new Float64Array(N); E.om = new Float64Array(N); E.tq = new Float64Array(N); E.arm = new Float64Array(6 * N); E.nHB = 0;
  E.type = new Uint8Array(N);
  const shuffled = (k) => { const o = []; for (let i = 0; i < k; i++) o.push(i);
    for (let i = k - 1; i > 0; i--) { const j = Math.floor(E.rand() * (i + 1)); const t = o[i]; o[i] = o[j]; o[j] = t; } return o; };
  let nMol;
  if (E.seq.length === 0) {
    nMol = 0; let is = 0;
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) { E.x[is] = (c + 0.5) * a; E.y[is] = (r + 0.5) * a; is++; }
  } else if (p.system !== 'dumbbell') {
    // chains are consecutive blocks of Lc sites along a serpentine path through the lattice
    // (rows alternate direction, so neighbours on the path are always lattice neighbours)
    const nB = Math.floor(N / Lc); nMol = Math.max(0, Math.min(p.nMol, nB - 2));
    const order = shuffled(nB), isMol = new Uint8Array(nB);
    for (let k = 0; k < nMol; k++) isMol[order[k]] = 1;
    let im = 0, is = Lc * nMol, cur = -1;
    for (let q = 0; q < N; q++) {
      const r = (q / n) | 0, cc = q % n, c = (r & 1) ? n - 1 - cc : cc, b = (q / Lc) | 0;
      const X = (c + 0.5) * a, Y = (r + 0.5) * a;
      if (b < nB && isMol[b]) {
        if (q % Lc === 0) cur = im++;
        const idx = cur * Lc + (q % Lc); E.x[idx] = X; E.y[idx] = Y;
      } else { E.x[is] = X; E.y[is] = Y; is++; }
    }
  } else {
    // dumbbells are horizontal pairs of lattice sites
    const segPerRow = Math.floor(n / Lc), nSeg = n * segPerRow;
    const order = shuffled(nSeg);
    nMol = Math.min(p.nMol, nSeg, Math.floor(N / Lc) - 2);
    const molId = new Int32Array(nSeg).fill(-1);
    for (let k = 0; k < nMol; k++) molId[order[k]] = -2; // marked, id assigned on first visit
    let im = 0, is = Lc * nMol;
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
      const seg = r * segPerRow + Math.floor(c / Lc), inSeg = c < Lc * segPerRow;
      const X = (c + 0.5) * a, Y = (r + 0.5) * a;
      if (inSeg && molId[seg] !== -1) {
        if (molId[seg] === -2) molId[seg] = im++;
        const idx = molId[seg] * Lc + (c % Lc); E.x[idx] = X; E.y[idx] = Y;
      } else { E.x[is] = X; E.y[is] = Y; is++; }
    }
  }
  E.nMol = nMol;
  for (let m = 0; m < nMol; m++) {
    const b = m * Lc;
    for (let k = 0; k < Lc; k++) E.type[b + k] = E.beadType(k);
    if (E.rand() < 0.5) for (let k = 0; k < Lc >> 1; k++) { // reverse direction
      const i = b + k, j = b + Lc - 1 - k; let t = E.x[i]; E.x[i] = E.x[j]; E.x[j] = t; t = E.y[i]; E.y[i] = E.y[j]; E.y[j] = t;
    }
  }
  for (let i = Lc * nMol; i < N; i++) E.type[i] = E.solv;
  if (p.system === 'demix') E.setComposition(p.xC);
  E.finishInit();
};
// Ice: MB water on a honeycomb lattice (hexagonal 2D ice, every molecule with 3 hydrogen bonds), filling the box.
// Rectangular honeycomb cell sqrt(3) d x 3 d with 4 sites; nx : ny chosen so the box is square to 0.3%.
// ordered = false: same box and number of molecules, random positions and orientations (liquid start).
MDEngine.prototype.initIce = function () {
  const E = this, p = E.p, d = p.mbR, nx = p.iceNx || 19, ny = p.iceNy || 11, N = 4 * nx * ny;
  const L = ny * 3 * d, sx = L / (nx * Math.sqrt(3) * d), w = Math.sqrt(3) * d * sx;
  E.iceLat = { nx, ny, w, d };
  E.L = L; E.N = N; E.seq = []; E.Lc = 1; E.nMol = 0; E.solv = 7; E.mb = true;
  E.x = new Float64Array(N); E.y = new Float64Array(N); E.vx = new Float64Array(N); E.vy = new Float64Array(N);
  E.fx = new Float64Array(N); E.fy = new Float64Array(N); E.type = new Uint8Array(N).fill(7);
  E.th = new Float64Array(N); E.om = new Float64Array(N); E.tq = new Float64Array(N); E.arm = new Float64Array(6 * N); E.nHB = 0;
  E.hbN = new Uint8Array(N);
  // A sites: arms at 90, 210, 330 deg (bond up to a B site); B sites: arms at 270, 30, 150 deg
  const sites = [[0, 0, 'A'], [0, d, 'B'], [w / 2, 1.5 * d, 'A'], [w / 2, 2.5 * d, 'B']];
  let i = 0;
  for (let cy = 0; cy < ny; cy++) for (let cx = 0; cx < nx; cx++) for (const [u, v, s] of sites) {
    E.x[i] = cx * w + u + 0.25 * w; E.y[i] = cy * 3 * d + v + 0.25 * d; E.th[i] = s === 'A' ? Math.PI / 2 : -Math.PI / 2; i++; }
  if (!p.ordered) for (let k = 0; k < N; k++) E.th[k] = 2 * Math.PI * E.rand();
  // antifreeze solute: particles that attract water but have no hydrogen-bond arms, put on random lattice sites (type 3)
  const nS = Math.max(0, Math.min(N - 10, p.nSalt | 0)); if (nS) { const idx = [...Array(N).keys()];
    for (let k = 0; k < nS; k++) { const j = k + Math.floor(E.rand() * (N - k)); [idx[k], idx[j]] = [idx[j], idx[k]]; E.type[idx[k]] = 3; } }
  E.keepTh = true; E.wallIds = null;
  if (p.iceWall) E.addIceWall();
};
// Ice wall: one row of honeycomb cells across the middle 60% of the box, pinned (type 4), with stronger hydrogen bonds to water
// (seedHB), like a mineral surface whose atoms match the ice lattice. It gives ice two long flat fronts to grow from, so no
// nucleus has to form first. The water molecules nearest to the wall sites are moved onto them and oriented as in ice.
MDEngine.prototype.addIceWall = function () {
  const E = this, N = E.N, L = E.L, lat = E.iceLat; if (!lat || E.wallIds) return 0;
  const { nx, w, d } = lat, y0 = 0.5 * L - 1.5 * d;
  if (!E.fixed) { E.fixed = new Uint8Array(N); E.nFixed = 0; }
  const ids = [];
  const c0 = Math.round(0.2 * nx), c1 = Math.round(0.8 * nx); // a strip over the middle 60% of the box: its own lattice spacing, free ends
  for (let cx = c0; cx < c1; cx++) for (const [u, v, a] of [[0, 0, 1], [0, d, -1], [w / 2, 1.5 * d, 1], [w / 2, 2.5 * d, -1]]) {
    const px = (cx * w + u + 0.25 * w) % L, py = y0 + v;
    let best = -1, bd = 1e9;
    for (let i = 0; i < N; i++) { if (E.type[i] !== 7) continue; let dx = E.x[i] - px, dy = E.y[i] - py; dx -= L * Math.round(dx / L); dy -= L * Math.round(dy / L); const r2 = dx * dx + dy * dy; if (r2 < bd) { bd = r2; best = i; } }
    if (best < 0) break;
    E.x[best] = px; E.y[best] = py; E.th[best] = a * Math.PI / 2; E.type[best] = 4; E.vx[best] = E.vy[best] = 0; E.om[best] = 0; E.fixed[best] = 1; E.nFixed++; ids.push(best);
  }
  E.wallIds = ids; return ids.length;
};
MDEngine.prototype.removeIceWall = function () { // the wall turns back into ordinary water
  const E = this, ids = E.wallIds; if (!ids) return;
  for (const i of ids) { E.type[i] = 7; E.fixed[i] = 0; E.nFixed--; } E.wallIds = null;
};
// Brush: chains grafted upright on a substrate wall at the bottom, an MB water droplet resting on top,
// vacuum above, periodic in x. Free-end beads (nEnd) are H (type 5), the rest Q (type 6); invert swaps them.
MDEngine.prototype.initBrush = function () {
  const E = this, p = E.p, L = p.boxL, Lc = Math.max(3, p.chainLen | 0), gs = p.graftSpacing;
  const nCh = Math.max(1, Math.floor(L / gs)), nE = Math.max(1, Math.min(Lc - 1, p.nEnd | 0));
  E.seq = []; for (let k = 0; k < Lc; k++) { const end = k >= Lc - nE; E.seq.push(end !== !!p.invert ? 5 : 6); }
  const yw = 1.0, b = 0.95, yTop = yw + 0.6 + b * (Lc - 1), nW = Math.max(0, p.nWater | 0);
  const N = nCh * Lc + nW; E.N = N; E.L = L; E.Lc = Lc; E.nMol = nCh;
  E.x = new Float64Array(N); E.y = new Float64Array(N); E.vx = new Float64Array(N); E.vy = new Float64Array(N);
  E.fx = new Float64Array(N); E.fy = new Float64Array(N); E.type = new Uint8Array(N);
  E.mb = false; E.solv = 4; E.liqType = 4;
  E.th = new Float64Array(N); E.om = new Float64Array(N); E.tq = new Float64Array(N); E.arm = new Float64Array(6 * N); E.nHB = 0;
  E.fixed = new Uint8Array(N); E.nFixed = nCh;
  E.walls = { lo: yw, hi: L - 4, sig: 0.8 }; E.yGraft = yw + 0.6;
  for (let m = 0; m < nCh; m++) {
    const xg = (m + 0.5) * (L / nCh);
    for (let k = 0; k < Lc; k++) { const i = m * Lc + k; E.x[i] = xg; E.y[i] = yw + 0.6 + b * k; E.type[i] = E.seq[k]; }
    E.fixed[m * Lc] = 1;
  }
  // droplet: half-disc of liquid beads on a square lattice above the brush, rows filled in serpentine order
  // so consecutive beads are neighbours; every liqLen consecutive beads form one flexible oligomer.
  const a = 1.12, y0 = yTop + 1.3, xc = L / 2, s0 = nCh * Lc; let placed = s0;
  const th0 = p.ordered ? 2 * Math.PI / 3 : Math.PI / 2, Rd = Math.sqrt(nW * a * a / (th0 - Math.sin(th0) * Math.cos(th0))), yC = -Rd * Math.cos(th0);
  for (let r = 0; placed < N && r < 200; r++) {
    const dyc = r * a - yC, half = Math.sqrt(Math.max(0, Rd * Rd - dyc * dyc)), cmax = Math.floor(half / a), cols = [];
    for (let c = -cmax; c <= cmax; c++) cols.push(c);
    if (r & 1) cols.reverse();
    for (const c of cols) { if (placed >= N) break; E.x[placed] = (((xc + c * a) % L) + L) % L; E.y[placed] = y0 + r * a; E.type[placed] = 4; placed++; }
  }
  E.nWaterPlaced = placed - s0;
  const lw = Math.max(1, p.liqLen | 0), bl = [];
  for (let i = s0; i + 1 < placed; i++) {
    if (((i - s0) % lw) === lw - 1) continue; // chain boundary
    let dx = E.x[i] - E.x[i + 1], dy = E.y[i] - E.y[i + 1]; if (dx > L / 2) dx -= L; else if (dx < -L / 2) dx += L;
    if (dx * dx + dy * dy < 1.7 * 1.7) bl.push(i, i + 1); // skip the rare row-end jump
  }
  E.bonds2 = new Int32Array(bl);
};
// ---------- ordered (cold-equilibrium) initial states ----------
MDEngine.prototype.alloc = function (N) {
  const E = this; E.N = N;
  E.x = new Float64Array(N); E.y = new Float64Array(N); E.vx = new Float64Array(N); E.vy = new Float64Array(N);
  E.fx = new Float64Array(N); E.fy = new Float64Array(N); E.type = new Uint8Array(N);
  E.th = new Float64Array(N); E.om = new Float64Array(N); E.tq = new Float64Array(N); E.arm = new Float64Array(6 * N); E.nHB = 0;
};
// Molecules from explicit coordinates; solvent on lattice sites at least `excl` from every molecule bead.
// Random solvent sites are dropped so the total stays n^2 beads where possible.
MDEngine.prototype.placeMolecules = function (mols, excl, extraMin) {
  const E = this, p = E.p, n = p.nSide, L = E.L, a = L / n, Lc = E.Lc, nMol = mols.length, nm = Lc * nMol;
  const wrap = (v) => ((v % L) + L) % L, g = Math.max(3, Math.floor(L / Math.max(excl, 0.6))), cs = L / g;
  const cell = []; for (let i = 0; i < g * g; i++) cell.push([]);
  for (const m of (E._exclExtra ? mols.concat([E._exclExtra]) : mols)) for (const [x0, y0] of m) { const x = wrap(x0), y = wrap(y0); cell[Math.min(g - 1, (y / cs) | 0) * g + Math.min(g - 1, (x / cs) | 0)].push(x, y); }
  const e2 = excl * excl, sites = [];
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    const X = (c + 0.5) * a, Y = (r + 0.5) * a, cx = Math.min(g - 1, (X / cs) | 0), cy = Math.min(g - 1, (Y / cs) | 0); let ok = true;
    for (let dy = -1; dy <= 1 && ok; dy++) for (let dx = -1; dx <= 1 && ok; dx++) {
      const arr = cell[((cy + dy + g) % g) * g + ((cx + dx + g) % g)];
      for (let q = 0; q < arr.length; q += 2) { let ddx = X - arr[q], ddy = Y - arr[q + 1];
        if (ddx > L / 2) ddx -= L; else if (ddx < -L / 2) ddx += L; if (ddy > L / 2) ddy -= L; else if (ddy < -L / 2) ddy += L;
        if (ddx * ddx + ddy * ddy < e2) { ok = false; break; } }
    }
    if (ok) sites.push(X, Y);
  }
  // optional second, staggered lattice to top up the solvent (small solvent beads, e.g. MB water)
  if (extraMin && sites.length / 2 < n * n - nm) {
    const m2 = extraMin * extraMin;
    for (let r = 0; r < n && sites.length / 2 < n * n - nm; r++) for (let c = 0; c < n && sites.length / 2 < n * n - nm; c++) {
      const X = (c + 1) * a, Y = (r + 1) * a; let ok = true;
      const cx = Math.min(g - 1, ((X % L) / cs) | 0), cy = Math.min(g - 1, ((Y % L) / cs) | 0);
      for (let dy = -1; dy <= 1 && ok; dy++) for (let dx = -1; dx <= 1 && ok; dx++) {
        const arr = cell[((cy + dy + g) % g) * g + ((cx + dx + g) % g)];
        for (let q = 0; q < arr.length; q += 2) { let ddx = X - arr[q], ddy = Y - arr[q + 1];
          ddx -= L * Math.round(ddx / L); ddy -= L * Math.round(ddy / L); if (ddx * ddx + ddy * ddy < e2) { ok = false; break; } }
      }
      if (!ok) continue;
      for (let q = 0; q < sites.length && ok; q += 2) { let ddx = (X % L) - sites[q], ddy = (Y % L) - sites[q + 1];
        ddx -= L * Math.round(ddx / L); ddy -= L * Math.round(ddy / L); if (ddx * ddx + ddy * ddy < m2) ok = false; }
      if (ok) sites.push(X % L, Y % L);
    }
  }
  if (E.siteFilter) { const f = []; for (let q = 0; q < sites.length; q += 2) if (E.siteFilter(sites[q], sites[q + 1])) f.push(sites[q], sites[q + 1]); sites.length = 0; sites.push(...f); }
  const ns = sites.length / 2, keep = Math.max(0, Math.min(ns, n * n - nm)), order = [];
  for (let i = 0; i < ns; i++) order.push(i);
  for (let i = ns - 1; i > 0; i--) { const j = Math.floor(E.rand() * (i + 1)); const t = order[i]; order[i] = order[j]; order[j] = t; }
  E.alloc(nm + keep); E.nMol = nMol;
  let k = 0;
  for (const m of mols) { for (let q = 0; q < Lc; q++) { E.x[k] = wrap(m[q][0]); E.y[k] = wrap(m[q][1]); E.type[k] = E.seq[q]; k++; } }
  for (let q = 0; q < keep; q++) { const o = order[q]; E.x[k] = sites[2 * o]; E.y[k] = sites[2 * o + 1]; E.type[k] = E.solv; k++; }
};
// Compact serpentine block of Lc beads at spacing d, centred on (cx, cy), rotated by ang.
MDEngine.prototype.globule = function (Lc, d, cx, cy, ang) {
  const w = Math.ceil(Math.sqrt(Lc)), h = Math.ceil(Lc / w), c = Math.cos(ang), s = Math.sin(ang), out = [];
  for (let k = 0; k < Lc; k++) { const row = (k / w) | 0, col = (row & 1) ? w - 1 - (k % w) : k % w;
    const u = (col - (w - 1) / 2) * d, v = (row - (h - 1) / 2) * d; out.push([cx + c * u - s * v, cy + s * u + c * v]); }
  return out;
};
// Place a list of objects (arrays of bead coordinates around the origin) on a jittered grid of slots.
MDEngine.prototype.spreadObjects = function (objs) {
  const E = this, L = E.L, ng = Math.max(1, Math.ceil(Math.sqrt(objs.length))), pitch = L / ng, slots = [];
  for (let i = 0; i < ng * ng; i++) slots.push(i);
  for (let i = slots.length - 1; i > 0; i--) { const j = Math.floor(E.rand() * (i + 1)); const t = slots[i]; slots[i] = slots[j]; slots[j] = t; }
  return objs.map((o, q) => { const sl = slots[q], cx = ((sl % ng) + 0.5) * pitch, cy = (((sl / ng) | 0) + 0.5) * pitch;
    return o.map(([x, y]) => [x + cx, y + cy]); });
};
MDEngine.prototype.initOrdered = function () {
  const E = this, p = E.p, n = p.nSide, L = E.L, Lc = E.Lc, a = L / n, mols = [];
  const want = Math.max(0, Math.min(p.nMol, Math.floor(n * n / Math.max(1, Lc)) - 2));
  switch (p.system) {
    case 'dumbbell': if (p.nDrug > 0) { // loaded micelles: nd drug beads in the core, a ring of tails around them, heads outside
        const nd = p.drugPerMic || 3, rd0 = nd > 1 ? 0.6 : 0, nt = Math.floor(2 * Math.PI * (rd0 + 1.0)) + (p.extraTails || 0), rt = Math.max(rd0 + 1.0, 0.95 * nt / (2 * Math.PI)), rd = nd > 1 ? rt - 1.0 : 0, bl = 0.95 * 0.5 * (p.sigA + p.sigB);
        const nMic = Math.max(1, Math.min(Math.floor(p.nDrug / nd), Math.floor(want / nt))), objs = [];
        for (let m = 0; m < nMic; m++) { const o = [], ph = 2 * Math.PI * E.rand();
          for (let k = 0; k < nd; k++) { const t = ph + 2 * Math.PI * k / nd; o.push([rd * Math.cos(t), rd * Math.sin(t)]); }
          for (let k = 0; k < nt; k++) { const t = ph + 2 * Math.PI * (k + 0.5) / nt; o.push([(rt + bl) * Math.cos(t), (rt + bl) * Math.sin(t)], [rt * Math.cos(t), rt * Math.sin(t)]); }
          objs.push(o); }
        const placed = p.drugXs ? objs.map((o, m) => { // drug game: micelles at given distances along the flow, at random heights
            const cx = p.drugXs[m % p.drugXs.length], cy = L * (0.2 + 0.6 * E.rand()); return o.map(([x, y]) => [x + cx, y + cy]); })
          : E.spreadObjects(objs), drugs = [];
        for (const o of placed) { for (let k = 0; k < nd; k++) drugs.push(o[k]); for (let k = nd; k < o.length; k += 2) mols.push([o[k], o[k + 1]]); }
        E._exclExtra = drugs; E.placeMolecules(mols, 1.0); E._exclExtra = null;
        let k = E.N - 1; for (const [dx, dy] of drugs) { E.x[k] = ((dx % L) + L) % L; E.y[k] = ((dy % L) + L) % L; E.type[k] = 4; k--; }
        E.nDrug = drugs.length; break; }
    { // stack of bilayers (lamellar phase): tails inside, heads facing the solvent
      const m = Math.max(4, Math.round(L / (p.bilayerSpacing || 1.15))), nb = Math.max(1, Math.min(Math.floor(L / 4.5), Math.round(want / (2 * m))));
      const bl = 0.95 * 0.5 * (p.sigA + p.sigB), dT = 0.56;
      for (let k = 0; k < nb; k++) { const yc = (k + 0.5) * L / nb;
        for (let i = 0; i < m; i++) { const x = (i + 0.5) * L / m, x2 = x + 0.5 * L / m;
          mols.push([[x, yc - dT - bl], [x, yc - dT]]); mols.push([[x2, yc + dT + bl], [x2, yc + dT]]); } }
      E.placeMolecules(mols, 1.0); break; }
    case 'polymer': { // crystal slab: straight parallel chains, hexagonal packing
      const dx = 0.95, dy = 0.97, per = Math.max(1, Math.floor(L / (Lc * dx + 0.6))), pitch = L / per, rows = Math.ceil(want / per), y0 = L / 2 - (rows - 1) * dy / 2;
      for (let q = 0; q < want; q++) { const row = (q / per) | 0, col = q % per, x0 = col * pitch + (row & 1 ? dx / 2 : 0), ch = [];
        for (let j = 0; j < Lc; j++) ch.push([x0 + j * dx, y0 + row * dy]); mols.push(ch); }
      E.placeMolecules(mols, 0.95); break; }
    case 'diblock': { // lamellae: A and B blocks in alternating bands, chains anchored at the A-B interfaces
      const nA = E.seq.filter((t) => t === 0).length, nB = Lc - nA, np = Math.max(1, Math.round(L / (1.9 * Lc))), P = L / np, tA = P * nA / Lc, tB = P - tA;
      const step = (half, nb) => nb > 1 ? Math.min(0.95, Math.max(0.3, (half - 0.475 - 0.5) / (nb - 1))) : 0.95;
      const dyA = step(tA / 2, nA), dyB = step(tB / 2, nB), dxA = Math.sqrt(Math.max(0, 0.9025 - dyA * dyA)), dxB = Math.sqrt(Math.max(0, 0.9025 - dyB * dyB));
      const nI = 2 * np, perI = Math.max(1, Math.ceil(want / nI)), sx = L / perI;
      for (let q = 0; q < want; q++) { const it = q % nI, col = (q / nI) | 0, per = (it / 2) | 0, up = it & 1;
        const yI = per * P + (up ? 0 : tA), sA = up ? 1 : -1, xc = (col + 0.5) * sx + (up ? sx / 2 : 0), ch = new Array(Lc);
        for (let u = 0; u < nA; u++) ch[nA - 1 - u] = [xc + (u & 1 ? dxA : 0), yI + sA * (0.475 + u * dyA)];
        for (let u = 0; u < nB; u++) ch[nA + u] = [xc + (u & 1 ? dxB : 0), yI - sA * (0.475 + u * dyB)];
        mols.push(ch); }
      E.placeMolecules(mols, 0.95); break; }
    case 'demix': { // two separated liquids: a stripe of C across the box
      E.placeMolecules([], 0.95);
      const nC = Math.round(Math.max(0, Math.min(1, p.xC)) * E.N), idx = [];
      const P = L / Math.max(1, p.demixStripes || 1); // stripes of C, one per period P
      for (let i = 0; i < E.N; i++) idx.push([Math.abs((E.y[i] % P) - P / 2) + 1e-3 * E.rand(), i]);
      idx.sort((u, v) => u[0] - v[0]);
      for (let q = 0; q < nC; q++) E.type[idx[q][1]] = 4;
      break; }
    case 'hp': case 'crypt': { // folded chains: precomputed native folds for the preset sequences, compact blocks otherwise
      const key = E.seq.map((t) => (t === 5 ? 'H' : 'P')).join(''), fold = p.system === 'crypt' ? MDEngine.cryptFoldFor(Lc) : MDEngine.HP_FOLDS[key], objs = [];
      for (let q = 0; q < want; q++) { const ang = 2 * Math.PI * E.rand(), c = Math.cos(ang), s = Math.sin(ang);
        objs.push(fold ? fold.map(([u, v]) => [c * u - s * v, s * u + c * v]) : E.globule(Lc, 1.0, 0, 0, ang)); }
      E.placeMolecules(E.spreadObjects(objs), 0.95); break; }
    case 'lcst': { // UCST polymer: collapsed globules
      const objs = []; for (let q = 0; q < want; q++) objs.push(E.globule(Lc, 1.0, 0, 0, 2 * Math.PI * E.rand()));
      E.placeMolecules(E.spreadObjects(objs), 0.95); break; }
    case 'plates': { // two parallel plates (stiff rods of nonpolar beads), centre-to-centre gap p.plateGap, water everywhere else
      const d = 0.95 * p.sigP, len = (Lc - 1) * d, g = p.plateGap || 3.2, nP = p.nPlates === 1 ? 1 : 2;
      E.siteFilter = p.slab > 0 ? (X, Y) => Math.abs(Y - L / 2) < 0.5 * p.slab * L : null;
      for (const yc of nP === 1 ? [L / 2] : [L / 2 - g / 2, L / 2 + g / 2]) { const ch = []; for (let j = 0; j < Lc; j++) ch.push([L / 2 - len / 2 + j * d, yc]); mols.push(ch); }
      E.placeMolecules(mols, 0.5 * (p.sigP + 0.7) + 0.05, 0.72); E.siteFilter = null;
      if (p.plateFix) { E.fixed = new Uint8Array(E.N); E.fixed.fill(1, 0, nP * Lc); E.nFixed = nP * Lc; }
      break; }
    case 'mbpoly': { // free solutes start spread out (cold: they stay apart; warm: the hydrophobic attraction gathers them); chains as globules
      const objs = [], d = 1.12 * p.sigP;
      if (Lc === 1) {
        const nCl = 0;
        for (let q = 0; q < nCl; q++) { const o = [[0, 0]]; for (let k = 0; k < 6; k++) o.push([d * Math.cos(k * Math.PI / 3), d * Math.sin(k * Math.PI / 3)]); objs.push(o); }
        for (let q = 7 * nCl; q < want; q++) objs.push([[0, 0]]);
        const placed = E.spreadObjects(objs); for (const o of placed) for (const b of o) mols.push([b]);
      } else { for (let q = 0; q < want; q++) objs.push(E.globule(Lc, 1.0 * p.sigP, 0, 0, 2 * Math.PI * E.rand())); mols.push(...E.spreadObjects(objs)); }
      E.placeMolecules(mols, 0.95, 0.72); break; } // top up water on a staggered lattice to keep its density
    default: E.placeMolecules([], 0.95);
  }
};
// Folds of the preset HP sequences, from simulated annealing (eps_HH = 3, T 2.3 -> 0.9 over 150 tau), best of 3-4 runs.
MDEngine.CRYPT_FOLD = 'HPHPPHHPHPPHPHHPPHPH';
// Compact disc fold for the cryptic-site protein: a chain that snakes row by row through a hexagonal disc of radius R on a
// triangular lattice (spacing a; 1 + 3R(R+1) beads). Rows alternate direction, so the beads near the centre come from
// several separate stretches of the sequence. discSeq marks the beads within `core` lattice steps of the centre as sticky (X).
MDEngine.discPath = function (R) {
  const path = []; let flip = false;
  for (let r = -R; r <= R; r++) { const q0 = Math.max(-R, -R - r), q1 = Math.min(R, R - r), row = [];
    for (let q = q0; q <= q1; q++) row.push([q, r]); if (flip) row.reverse(); flip = !flip; path.push(...row); }
  return path;
};
MDEngine.discFold = function (R, a) { return MDEngine.discPath(R).map(([q, r]) => [a * (q + r / 2), a * (r * Math.sqrt(3) / 2)]); };
MDEngine.discSeq = function (R, core) { return MDEngine.discPath(R).map(([q, r]) => ((Math.abs(q) + Math.abs(r) + Math.abs(q + r)) / 2 <= core ? 'X' : 'P')).join(''); };
MDEngine.cryptFoldFor = function (Lc) { return Lc === 37 ? MDEngine.discFold(3, 0.97) : MDEngine.HP_FOLDS[MDEngine.CRYPT_FOLD]; };
MDEngine.HP_FOLDS = {"HPHPHPHPHPHPHPHPHPHP":[[0.46,0.18],[0.77,1.1],[-0.26,1.05],[-0.11,2.07],[-1,1.75],[-1.9,2.19],[-2.49,1.41],[-2.59,0.38],[-1.61,0.81],[-1.65,-0.34],[-0.76,0.05],[-0.56,-0.88],[0.45,-0.88],[0.27,-1.91],[1.24,-1.62],[1.55,-2.62],[2.34,-1.87],[2.48,-0.87],[1.56,-0.5],[1.82,0.5]],"PPPHHPPHHPPPPPHHHHHHHPPHHPPPPHHPPHPP":[[3.5,-2.97],[4.49,-2.8],[3.9,-1.94],[3.08,-1.33],[2.52,-2.21],[1.56,-2.59],[0.89,-1.76],[1.81,-1.3],[2.4,-0.45],[3.22,0.2],[3.21,1.18],[3.12,2.13],[2.12,2.27],[1.48,1.45],[1.96,0.52],[1.36,-0.28],[0.47,0.37],[0.27,-0.65],[-0.53,0.08],[-0.74,-0.99],[-1.51,-0.31],[-1.94,-1.24],[-2.82,-0.78],[-2.49,0.21],[-1.62,0.76],[-0.74,1.31],[-0.44,2.26],[-1.01,3.05],[-1.78,2.43],[-2.41,1.62],[-3.29,1.1],[-3.79,1.93],[-4.41,1.11],[-3.85,0.21],[-3.97,-0.79],[-4.04,-1.79]],"HHHHHHHHHHHHHHHHHHHH":[[0.19,-2.88],[0.47,-1.93],[-0.57,-1.95],[-1.17,-1.03],[-0.1,-0.93],[0.89,-0.91],[1.61,-1.66],[2.06,-0.7],[1.47,0.29],[1.96,1.22],[0.89,1.29],[0.29,2.15],[-0.73,1.96],[-1.78,1.87],[-2.29,0.94],[-1.73,0.01],[-1.2,0.94],[-0.61,0.08],[-0.12,1.05],[0.46,0.18]],"HPHPPHHPHPPHPHHPPHPH":[[0.98,-1.38],[1.28,-2.37],[0.31,-2.47],[-0.48,-3.09],[-0.95,-2.15],[-0.19,-1.52],[-0.84,-0.68],[-1.7,-0.05],[-1.09,0.75],[-1.89,1.22],[-1.34,1.99],[-0.42,1.65],[-0.47,2.73],[0.46,2.31],[0.69,1.28],[1.77,1.2],[2.16,0.27],[1.14,0.4],[0.59,-0.47],[0.02,0.39]],"HHHHHHHHHHPPPPPPPPPP":[[-0.15,1.95],[0.04,0.92],[0.89,1.56],[1.09,2.6],[1.91,1.87],[2.21,0.87],[2.39,-0.15],[1.42,-0.64],[1.26,0.37],[0.31,-0.13],[0.54,-1.15],[0.66,-2.13],[-0.16,-2.82],[-1.18,-3.09],[-1.06,-2.04],[-0.94,-1.01],[-1.02,0.02],[-2.09,0.21],[-2.9,0.92],[-3.23,1.85]]};
MDEngine.prototype.finishInit = function () {
  const E = this, p = E.p, N = E.N;
  E.solvMask = { dumbbell: 4, polymer: 4, diblock: 4, hp: 4, crypt: 4, lcst: 4 }[p.system] || 0;
  if (E.mb && !E.hbN) E.hbN = new Uint8Array(N);
  E.go = null;
  if (p.system === 'crypt') { const f = MDEngine.cryptFoldFor(E.Lc), go = [];
    for (let i = 0; i < f.length; i++) for (let j = i + 3; j < f.length; j++) { const d = Math.hypot(f[i][0] - f[j][0], f[i][1] - f[j][1]); if (d < (p.goCut || 1.6)) go.push(i, j, Math.max(1.0, d)); }
    E.go = go; } // type 2 = S; demix, MB water, brush: none
  let px = 0, py = 0; const sq = Math.sqrt(p.T);
  for (let i = 0; i < N; i++) { E.vx[i] = sq * E.gauss(); E.vy[i] = sq * E.gauss(); px += E.vx[i]; py += E.vy[i]; }
  px /= N; py /= N; for (let i = 0; i < N; i++) { E.vx[i] -= px; E.vy[i] -= py; }
  if (E.mb) { const sw = Math.sqrt(p.T / p.mbI), sT = p.system === 'ice' ? 4 : 7; for (let i = 0; i < N; i++) if (E.type[i] === 7 || E.type[i] === sT) { if (!E.keepTh) E.th[i] = 2 * Math.PI * E.rand(); E.om[i] = sw * E.gauss(); } }
  E.keepTh = false;
  if (E.fixed) for (let i = 0; i < N; i++) if (E.fixed[i]) { E.vx[i] = 0; E.vy[i] = 0; }
  E.time = 0; E.steps = 0;
  E.head = null;
  E.setupTable(); E.setupCells(); E.computeForces(); E.L0 = E.L; E.Pema = undefined;
};

// hydrophobic switch s(T): 0 at T* <= 0.18 (cold), 1 at T* >= 0.32 (warm), smooth in between
MDEngine.prototype.hydroS = function () { const t = Math.max(0, Math.min(1, (this.p.T - 0.18) / 0.14)); return t * t * (3 - 2 * t); };
MDEngine.prototype.hydroEps = function () { return (this.p.epsH || 0) * this.hydroS(); };
MDEngine.prototype.setupTable = function () {
  const E = this, p = E.p; E._tabT = p.T;
  const sig = [1, 1, 1, 1, 1, 1, 1, 1];
  // attractive well depth per pair; 0 => purely repulsive WCA (eps = 1)
  const att = []; for (let i = 0; i < 8; i++) att.push(new Array(8).fill(0));
  const set = (a, b, v) => { att[a][b] = v; att[b][a] = v; };
  switch (p.system) {
    case 'dumbbell': sig[0] = p.sigA; sig[1] = p.sigB; set(0, 0, p.epsAA); set(1, 1, p.epsBB); set(0, 2, p.epsAS); set(2, 2, p.epsSS);
      if (p.nDrug > 0) { set(4, 1, p.epsDB); set(4, 4, p.epsDD || 0); } break; // drug (type 4): oily, sits among the tails
    case 'polymer': set(3, 3, p.epsPP); break;
    case 'diblock': set(0, 0, 1); set(1, 1, 1); set(0, 1, p.epsAB); set(0, 2, 1); set(1, 2, 1); set(2, 2, 1); break;
    case 'demix': set(2, 2, 1); set(4, 4, 1); set(2, 4, p.epsSC); break;
    case 'hp': set(5, 5, p.epsHH); break;
    case 'crypt': set(5, 5, p.epsXX); break; // only sticky X beads attract (any chain); the fold itself is held by native contacts
    case 'lcst': set(3, 3, p.epsPP); break; // P-S: WCA core plus the narrow binding well below
    case 'ice': sig[7] = 0.7; sig[3] = p.sigSalt || 1.4; sig[4] = 0.7; set(7, 7, 0.1); set(4, 7, 0.1); set(4, 4, 0.1); set(3, 7, p.epsSalt !== undefined ? p.epsSalt : 1.0); break; // 4: ice seed, a water-sized molecule whose hydrogen bonds are seedHB times stronger // 3: antifreeze solute: twice the size of water (too big for the honeycomb holes), binds water, no hydrogen bonds
    // hydrophobic interactions added by hand, switched by temperature: cold, the solutes are attracted to water (epsW) and dissolve;
    // warm, that attraction fades and an attraction between nonpolar beads (epsH) grows, so they aggregate. MB water adds its own weaker effect.
    case 'plates': sig[7] = 0.7; sig[3] = p.sigP; set(7, 7, 0.1); set(3, 7, p.epsPW); set(3, 3, !p.epsPW && !p.plateHB ? E.hydroEps() : 0); break; // only water-fearing plates
    case 'mbpoly': sig[7] = 0.7; sig[3] = p.sigP; set(7, 7, 0.1); set(3, 7, p.epsPW + (p.epsW || 0) * (1 - E.hydroS())); set(3, 3, p.epsPP + E.hydroEps()); break;
    case 'brush': set(4, 4, p.epsLL); set(6, 4, p.epsQL); set(5, 4, p.epsHL); set(5, 5, p.epsCC); set(6, 6, p.epsCC); set(5, 6, p.epsCC); break;
  }
  E.sig = sig;
  E.sig2 = new Float64Array(64); E.eps = new Float64Array(64); E.rc2 = new Float64Array(64); E.shift = new Float64Array(64); E.r0 = new Float64Array(64);
  E.ljrc2 = new Float64Array(64); E.gEps = new Float64Array(64); E.gR0 = new Float64Array(64); E.gW2 = new Float64Array(64);
  let rcMax = 0;
  for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) {
    const k = (i << 3) | j, sg = 0.5 * (sig[i] + sig[j]), ea = att[i][j] || 0;
    let eps = 1, rc = Math.pow(2, 1 / 6) * sg;
    if (ea > 1e-6) { eps = ea; rc = 2.5 * sg; }
    const sr6 = Math.pow(sg / rc, 6);
    E.sig2[k] = sg * sg; E.eps[k] = eps; E.rc2[k] = rc * rc; E.ljrc2[k] = rc * rc; E.shift[k] = 4 * eps * (sr6 * sr6 - sr6);
    E.r0[k] = 0.95 * sg;
    // LCST: narrow Gaussian binding well between polymer and solvent, U = -eps_b exp(-(r - r_b)^2 / 2w^2)
    if (p.system === 'lcst' && ((i === 3 && j === 2) || (i === 2 && j === 3)) && p.epsB > 0) {
      E.gEps[k] = p.epsB; E.gR0[k] = p.rB; E.gW2[k] = p.wB * p.wB;
      const rg = p.rB + 4 * p.wB; if (rg > rc) { rc = rg; E.rc2[k] = rc * rc; }
    }
    // brush liquid: weak, broad extra cohesion between liquid beads (lowers vapour pressure, little force at contact)
    // plates with hydrogen-bonding sites: plate-water pairs need the hydrogen-bond range
    if (p.system === 'plates' && p.plateHB > 0 && ((i === 3 && j === 7) || (i === 7 && j === 3))) {
      const rh = p.mbR + 6 * p.mbSig; if (rh > rc) { rc = rh; E.rc2[k] = rc * rc; }
    }
    if (p.system === 'brush' && i === 4 && j === 4 && p.epsLg > 0) {
      E.gEps[k] = p.epsLg; E.gR0[k] = p.rLg; E.gW2[k] = p.wLg * p.wLg;
      const rg = p.rLg + 3 * p.wLg; if (rg > rc) { rc = rg; E.rc2[k] = rc * rc; }
    }
    if (rc > rcMax) rcMax = rc;
  }
  E.rcMax = Math.max(rcMax, 1.35 * sig[1], 1.6);
  if (E.head && Math.max(3, Math.floor(E.L / E.rcMax)) !== E.nc) E.setupCells();
};


MDEngine.prototype.setupCells = function () {
  const E = this;
  E.nc = Math.max(3, Math.floor(E.L / E.rcMax));
  E.cs = E.L / E.nc;
  E.head = new Int32Array(E.nc * E.nc); E.next = new Int32Array(E.N);
  E.buildCells();
};

MDEngine.prototype.buildCells = function () {
  const E = this, nc = E.nc, inv = 1 / E.cs; E.head.fill(-1);
  for (let i = 0; i < E.N; i++) {
    let cx = Math.floor(E.x[i] * inv), cy = Math.floor(E.y[i] * inv);
    if (cx >= nc) cx = nc - 1; if (cy >= nc) cy = nc - 1; if (cx < 0) cx = 0; if (cy < 0) cy = 0;
    const c = cy * nc + cx; E.next[i] = E.head[c]; E.head[c] = i;
  }
};

MDEngine.prototype.computeForces = function () {
  const E = this, L = E.L, hL = 0.5 * L, nc = E.nc;
  const x = E.x, y = E.y, fx = E.fx, fy = E.fy, type = E.type;
  const sig2 = E.sig2, eps = E.eps, rc2 = E.rc2, shift = E.shift, fmax = E.p.fmax, ljrc2 = E.ljrc2, gEps = E.gEps, gR0 = E.gR0, gW2 = E.gW2;
  fx.fill(0); fy.fill(0);
  E.buildCells();
  let U = 0, Uss = 0, Wv = 0; const sm = E.solvMask || 0; // Wv: pair virial sum r_ij.F_ij (for the pressure); Uss: energy of solvent-solvent pairs (background)
  // MB water: arm unit vectors at theta, theta + 120, theta + 240 degrees
  const mb = E.mb, th = E.th, tq = E.tq, arm = E.arm;
  const eHB0 = E.p.mbEps, seedHB = E.p.system === 'ice' ? (E.p.seedHB || 3) : 0, Rhb = E.p.mbR, s2 = E.p.mbSig * E.p.mbSig, i2s2 = 0.5 / s2, hbCut = 6 * E.p.mbSig;
  let nHB = 0; const hbN = E.hbN;
  if (mb) {
    tq.fill(0); if (hbN) hbN.fill(0);
    const C = -0.5, S = Math.sqrt(3) / 2;
    const sT = E.p.system === 'ice' ? 4 : 7; // ice seeds carry arms and bond like water (they do not turn)
    for (let i = 0; i < E.N; i++) if (type[i] === 7 || type[i] === sT) {
      const c = Math.cos(th[i]), s = Math.sin(th[i]), o = 6 * i;
      arm[o] = c; arm[o + 1] = s;
      arm[o + 2] = c * C - s * S; arm[o + 3] = s * C + c * S;
      arm[o + 4] = c * C + s * S; arm[o + 5] = s * C - c * S;
    }
  }
  // plates with hydrogen-bonding sites: each plate bead has two arms along the local plate normal (one per face).
  // The normal follows the neighbours, n = perp(x[b] - x[a]); torques on a site are passed to a and b as a force couple.
  const pHB = E.p.system === 'plates' && E.p.plateHB > 0 && mb ? E.p.plateHB : 0, Lp = E.Lc, nPl = pHB ? E.nMol * Lp : 0;
  if (pHB) {
    if (!E.parm || E.parm.length < 6 * nPl) { E.parm = new Float64Array(6 * nPl); }
    for (let i = 0; i < nPl; i++) { const q = i % Lp, a = q === 0 ? i : i - 1, b = q === Lp - 1 ? i : i + 1;
      let vx = x[b] - x[a], vy = y[b] - y[a]; if (vx > hL) vx -= L; else if (vx < -hL) vx += L; if (vy > hL) vy -= L; else if (vy < -hL) vy += L;
      const lv = Math.sqrt(vx * vx + vy * vy) || 1, o = 6 * i; E.parm[o] = -vy / lv; E.parm[o + 1] = vx / lv; E.parm[o + 2] = vy / lv; E.parm[o + 3] = -vx / lv;
      E.parm[o + 4] = a; E.parm[o + 5] = b; }
  }
  const parm = E.parm;
  const xIntra = E.p.system === 'crypt', LcX = E.Lc, nChX = E.Lc * E.nMol;
  const dnx = [0, 1, 1, 0, -1], dny = [0, 0, 1, 1, 1];
  const head = E.head, next = E.next;
  for (let cy = 0; cy < nc; cy++) for (let cx = 0; cx < nc; cx++) {
    const c = cy * nc + cx;
    for (let nb = 0; nb < 5; nb++) {
      const c2 = ((cy + dny[nb] + nc) % nc) * nc + ((cx + dnx[nb] + nc) % nc);
      for (let i = head[c]; i >= 0; i = next[i]) {
        const ti = type[i] << 3, xi = x[i], yi = y[i];
        for (let j = (nb === 0 ? next[i] : head[c2]); j >= 0; j = next[j]) {
          let dx = xi - x[j], dy = yi - y[j];
          if (dx > hL) dx -= L; else if (dx < -hL) dx += L;
          if (dy > hL) dy -= L; else if (dy < -hL) dy += L;
          const r2 = dx * dx + dy * dy; let k = ti | type[j];
          if (xIntra && k === 45 && i < nChX && j < nChX && ((i / LcX) | 0) === ((j / LcX) | 0)) k = 46; // crypt: sticky beads of the same protein only repel
          if (r2 >= rc2[k]) continue;
          let ff = 0;
          if (r2 < ljrc2[k]) {
            const sr2 = sig2[k] / r2, sr6 = sr2 * sr2 * sr2, e = eps[k];
            ff = 24 * e * sr6 * (2 * sr6 - 1) / r2;
            const up = 4 * e * sr6 * (sr6 - 1) - shift[k]; U += up;
            if (sm && (sm >> type[i] & 1) && (sm >> type[j] & 1)) Uss += up;
          }
          const r = Math.sqrt(r2);
          const ge = gEps[k];
          if (ge > 0) { const xx = r - gR0[k], ex = Math.exp(-0.5 * xx * xx / gW2[k]); ff -= ge * xx * ex / (gW2[k] * r); U -= ge * ex; if (sm && (sm >> type[i] & 1) && (sm >> type[j] & 1)) Uss -= ge * ex; }
          if (ff * r > fmax) ff = fmax / r;
          fx[i] += ff * dx; fy[i] += ff * dy; fx[j] -= ff * dx; fy[j] -= ff * dy; Wv += ff * r2;
          // MB hydrogen bond: U = -eHB G(r - R) sum_k G(i_k.u - 1) sum_l G(j_l.u + 1), u = unit vector i -> j
          if (mb && (k === 63 || (seedHB && (k === 39 || k === 60 || k === 36)))) { // water-water, or an ice seed (type 4, ice only) with stronger bonds
            const eHB = k === 63 ? eHB0 : eHB0 * seedHB, drr = r - Rhb;
            if (drr < hbCut && drr > -hbCut) {
              const Gr = Math.exp(-drr * drr * i2s2), ux = -dx / r, uy = -dy / r, oi = 6 * i, oj = 6 * j;
              let A = 0, Ad = 0, B = 0, Bd = 0;
              for (let a = 0; a < 6; a += 2) { // arms more than ~25 degrees off the bond contribute exp(-12) or less: skipped
                const ax = arm[oi + a], ay = arm[oi + a + 1], cA = ax * ux + ay * uy - 1, qA = cA * cA * i2s2;
                if (qA < 14) { const gA = Math.exp(-qA); A += gA; Ad += -cA / s2 * gA * (ay * ux - ax * uy); }
              }
              if (A > 1e-9) for (let a = 0; a < 6; a += 2) {
                const bx = arm[oj + a], by = arm[oj + a + 1], cB = bx * ux + by * uy + 1, qB = cB * cB * i2s2;
                if (qB < 14) { const gB = Math.exp(-qB); B += gB; Bd += -cB / s2 * gB * (by * ux - bx * uy); }
              }
              const uhb = -eHB * Gr * A * B;
              if (uhb < -1e-12) {
                U += uhb; if (sm & 128) Uss += uhb; if (uhb < -0.5 * eHB) { nHB++; if (hbN) { hbN[i]++; hbN[j]++; } }
                const dUdr = eHB * drr / s2 * Gr * A * B, dUda = -eHB * Gr * (Ad * B + A * Bd);
                const Fjx = -(dUdr * ux - dUda * uy / r), Fjy = -(dUdr * uy + dUda * ux / r);
                fx[j] += Fjx; fy[j] += Fjy; fx[i] -= Fjx; fy[i] -= Fjy; Wv -= Fjx * dx + Fjy * dy;
                tq[i] -= eHB * Gr * Ad * B; tq[j] -= eHB * Gr * A * Bd;
              }
            }
          } else if (pHB && (k === 31 || k === 59)) {
            // plate site P - water W hydrogen bond, same form as water-water with the plate's two fixed arms
            const P = k === 31 ? i : j, W = k === 31 ? j : i, sg = k === 31 ? -1 : 1; // u = unit vector P -> W
            const drr = r - Rhb;
            if (P < nPl && drr < hbCut && drr > -hbCut) {
              const Gr = Math.exp(-drr * drr * i2s2), ux = sg * dx / r, uy = sg * dy / r, op = 6 * P, ow = 6 * W;
              let A = 0, Ad = 0, B = 0, Bd = 0;
              for (let a = 0; a < 4; a += 2) { const ax = parm[op + a], ay = parm[op + a + 1], cA = ax * ux + ay * uy - 1, gA = Math.exp(-cA * cA * i2s2);
                A += gA; Ad += -cA / s2 * gA * (ay * ux - ax * uy); }
              for (let a = 0; a < 6; a += 2) { const bx = arm[ow + a], by = arm[ow + a + 1], cB = bx * ux + by * uy + 1, gB = Math.exp(-cB * cB * i2s2);
                B += gB; Bd += -cB / s2 * gB * (by * ux - bx * uy); }
              const uhb = -pHB * Gr * A * B;
              if (uhb < -1e-12) {
                U += uhb; if (uhb < -0.5 * pHB) { nHB++; if (hbN) hbN[W]++; }
                const dUdr = pHB * drr / s2 * Gr * A * B, dUda = -pHB * Gr * (Ad * B + A * Bd);
                const Fx = -(dUdr * ux - dUda * uy / r), Fy = -(dUdr * uy + dUda * ux / r);
                fx[W] += Fx; fy[W] += Fy; fx[P] -= Fx; fy[P] -= Fy;
                tq[W] -= pHB * Gr * A * Bd;
                const tP = -pHB * Gr * Ad * B, ia = parm[op + 4], ib = parm[op + 5];
                let vx = x[ib] - x[ia], vy = y[ib] - y[ia]; if (vx > hL) vx -= L; else if (vx < -hL) vx += L; if (vy > hL) vy -= L; else if (vy < -hL) vy += L;
                const l2 = vx * vx + vy * vy || 1, fq = tP / l2; // F_b = (tau / |v|) perp(v_hat), F_a = -F_b
                fx[ib] += -fq * vy; fy[ib] += fq * vx; fx[ia] -= -fq * vy; fy[ia] -= fq * vx;
              }
            }
          }
        }
      }
    }
  }
  // walls (brush): WCA wall at the substrate and a reflecting one high above the droplet
  if (E.walls) {
    const lo = E.walls.lo, hi = E.walls.hi, sw = E.walls.sig, rcw = sw * Math.pow(2, 1 / 6);
    for (let i = 0; i < E.N; i++) {
      let d = y[i] - lo;
      if (d < rcw) { d = Math.max(d, 0.35 * sw); const sr6 = Math.pow(sw / d, 6); fy[i] += 24 * sr6 * (2 * sr6 - 1) / d; U += 4 * sr6 * (sr6 - 1) + 1; }
      d = hi - y[i];
      if (d < rcw) { d = Math.max(d, 0.35 * sw); const sr6 = Math.pow(sw / d, 6); fy[i] -= 24 * sr6 * (2 * sr6 - 1) / d; U += 4 * sr6 * (sr6 - 1) + 1; }
    }
  }
  // gravity (brush): constant downward force on every mobile bead, U = g y
  const g = E.p.gravity;
  if (E.walls && g > 0) { const fixed = E.fixed; for (let i = 0; i < E.N; i++) { if (fixed && fixed[i]) continue; fy[i] -= g; U += g * y[i]; } }
  // bonds along each molecule
  const kb = E.p.kBond, r0t = E.r0, Lc = E.Lc;
  for (let m = 0; m < E.nMol; m++) {
    const base = m * Lc;
    for (let q = 0; q < Lc - 1; q++) {
      const i = base + q, j = i + 1;
      let dx = x[i] - x[j], dy = y[i] - y[j];
      if (dx > hL) dx -= L; else if (dx < -hL) dx += L;
      if (dy > hL) dy -= L; else if (dy < -hL) dy += L;
      const r = Math.sqrt(dx * dx + dy * dy), dr = r - r0t[(type[i] << 3) | type[j]];
      const ff = -kb * dr / r;
      fx[i] += ff * dx; fy[i] += ff * dy; fx[j] -= ff * dx; fy[j] -= ff * dy; Wv += ff * r * r;
      U += 0.5 * kb * dr * dr;
    }
  }
  // extra bonds (oligomer liquid of the brush system)
  if (E.bonds2) {
    const bl = E.bonds2, r0 = 0.95;
    for (let q = 0; q < bl.length; q += 2) {
      const i = bl[q], j = bl[q + 1];
      let dx = x[i] - x[j], dy = y[i] - y[j];
      if (dx > hL) dx -= L; else if (dx < -hL) dx += L;
      if (dy > hL) dy -= L; else if (dy < -hL) dy += L;
      const r = Math.sqrt(dx * dx + dy * dy), dr = r - r0, ff = -kb * dr / r;
      fx[i] += ff * dx; fy[i] += ff * dy; fx[j] -= ff * dx; fy[j] -= ff * dy;
      U += 0.5 * kb * dr * dr;
    }
  }
  // Go-like native contacts (crypt): U = eps [5 (r0/r)^12 - 6 (r0/r)^10], only between the native pairs of the same chain
  if (E.go && E.p.epsGo > 0) {
    const go = E.go, eg = E.p.epsGo;
    for (let m = 0; m < E.nMol; m++) { const base = m * Lc;
      for (let q = 0; q < go.length; q += 3) { const i = base + go[q], j = base + go[q + 1], r0 = go[q + 2];
        let dx = x[i] - x[j], dy = y[i] - y[j]; if (dx > hL) dx -= L; else if (dx < -hL) dx += L; if (dy > hL) dy -= L; else if (dy < -hL) dy += L;
        const r2 = dx * dx + dy * dy, rc = 1.8 * r0; if (r2 > rc * rc) continue;
        const q2 = r0 * r0 / r2, q10 = q2 * q2 * q2 * q2 * q2, q12 = q10 * q2, qc2 = 1 / (1.8 * 1.8), qc10 = Math.pow(qc2, 5);
        U += eg * (5 * q12 - 6 * q10) - eg * (5 * qc10 * qc2 - 6 * qc10);
        let ff = eg * 60 * (q12 - q10) / r2; if (ff * Math.sqrt(r2) > fmax) ff = fmax / Math.sqrt(r2);
        fx[i] += ff * dx; fy[i] += ff * dy; fx[j] -= ff * dx; fy[j] -= ff * dy; Wv += ff * r2; } }
  }
  // bending (depends on angles only, so it adds nothing to the virial): U = k (1 - cos a), a = angle between consecutive bond vectors (0 for a straight chain)
  const kB = E.p.kBend;
  if ((E.p.system === 'polymer' || E.p.system === 'brush' || E.p.system === 'plates') && kB > 0) {
    for (let m = 0; m < E.nMol; m++) {
      const base = m * Lc;
      for (let q = 0; q < Lc - 2; q++) {
        const i = base + q, j = i + 1, l = i + 2;
        let ax = x[j] - x[i], ay = y[j] - y[i], bx = x[l] - x[j], by = y[l] - y[j];
        if (ax > hL) ax -= L; else if (ax < -hL) ax += L;
        if (ay > hL) ay -= L; else if (ay < -hL) ay += L;
        if (bx > hL) bx -= L; else if (bx < -hL) bx += L;
        if (by > hL) by -= L; else if (by < -hL) by += L;
        const na2 = ax * ax + ay * ay, nb2 = bx * bx + by * by, inv = 1 / Math.sqrt(na2 * nb2);
        const cs = (ax * bx + ay * by) * inv;
        const g1x = bx * inv - cs * ax / na2, g1y = by * inv - cs * ay / na2;
        const g2x = ax * inv - cs * bx / nb2, g2y = ay * inv - cs * by / nb2;
        fx[i] -= kB * g1x; fy[i] -= kB * g1y;
        fx[l] += kB * g2x; fy[l] += kB * g2y;
        fx[j] += kB * (g1x - g2x); fy[j] += kB * (g1y - g2y);
        U += kB * (1 - cs);
      }
    }
  }
  E.U = U; E.Uss = Uss; E.nHB = nHB; E.W = Wv;
};

MDEngine.prototype.wrap = function () {
  const E = this, L = E.L, x = E.x, y = E.y;
  for (let i = 0; i < E.N; i++) {
    if (x[i] >= L) x[i] -= L; else if (x[i] < 0) x[i] += L;
    if (y[i] >= L) y[i] -= L; else if (y[i] < 0) y[i] += L;
  }
};

MDEngine.prototype.kinetic = function () {
  const E = this; let K = 0;
  for (let i = 0; i < E.N; i++) K += E.vx[i] * E.vx[i] + E.vy[i] * E.vy[i];
  return 0.5 * K;
};
MDEngine.prototype.nWater = function () { if (!this.mb) return 0; let n = 0; for (let i = 0; i < this.N; i++) if (this.type[i] === 7) n++; return n; };
MDEngine.prototype.rotKinetic = function () {
  const E = this; if (!E.mb) return 0; let K = 0;
  for (let i = 0; i < E.N; i++) if (E.type[i] === 7) K += E.om[i] * E.om[i];
  return 0.5 * E.p.mbI * K;
};
// Kinetic temperature from translational and (MB water) rotational degrees of freedom.
MDEngine.prototype.nRot = function () { return this.nWater(); };
MDEngine.prototype.dof = function () { return this.fixed ? 2 * (this.N - this.nFixed) + this.nRot() : 2 * this.N - 2 + this.nRot(); };
MDEngine.prototype.tempKin = function () {
  const nf = this.dof();
  return 2 * (this.kinetic() + this.rotKinetic()) / nf;
};

// Instantaneous pressure from the virial (2D): P = (2 K + sum r_ij.F_ij) / (2 A). Walls and gravity are not included,
// so it is only meaningful for the fully periodic systems.
MDEngine.prototype.pressure = function () { return (2 * this.kinetic() + (this.W || 0)) / (2 * this.L * this.L); };
// Barostat (Berendsen-type, isotropic): every nB steps the box area relaxes towards the target pressure,
// d ln A / dt = -(beta / tauP) (P0 - P), driven by the pressure smoothed over about 2 time units so the box changes
// slowly and without jitter. Coordinates are scaled about the origin; the view keeps the box centre fixed on screen.
MDEngine.prototype.baroStep = function (nB) {
  const E = this, p = E.p, dt = p.dt * nB;
  const P = E.pressure(); E.Pema = E.Pema === undefined ? P : E.Pema + (1 - Math.exp(-dt / 2.0)) * (P - E.Pema);
  if (!p.baro) { E.p0wait = 0; return; }
  if (p.P0 === null || p.P0 === undefined) { if (++E.p0wait < 40) return; p.P0 = E.Pema; } // first hold the pressure the box has after ~2 time units
  const L0 = E.L0 || E.L, rate = (p.baroK || 0.02) * (E.Pema - p.P0); // area grows when the pressure is above the target
  let lam = Math.exp(Math.max(-0.002, Math.min(0.002, 0.5 * rate * dt))); // length scale factor, capped at 0.2% per call
  const Ln = Math.max(0.6 * L0, Math.min(1.5 * L0, E.L * lam)); lam = Ln / E.L;
  if (lam === 1) return;
  const x = E.x, y = E.y, fx0 = E.fixed;
  if (fx0 && E.nFixed && E.wallIds) { // the pinned ice wall keeps its own lattice spacing: it moves with the box as one rigid piece
    let mx = 0, my = 0; const ids = E.wallIds; for (const i of ids) { mx += x[i]; my += y[i]; } mx /= ids.length; my /= ids.length;
    const dx = mx * (lam - 1), dy = my * (lam - 1);
    for (let i = 0; i < E.N; i++) { if (fx0[i]) { x[i] += dx; y[i] += dy; } else { x[i] *= lam; y[i] *= lam; } }
  } else for (let i = 0; i < E.N; i++) { x[i] *= lam; y[i] *= lam; }
  E.L = Ln; E.wrap();
  const nc = Math.max(3, Math.floor(E.L / E.rcMax)); if (nc !== E.nc) { E.nc = nc; E.head = new Int32Array(nc * nc); } E.cs = E.L / E.nc;
  E.computeForces();
};

// One MD step. Langevin: BAOAB splitting. Bussi: velocity Verlet + CSVR rescale.
MDEngine.prototype.step = function () {
  const E = this, p = E.p, N = E.N, dt = p.dt, hdt = 0.5 * dt;
  const x = E.x, y = E.y, vx = E.vx, vy = E.vy, fx = E.fx, fy = E.fy;
  const mb = E.mb, th = E.th, om = E.om, tq = E.tq, type = E.type, iI = 1 / p.mbI, sT = 7; // only water turns (ice seeds are pinned)
  if (p.thermostat === 'langevin') {
    const c1 = Math.exp(-p.gamma * dt), c2 = Math.sqrt((1 - c1 * c1) * p.T), c2r = Math.sqrt((1 - c1 * c1) * p.T * iI);
    const fixed = E.fixed;
    // drug game: the solvent flows along x at speed flowU (friction pulls velocities towards the stream), and only a vertical
    // band (the tumour, hotBand = {x0, w, Tout}) is at the set temperature; elsewhere the thermostat holds Tout
    const hb = p.hotBand, cu = (1 - c1) * (p.flowU || 0), c2o = hb ? Math.sqrt((1 - c1 * c1) * hb.Tout) : c2, Lb = E.L;
    for (let i = 0; i < N; i++) {
      if (fixed && fixed[i]) continue;
      vx[i] += hdt * fx[i]; vy[i] += hdt * fy[i];
      x[i] += hdt * vx[i]; y[i] += hdt * vy[i];
      let cc = c2; if (hb) { let bx = x[i] - hb.x0; bx -= Lb * Math.floor(bx / Lb); if (bx >= hb.w) cc = c2o; }
      vx[i] = c1 * vx[i] + cu + cc * (3.4641016 * E.rand() - 1.7320508); vy[i] = c1 * vy[i] + cc * (3.4641016 * E.rand() - 1.7320508); // uniform noise, unit variance (Duenweg & Paul 1991): same temperature, much cheaper than Gaussian
      x[i] += hdt * vx[i]; y[i] += hdt * vy[i];
      if (mb && (type[i] === 7 || type[i] === sT)) {
        om[i] += hdt * tq[i] * iI; th[i] += hdt * om[i];
        om[i] = c1 * om[i] + c2r * (3.4641016 * E.rand() - 1.7320508); th[i] += hdt * om[i];
      }
    }
    E.wrap(); E.computeForces();
    for (let i = 0; i < N; i++) { if (fixed && fixed[i]) continue; vx[i] += hdt * fx[i]; vy[i] += hdt * fy[i]; }
    if (mb) for (let i = 0; i < N; i++) if (type[i] === 7 || type[i] === sT) om[i] += hdt * tq[i] * iI;
  } else {
    const fixed = E.fixed;
    for (let i = 0; i < N; i++) {
      if (fixed && fixed[i]) continue;
      vx[i] += hdt * fx[i]; vy[i] += hdt * fy[i];
      x[i] += dt * vx[i]; y[i] += dt * vy[i];
      if (mb && (type[i] === 7 || type[i] === sT)) { om[i] += hdt * tq[i] * iI; th[i] += dt * om[i]; }
    }
    E.wrap(); E.computeForces();
    for (let i = 0; i < N; i++) { if (fixed && fixed[i]) continue; vx[i] += hdt * fx[i]; vy[i] += hdt * fy[i]; }
    if (mb) for (let i = 0; i < N; i++) if (type[i] === 7 || type[i] === sT) om[i] += hdt * tq[i] * iI;
    if (p.thermostat === 'none') { E.time += dt; E.steps++; return; } // plain NVE, for testing
    const Nf = E.dof(), K = E.kinetic() + E.rotKinetic(), Kt = 0.5 * Nf * p.T;
    if (K > 0) {
      const c = Math.exp(-dt / p.tau), R1 = E.gauss();
      const sumR = (Nf - 1) + Math.sqrt(2 * (Nf - 1)) * E.gauss(); // chi^2_{Nf-1}, normal approx
      const a = Kt / (Nf * K) * (1 - c);
      let al2 = c + a * (R1 * R1 + sumR) + 2 * Math.sqrt(c * a) * R1;
      if (al2 < 0) al2 = 0; const al = Math.sqrt(al2);
      for (let i = 0; i < N; i++) { vx[i] *= al; vy[i] *= al; om[i] *= al; }
    }
  }
  E.time += dt; E.steps++;
  if (E.steps % 10 === 0) E.baroStep(10);
  if ((p.epsH || p.epsW) && Math.abs(p.T - E._tabT) > 0.002) E.setupTable(); // temperature-dependent hydrophobic attraction
};

// Dumbbells: tail-tail clusters (union-find over B beads, contact r < rcut).
MDEngine.prototype.clusters = function (rcut, minSize, btype) {
  if (btype === undefined) btype = 1;
  const E = this, nM = E.nMol, L = E.L, hL = 0.5 * L, rc2 = rcut * rcut, Lc = E.Lc;
  const par = new Int32Array(nM); for (let m = 0; m < nM; m++) par[m] = m;
  const find = (a) => { while (par[a] !== a) { par[a] = par[par[a]]; a = par[a]; } return a; };
  const nc = E.nc, head = E.head, next = E.next, type = E.type, x = E.x, y = E.y;
  for (let cy = 0; cy < nc; cy++) for (let cx = 0; cx < nc; cx++) {
    const c = cy * nc + cx;
    for (let i = head[c]; i >= 0; i = next[i]) {
      if (type[i] !== btype) continue;
      for (let ddy = -1; ddy <= 1; ddy++) for (let ddx = -1; ddx <= 1; ddx++) {
        const c2 = ((cy + ddy + nc) % nc) * nc + ((cx + ddx + nc) % nc);
        for (let j = head[c2]; j >= 0; j = next[j]) {
          if (j <= i || type[j] !== btype) continue;
          let dx = x[i] - x[j], dy = y[i] - y[j];
          if (dx > hL) dx -= L; else if (dx < -hL) dx += L;
          if (dy > hL) dy -= L; else if (dy < -hL) dy += L;
          if (dx * dx + dy * dy < rc2) { const a = find((i / Lc) | 0), b = find((j / Lc) | 0); if (a !== b) par[a] = b; }
        }
      }
    }
  }
  const size = new Int32Array(nM), label = new Int32Array(nM);
  for (let m = 0; m < nM; m++) { label[m] = find(m); size[label[m]]++; }
  let nAgg = 0, inAgg = 0, largest = 0;
  for (let m = 0; m < nM; m++) { if (size[m] >= minSize) { nAgg++; inAgg += size[m]; } if (size[m] > largest) largest = size[m]; }
  return { label, size, nAgg, fracAgg: nM ? inAgg / nM : 0, meanAgg: nAgg ? inAgg / nAgg : 0, largest };
};

// Polymer: local 2D crystallinity from bond-orientational order psi6 over P-P neighbours.
// A bead is crystalline when it has >= minBonds neighbours whose psi6 phase agrees (Re(q_i q_j*)/|q_i||q_j| > 0.7).
// Crystallites = connected crystalline beads; counted when size >= minCluster.
MDEngine.prototype.crystal = function (rcut, minBonds, minCluster, qmin, dmin) {
  if (qmin === undefined) qmin = 0.6; if (dmin === undefined) dmin = 0.75;
  const E = this, N = E.N, L = E.L, hL = 0.5 * L, rc2 = rcut * rcut, MAXN = 10;
  if (!E._nb || E._nb.length < N * MAXN) {
    E._nb = new Int32Array(N * MAXN); E._nn = new Uint8Array(N); E._qr = new Float64Array(N); E._qi = new Float64Array(N);
    E._cr = new Uint8Array(N); E._par = new Int32Array(N);
  }
  const nb = E._nb, nn = E._nn, qr = E._qr, qi = E._qi, cr = E._cr, par = E._par;
  const nP = E.Lc * E.nMol; nn.fill(0, 0, nP); qr.fill(0, 0, nP); qi.fill(0, 0, nP); cr.fill(0, 0, nP);
  const nc = E.nc, head = E.head, next = E.next, type = E.type, x = E.x, y = E.y;
  for (let cy = 0; cy < nc; cy++) for (let cx = 0; cx < nc; cx++) {
    for (let i = head[cy * nc + cx]; i >= 0; i = next[i]) {
      if (type[i] !== 3) continue;
      for (let ddy = -1; ddy <= 1; ddy++) for (let ddx = -1; ddx <= 1; ddx++) {
        const c2 = ((cy + ddy + nc) % nc) * nc + ((cx + ddx + nc) % nc);
        for (let j = head[c2]; j >= 0; j = next[j]) {
          if (j === i || type[j] !== 3) continue;
          let dx = x[j] - x[i], dy = y[j] - y[i];
          if (dx > hL) dx -= L; else if (dx < -hL) dx += L;
          if (dy > hL) dy -= L; else if (dy < -hL) dy += L;
          if (dx * dx + dy * dy >= rc2) continue;
          if (nn[i] < MAXN) nb[i * MAXN + nn[i]++] = j;
          const th = 6 * Math.atan2(dy, dx); qr[i] += Math.cos(th); qi[i] += Math.sin(th);
        }
      }
    }
  }
  for (let i = 0; i < nP; i++) if (nn[i]) { qr[i] /= nn[i]; qi[i] /= nn[i]; }
  let nCr = 0;
  for (let i = 0; i < nP; i++) {
    if (nn[i] < 4) continue;
    const ai = Math.hypot(qr[i], qi[i]); if (ai < qmin || ai < 1e-9) continue;
    let bonds = 0;
    for (let q = 0; q < nn[i]; q++) {
      const j = nb[i * MAXN + q]; if (nn[j] < 4) continue;
      const aj = Math.hypot(qr[j], qi[j]); if (aj < qmin || aj < 1e-9) continue;
      if ((qr[i] * qr[j] + qi[i] * qi[j]) / (ai * aj) > dmin) bonds++;
    }
    if (bonds >= minBonds) { cr[i] = 1; nCr++; }
  }
  const find = (a) => { while (par[a] !== a) { par[a] = par[par[a]]; a = par[a]; } return a; };
  for (let i = 0; i < nP; i++) par[i] = i;
  for (let i = 0; i < nP; i++) if (cr[i]) for (let q = 0; q < nn[i]; q++) {
    const j = nb[i * MAXN + q]; if (cr[j]) { const a = find(i), b = find(j); if (a !== b) par[a] = b; }
  }
  const size = new Int32Array(nP);
  for (let i = 0; i < nP; i++) if (cr[i]) size[find(i)]++;
  let nCl = 0, inCl = 0, largest = 0;
  for (let i = 0; i < nP; i++) { if (size[i] >= minCluster) { nCl++; inCl += size[i]; } if (size[i] > largest) largest = size[i]; }
  for (let i = 0; i < nP; i++) if (cr[i] && size[find(i)] < minCluster) cr[i] = 0;
  return { cryst: cr, frac: nP ? inCl / nP : 0, nCl, largest, meanCl: nCl ? inCl / nCl : 0 };
};

// Mean radius of gyration of the molecules (chains unwrapped along their bonds).
MDEngine.prototype.meanRg = function () {
  const E = this, L = E.L, hL = L / 2, Lc = E.Lc, x = E.x, y = E.y; let sum = 0;
  for (let m = 0; m < E.nMol; m++) {
    const b = m * Lc; let X = x[b], Y = y[b], sx = X, sy = Y, sxx = X * X + Y * Y;
    for (let k = 1; k < Lc; k++) {
      let dx = x[b + k] - x[b + k - 1], dy = y[b + k] - y[b + k - 1];
      if (dx > hL) dx -= L; else if (dx < -hL) dx += L;
      if (dy > hL) dy -= L; else if (dy < -hL) dy += L;
      X += dx; Y += dy; sx += X; sy += Y; sxx += X * X + Y * Y;
    }
    sum += Math.sqrt(Math.max(0, sxx / Lc - (sx * sx + sy * sy) / (Lc * Lc)));
  }
  return E.nMol ? sum / E.nMol : 0;
};

// Visit every non-bonded neighbour pair (i<j) within rcut; fn(i, j).
MDEngine.prototype.forPairs = function (rcut, fn) {
  const E = this, L = E.L, hL = 0.5 * L, rc2 = rcut * rcut, nc = E.nc, head = E.head, next = E.next, x = E.x, y = E.y;
  const nCh = E.Lc * E.nMol, Lc = E.Lc;
  for (let cy = 0; cy < nc; cy++) for (let cx = 0; cx < nc; cx++) {
    for (let i = head[cy * nc + cx]; i >= 0; i = next[i]) {
      for (let ddy = -1; ddy <= 1; ddy++) for (let ddx = -1; ddx <= 1; ddx++) {
        const c2 = ((cy + ddy + nc) % nc) * nc + ((cx + ddx + nc) % nc);
        for (let j = head[c2]; j >= 0; j = next[j]) {
          if (j <= i) continue;
          if (j - i === 1 && j < nCh && ((i / Lc) | 0) === ((j / Lc) | 0)) continue; // bonded
          let dx = x[i] - x[j], dy = y[i] - y[j];
          if (dx > hL) dx -= L; else if (dx < -hL) dx += L;
          if (dy > hL) dy -= L; else if (dy < -hL) dy += L;
          const d2 = dx * dx + dy * dy; if (d2 < rc2) fn(i, j, d2);
        }
      }
    }
  }
};
// Like/unlike contacts among beads of types ta and tb (bonded pairs excluded).
// s = (f_like - f_random) / (1 - f_random): 0 for an ideal mixture, 1 for complete segregation.
MDEngine.prototype.mixing = function (ta, tb, rcut, interOnly) {
  const E = this, type = E.type, N = E.N, Lc = E.Lc, nCh = E.Lc * E.nMol;
  let na = 0, nb = 0; for (let i = 0; i < N; i++) { if (type[i] === ta) na++; else if (type[i] === tb) nb++; }
  if (!E._iface || E._iface.length < N) E._iface = new Uint8Array(N);
  const iface = E._iface; iface.fill(0);
  let like = 0, unlike = 0;
  E.forPairs(rcut, (i, j) => {
    const a = type[i], b = type[j];
    if ((a !== ta && a !== tb) || (b !== ta && b !== tb)) return;
    if (interOnly && i < nCh && j < nCh && ((i / Lc) | 0) === ((j / Lc) | 0)) return;
    if (a === b) like++; else { unlike++; iface[i] = 1; iface[j] = 1; }
  });
  const tot = like + unlike, n = na + nb, fr = n ? (na * na + nb * nb) / (n * n) : 1;
  const fl = tot ? like / tot : 1;
  let ni = 0; for (let i = 0; i < N; i++) if (iface[i]) ni++;
  return { s: fr < 1 ? Math.max(0, Math.min(1, (fl - fr) / (1 - fr))) : 0, unlikePerBead: n ? 2 * unlike / n : 0, ifaceFrac: n ? ni / n : 0, na, nb };
};
// HP chains: H beads with >= 2 non-bonded H neighbours count as buried; also intra/inter-chain H-H contacts.
MDEngine.prototype.hpStats = function (rcut) {
  const E = this, type = E.type, Lc = E.Lc, nCh = Lc * E.nMol;
  if (!E._hn || E._hn.length < E.N) E._hn = new Uint8Array(E.N);
  const hn = E._hn; hn.fill(0, 0, nCh);
  let intra = 0, inter = 0, nH = 0;
  for (let i = 0; i < nCh; i++) if (type[i] === 5) nH++;
  E.forPairs(rcut, (i, j) => {
    if (type[i] !== 5 || type[j] !== 5) return;
    hn[i]++; hn[j]++;
    if (((i / Lc) | 0) === ((j / Lc) | 0)) intra++; else inter++;
  });
  let buried = 0; for (let i = 0; i < nCh; i++) if (type[i] === 5 && hn[i] >= 2) buried++;
  return { buried: nH ? buried / nH : 0, intra: E.nMol ? intra / E.nMol : 0, inter, nH };
};
// Cryptic sites: folded share (core beads H/X with >= 2 core neighbours of the same chain), X beads touching solvent,
// inter-chain X-X contacts, and aggregates = chains linked by inter-chain core (H/X) contacts.
MDEngine.prototype.cryptStats = function (rcut) {
  const E = this, type = E.type, Lc = E.Lc, nM = E.nMol, nCh = Lc * nM, x = E.x, y = E.y, L = E.L, go = E.go || [];
  let nat = 0, tot = 0;
  for (let m = 0; m < nM; m++) for (let q = 0; q < go.length; q += 3) { const i = m * Lc + go[q], j = m * Lc + go[q + 1];
    let dx = x[i] - x[j], dy = y[i] - y[j]; dx -= L * Math.round(dx / L); dy -= L * Math.round(dy / L); tot++; if (dx * dx + dy * dy < 1.44 * go[q + 2] * go[q + 2]) nat++; }
  if (!E._xs || E._xs.length < E.N) E._xs = new Uint8Array(E.N);
  const xs = E._xs; xs.fill(0, 0, nCh);
  const par = new Int32Array(nM); for (let m = 0; m < nM; m++) par[m] = m;
  const find = (a) => { while (par[a] !== a) { par[a] = par[par[a]]; a = par[a]; } return a; };
  let xx = 0, nX = 0; for (let i = 0; i < nCh; i++) if (type[i] === 5) nX++;
  E.forPairs(rcut, (i, j, d2) => {
    const a = type[i], b = type[j], ci = i < nCh, cj = j < nCh;
    if (!(ci && cj) && d2 > 1.3) return; // solvent touching: first shell only
    if (ci && cj) { if (a !== 5 || b !== 5) return; const mi = (i / Lc) | 0, mj = (j / Lc) | 0; if (mi === mj) return;
      xx++; const ri = find(mi), rj = find(mj); if (ri !== rj) par[ri] = rj; }
    else if (ci && a === 5 && b === 2) xs[i] = 1; else if (cj && b === 5 && a === 2) xs[j] = 1;
  });
  let xExp = 0; for (let i = 0; i < nCh; i++) if (type[i] === 5 && xs[i]) xExp++;
  const size = new Int32Array(nM); for (let m = 0; m < nM; m++) size[find(m)]++;
  let inAgg = 0, largest = 1; for (let m = 0; m < nM; m++) { if (size[find(m)] >= 2) inAgg++; if (size[m] > largest) largest = size[m]; }
  const label = new Int32Array(nM); for (let m = 0; m < nM; m++) label[m] = find(m);
  return { folded: tot ? nat / tot : 0, exposed: nX ? xExp / nX : 0, xx, agg: nM ? inAgg / nM : 0, largest, label, size };
};
// Drug delivery (dumbbell + drug beads, type 4): a drug bead is held when at least `need` tail beads (B) touch it.
MDEngine.prototype.drugStats = function (rcut, need) {
  const E = this, type = E.type, nd = need || 2;
  if (!E._dn || E._dn.length < E.N) E._dn = new Uint8Array(E.N);
  const cnt = E._dn; cnt.fill(0);
  let nD = 0; for (let i = 0; i < E.N; i++) if (type[i] === 4) nD++;
  E.forPairs(rcut || 1.5, (i, j) => { const a = type[i], b = type[j];
    if (a === 4 && b === 1 && cnt[i] < 255) cnt[i]++; else if (b === 4 && a === 1 && cnt[j] < 255) cnt[j]++; });
  let held = 0; for (let i = 0; i < E.N; i++) if (type[i] === 4 && cnt[i] >= nd) held++;
  return { n: nD, held, released: nD - held, frac: nD ? (nD - held) / nD : 0, cnt };
};
// Rescue (crypt): per protein, the fraction of native contacts formed (q) and whether it touches another protein with a
// sticky (X-X) contact. A protein is rescued when q >= qMin and it touches no other protein.
MDEngine.prototype.rescueStats = function (rcut, qMin) {
  const E = this, type = E.type, Lc = E.Lc, nM = E.nMol, nCh = Lc * nM, x = E.x, y = E.y, L = E.L, go = E.go || [], qm = qMin || 0.5;
  const q = new Float64Array(nM), stuck = new Uint8Array(nM), nG = go.length / 3;
  for (let m = 0; m < nM; m++) { let nat = 0;
    for (let k = 0; k < go.length; k += 3) { const i = m * Lc + go[k], j = m * Lc + go[k + 1];
      let dx = x[i] - x[j], dy = y[i] - y[j]; dx -= L * Math.round(dx / L); dy -= L * Math.round(dy / L); if (dx * dx + dy * dy < 1.44 * go[k + 2] * go[k + 2]) nat++; }
    q[m] = nG ? nat / nG : 0; }
  E.forPairs(rcut || 1.5, (i, j) => { if (i >= nCh || j >= nCh || type[i] !== 5 || type[j] !== 5) return;
    const a = (i / Lc) | 0, b = (j / Lc) | 0; if (a !== b) { stuck[a] = 1; stuck[b] = 1; } });
  let rescued = 0, folded = 0, nStuck = 0; const ok = new Uint8Array(nM);
  for (let m = 0; m < nM; m++) { if (q[m] >= qm) folded++; if (stuck[m]) nStuck++; if (q[m] >= qm && !stuck[m]) { rescued++; ok[m] = 1; } }
  return { rescued, folded, stuck: nStuck, q, ok, n: nM };
};
// Gel path (crypt): graph of proteins linked by sticky (X-X) contacts between different proteins. In the largest
// connected cluster, find the longest shortest path (double breadth-first search) and its length along protein centres.
MDEngine.prototype.gelPath = function (rcut, minLinks) {
  const E = this, type = E.type, Lc = E.Lc, nM = E.nMol, nCh = Lc * nM, L = E.L, x = E.x, y = E.y, need = minLinks || 2;
  const adj = []; for (let m = 0; m < nM; m++) adj.push(new Set());
  const cnt = new Map(); // a link needs at least `need` sticky contacts between the two proteins (a passing touch is not a bond)
  E.forPairs(rcut || 1.5, (i, j) => { if (i >= nCh || j >= nCh || type[i] !== 5 || type[j] !== 5) return;
    let a = (i / Lc) | 0, b = (j / Lc) | 0; if (a === b) return; if (a > b) { const s = a; a = b; b = s; }
    const key = a * nM + b, c = (cnt.get(key) || 0) + 1; cnt.set(key, c); if (c === need) { adj[a].add(b); adj[b].add(a); } });
  // protein centres (periodic circular mean)
  const cx = new Float64Array(nM), cy = new Float64Array(nM), k = 2 * Math.PI / L;
  for (let m = 0; m < nM; m++) { let sx = 0, sy = 0, sc = 0, ss = 0;
    for (let q = 0; q < Lc; q++) { const i = m * Lc + q; sx += Math.cos(k * x[i]); sy += Math.sin(k * x[i]); sc += Math.cos(k * y[i]); ss += Math.sin(k * y[i]); }
    cx[m] = ((Math.atan2(sy, sx) / k) + L) % L; cy[m] = ((Math.atan2(ss, sc) / k) + L) % L; }
  const bfs = (s) => { const d = new Int32Array(nM).fill(-1), pr = new Int32Array(nM).fill(-1), q = [s]; d[s] = 0; let far = s;
    for (let h = 0; h < q.length; h++) { const u = q[h]; if (d[u] > d[far]) far = u; for (const v of adj[u]) if (d[v] < 0) { d[v] = d[u] + 1; pr[v] = u; q.push(v); } }
    return { d, pr, far, comp: q }; };
  const seen = new Uint8Array(nM); let best = { path: [], len: 0, size: 1 };
  for (let s = 0; s < nM; s++) { if (seen[s]) continue; const A = bfs(s); for (const u of A.comp) seen[u] = 1; if (A.comp.length < 2) continue;
    const B = bfs(A.far), C = bfs(B.far); const path = []; for (let u = C.far; u >= 0; u = C.pr[u]) path.push(u);
    let len = 0; for (let h = 1; h < path.length; h++) { let dx = cx[path[h]] - cx[path[h - 1]], dy = cy[path[h]] - cy[path[h - 1]]; dx -= L * Math.round(dx / L); dy -= L * Math.round(dy / L); len += Math.hypot(dx, dy); }
    if (len > best.len) best = { path, len, size: A.comp.length }; }
  best.cx = cx; best.cy = cy; return best;
};
// LCST: how desolvated the polymer is. f = P-P / (P-P + P-S) non-bonded contacts of polymer beads.
// Solvent within 2w of the binding-well centre counts as bound.
MDEngine.prototype.lcstStats = function (rcut) {
  const E = this, type = E.type, x = E.x, y = E.y, L = E.L, hL = L / 2, p = E.p;
  const lo = p.rB - 2 * p.wB, hi = p.rB + 2 * p.wB;
  if (!E._bound || E._bound.length < E.N) E._bound = new Uint8Array(E.N);
  const bound = E._bound; bound.fill(0);
  let pp = 0, ps = 0, nb = 0, nP = 0, nS = 0;
  for (let i = 0; i < E.N; i++) { if (type[i] === 3) nP++; else if (type[i] === 2) nS++; }
  E.forPairs(rcut, (i, j) => {
    const a = type[i], b = type[j];
    if (a === 3 && b === 3) { pp++; return; }
    if (!((a === 3 && b === 2) || (a === 2 && b === 3))) return;
    ps++;
    let dx = x[i] - x[j], dy = y[i] - y[j];
    if (dx > hL) dx -= L; else if (dx < -hL) dx += L;
    if (dy > hL) dy -= L; else if (dy < -hL) dy += L;
    const r = Math.sqrt(dx * dx + dy * dy);
    if (r > lo && r < hi) { nb++; bound[a === 2 ? i : j] = 1; }
  });
  let nBoundS = 0; for (let i = 0; i < E.N; i++) if (bound[i]) nBoundS++;
  const ppB = nP ? 2 * pp / nP : 0, psB = nP ? ps / nP : 0;
  return { f: ppB + psB > 0 ? ppB / (ppB + psB) : 0, ppPerBead: ppB, psPerBead: psB,
    boundPerBead: nP ? nb / nP : 0, boundSolvFrac: nS ? nBoundS / nS : 0, bound };
};
// Ice: a molecule is ice-like when it and all molecules within the first shell hold 3 hydrogen bonds
// (fraction of fully bonded molecules alone is also high in cold liquid patches, so require the neighbours too).
MDEngine.prototype.countType = function (t) { let n = 0; for (let i = 0; i < this.N; i++) if (this.type[i] === t) n++; return n; };
MDEngine.prototype.iceStats = function () {
  const E = this, N = E.N, h = E.hbN; if (!h) return { ice: 0, hbPerWater: 0, full: 0 };
  const ok = new Uint8Array(N); for (let i = 0; i < N; i++) ok[i] = h[i] >= 3 ? 1 : 0;
  const bad = new Uint8Array(N);
  E.forPairs(1.25, (i, j) => { if (!ok[j]) bad[i] = 1; if (!ok[i]) bad[j] = 1; });
  let nIce = 0, nFull = 0, nW = 0; for (let i = 0; i < N; i++) { if (E.type[i] !== 7) continue; nW++; if (ok[i]) { nFull++; if (!bad[i]) nIce++; } }
  const isIce = new Uint8Array(N); for (let i = 0; i < N; i++) isIce[i] = E.type[i] === 7 && ok[i] && !bad[i] ? 1 : 0;
  nW = nW || 1; return { ice: nIce / nW, full: nFull / nW, hbPerWater: 2 * E.nHB / nW, isIce, nWater: nW, nSalt: E.countType(3) };
};
// MB system: hydrogen bonds per water; polymer self-contact fraction and water contacts per polymer bead.
MDEngine.prototype.mbStats = function (rcut) {
  const E = this, type = E.type; let pp = 0, pw = 0, nP = 0;
  for (let i = 0; i < E.N; i++) if (type[i] === 3) nP++;
  E.forPairs(rcut, (i, j) => {
    const a = type[i], b = type[j];
    if (a === 3 && b === 3) pp++;
    else if ((a === 3 && b === 7) || (a === 7 && b === 3)) pw++;
  });
  const nW = E.nWater(), ppB = nP ? 2 * pp / nP : 0, pwB = nP ? pw / nP : 0;
  return { hbPerWater: nW ? 2 * E.nHB / nW : 0, f: ppB + pwB > 0 ? ppB / (ppB + pwB) : 0, waterPerBead: pwB };
};
// Hydration shell (MB systems): water within rs of a nonpolar bead. Returns shell size and hydrogen bonds per molecule
// in the shell and in the bulk, plus a per-molecule shell mask for drawing.
MDEngine.prototype.shellStats = function (rs) {
  const E = this, N = E.N, type = E.type, h = E.hbN;
  if (!E._sh || E._sh.length < N) E._sh = new Uint8Array(N);
  const sh = E._sh; sh.fill(0);
  E.forPairs(rs || 1.15, (i, j) => { if (type[i] === 3 && type[j] === 7) sh[j] = 1; else if (type[j] === 3 && type[i] === 7) sh[i] = 1; });
  let nS = 0, hS = 0, nB = 0, hB = 0;
  for (let i = 0; i < N; i++) if (type[i] === 7) { const k = h ? h[i] : 0; if (sh[i]) { nS++; hS += k; } else { nB++; hB += k; } }
  return { shell: nS, hbShell: nS ? hS / nS : 0, hbBulk: nB ? hB / nB : 0, mask: sh };
};
// Shift the whole periodic system so that the plates' centre sits in the middle of the box (for drawing; the physics is unchanged).
MDEngine.prototype.recenterPlates = function () {
  const E = this, L = E.L, n = E.nMol * E.Lc, x = E.x, y = E.y; if (!n) return;
  let sx = 0, sy = 0, cx = 0, cy = 0; for (let i = 0; i < n; i++) { const a = 2 * Math.PI * x[i] / L, b = 2 * Math.PI * y[i] / L; sx += Math.cos(a); sy += Math.sin(a); cx += Math.cos(b); cy += Math.sin(b); }
  const mx = (Math.atan2(sy, sx) / (2 * Math.PI) * L + L) % L, my = (Math.atan2(cy, cx) / (2 * Math.PI) * L + L) % L, dx = L / 2 - mx, dy = L / 2 - my;
  if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return;
  for (let i = 0; i < E.N; i++) { x[i] = ((x[i] + dx) % L + L) % L; y[i] = ((y[i] + dy) % L + L) % L; }
};
// Two plates: centre distance projected on the plate normal, angle between plates, water molecules in the gap.
MDEngine.prototype.plateStats = function () {
  const E = this, L = E.L, Lc = E.Lc, x = E.x, y = E.y, type = E.type, N = E.N;
  const mi = (v) => v - L * Math.round(v / L);
  const geo = (m) => { const b = m * Lc; let cx = 0, cy = 0; for (let j = 0; j < Lc; j++) { cx += mi(x[b + j] - x[b]); cy += mi(y[b + j] - y[b]); }
    cx = x[b] + cx / Lc; cy = y[b] + cy / Lc; const ux = mi(x[b + Lc - 1] - x[b]), uy = mi(y[b + Lc - 1] - y[b]), n = Math.hypot(ux, uy) || 1; return { cx, cy, ux: ux / n, uy: uy / n }; };
  const A = geo(0), B = geo(1);
  let ux = A.ux, uy = A.uy; if (ux * B.ux + uy * B.uy < 0) { ux -= B.ux; uy -= B.uy; } else { ux += B.ux; uy += B.uy; }
  const un = Math.hypot(ux, uy) || 1; ux /= un; uy /= un; const nx = -uy, ny = ux;
  const dx = mi(B.cx - A.cx), dy = mi(B.cy - A.cy), sep = Math.abs(dx * nx + dy * ny), slide = Math.abs(dx * ux + dy * uy);
  const ang = Math.acos(Math.min(1, Math.abs(A.ux * B.ux + A.uy * B.uy))) * 180 / Math.PI;
  const mx = A.cx + dx / 2, my = A.cy + dy / 2, half = 0.5 * 0.95 * E.p.sigP * (Lc - 1) - 0.5 * slide;
  let gap = 0;
  if (half > 0) for (let i = 0; i < N; i++) if (type[i] === 7) { const rx = mi(x[i] - mx), ry = mi(y[i] - my), a = rx * ux + ry * uy, c = rx * nx + ry * ny;
    if (Math.abs(a) < half && Math.abs(c) < sep / 2 - 0.35) gap++; }
  const dist = Math.hypot(dx, dy);
  return { sep, slide, ang, gap, dist };
};
// Brush + droplet: contact angle from a circular-cap fit (tan(theta/2) = h / a), water contacts with end and middle beads,
// brush order = mean free-end height over the fully stretched height.
MDEngine.prototype.brushStats = function () {
  const E = this, type = E.type, x = E.x, y = E.y, L = E.L, hL = L / 2, Lc = E.Lc, nCh = Lc * E.nMol, N = E.N;
  const endT = E.seq[Lc - 1], midT = E.seq[0], W = E.liqType || 7, rcC = W === 7 ? 1.3 : 1.5;
  if (!E._wn || E._wn.length < N) E._wn = new Uint8Array(N);
  const wn = E._wn; wn.fill(0);
  if (!E._lp || E._lp.length < N) E._lp = new Int32Array(N);
  const par = E._lp; for (let i = 0; i < N; i++) par[i] = i;
  const find = (q) => { while (par[q] !== q) { par[q] = par[par[q]]; q = par[q]; } return q; };
  let wEnd = 0, wMid = 0;
  E.forPairs(rcC, (i, j) => {
    const a = type[i], b = type[j];
    if (a === W && b === W) { if (wn[i] < 255) wn[i]++; if (wn[j] < 255) wn[j]++; const ri = find(i), rj = find(j); if (ri !== rj) par[ri] = rj; return; }
    const t = a === W ? b : b === W ? a : -1; if (t < 0) return;
    if (t === 5) wEnd += (endT === 5 ? 1 : 0), wMid += (endT === 5 ? 0 : 1);
    else if (t === 6) wEnd += (endT === 6 ? 1 : 0), wMid += (endT === 6 ? 0 : 1);
  });
  // brush surface = mean over chains of each chain's highest bead (upright: its end; folded: its top bend)
  let ySurf = 0, ord = 0;
  for (let m = 0; m < E.nMol; m++) {
    const e = m * Lc + Lc - 1; let top = -1e9; for (let k = 0; k < Lc; k++) if (y[m * Lc + k] > top) top = y[m * Lc + k];
    ySurf += top; ord += (y[e] - E.yGraft) / (0.95 * (Lc - 1));
  }
  ySurf /= Math.max(1, E.nMol); ord /= Math.max(1, E.nMol);
  // droplet = largest connected cluster of liquid beads (vapour molecules excluded); centre by circular mean of x
  if (!E._lc || E._lc.length < N) E._lc = new Int32Array(N);
  const csz = E._lc; csz.fill(0); let big = -1, bigN = 0;
  for (let i = nCh; i < N; i++) if (type[i] === W) { const r = find(i); csz[r]++; if (csz[r] > bigN) { bigN = csz[r]; big = r; } }
  for (let i = nCh; i < N; i++) wn[i] = type[i] === W && find(i) === big ? 2 : 0;
  let cs = 0, sn = 0, nl = 0; const ys = [];
  for (let i = nCh; i < N; i++) if (wn[i] >= 2) { const ang = 2 * Math.PI * x[i] / L; cs += Math.cos(ang); sn += Math.sin(ang); nl++; ys.push(y[i]); }
  ys.sort((p1, p2) => p1 - p2); const ymax = ys.length ? ys[Math.min(ys.length - 1, Math.floor(0.98 * ys.length))] : -1e9;
  let theta = 0, width = 0, height = 0;
  if (nl > 5) {
    const xc = ((Math.atan2(sn, cs) / (2 * Math.PI)) * L + L) % L;
    let lo = 1e9, hi = -1e9, ylow = 1e9;
    for (let i = nCh; i < N; i++) if (wn[i] >= 2 && y[i] < ylow) ylow = y[i];
    const base = Math.max(ySurf, ylow) + 1.5;
    for (let i = nCh; i < N; i++) if (wn[i] >= 2 && y[i] < base) {
      let d = x[i] - xc; if (d > hL) d -= L; else if (d < -hL) d += L;
      if (d < lo) lo = d; if (d > hi) hi = d;
    }
    width = hi > lo ? hi - lo + 1.0 : 0;
    height = ymax - Math.max(ySurf, ylow - 1.0) + 0.5;
    if (width >= L - 2) theta = 0; else if (width > 0) theta = 2 * Math.atan(height / (width / 2)) * 180 / Math.PI;
  }
  // liquid inside the brush: liquid beads below the mean height of the chain ends
  let nIn = 0, nLiq = 0, nSub = 0; const ySub = E.walls ? E.walls.lo + 1.3 : -1e9;
  for (let i = nCh; i < N; i++) if (type[i] === W) { nLiq++; if (y[i] < ySurf) nIn++; if (y[i] < ySub) nSub++; }
  return { theta, width, height, order: ord, wEnd, wMid, liquid: nl, inside: nLiq ? nIn / nLiq : 0, onSubstrate: nSub, hbPerWater: E.nWater() ? 2 * E.nHB / E.nWater() : 0 };
};
// Binary liquid: set the fraction of C beads among all beads.
MDEngine.prototype.setComposition = function (xC) {
  const E = this, N = E.N, type = E.type, s0 = E.Lc * E.nMol, target = Math.round(Math.max(0, Math.min(1, xC)) * (N - s0));
  let nC = 0; for (let i = s0; i < N; i++) if (type[i] === 4) nC++;
  let guard = 0;
  while (nC !== target && guard++ < 10 * N) {
    const i = s0 + Math.floor(E.rand() * (N - s0));
    if (nC < target && type[i] === 2) { type[i] = 4; nC++; }
    else if (nC > target && type[i] === 4) { type[i] = 2; nC--; }
  }
  return nC;
};

// ---- live composition changes ----
// Molecules occupy indices [0, Lc*nMol) in blocks of Lc; solvent occupies the rest.
MDEngine.prototype.swap = function (i, j) {
  if (i === j) return;
  for (const a of [this.x, this.y, this.vx, this.vy, this.fx, this.fy, this.type, this.th, this.om, this.tq]) { const t = a[i]; a[i] = a[j]; a[j] = t; }
};
// Grow one molecule from a chain of neighbouring solvent beads.
MDEngine.prototype.addMolecule = function () {
  const E = this, N = E.N, L = E.L, hL = L / 2, Lc = E.Lc, s0 = Lc * E.nMol;
  if (N - s0 < Lc + 2) return false;
  for (let tries = 0; tries < 30; tries++) {
    const picks = [s0 + Math.floor(E.rand() * (N - s0))], used = new Set(picks);
    while (picks.length < Lc) {
      const cur = picks[picks.length - 1]; let best = -1, bd = 1.69;
      for (let j = s0; j < N; j++) {
        if (used.has(j)) continue;
        let dx = E.x[cur] - E.x[j], dy = E.y[cur] - E.y[j];
        if (dx > hL) dx -= L; else if (dx < -hL) dx += L;
        if (dy > hL) dy -= L; else if (dy < -hL) dy += L;
        const d2 = dx * dx + dy * dy; if (d2 < bd) { bd = d2; best = j; }
      }
      if (best < 0) break;
      picks.push(best); used.add(best);
    }
    if (picks.length < Lc) continue;
    for (let k = 0; k < Lc; k++) {
      const a = s0 + k, idx = picks[k];
      E.swap(idx, a);
      for (let l = k + 1; l < Lc; l++) if (picks[l] === a) picks[l] = idx;
    }
    for (let k = 0; k < Lc; k++) E.type[s0 + k] = E.beadType(k);
    E.nMol++;
    return true;
  }
  return false;
};
// Turn a random molecule back into solvent beads.
MDEngine.prototype.removeMolecule = function () {
  const E = this, Lc = E.Lc; if (E.nMol < 1) return false;
  const m = Math.floor(E.rand() * E.nMol), last = E.nMol - 1;
  for (let k = 0; k < Lc; k++) E.swap(m * Lc + k, last * Lc + k);
  for (let k = 0; k < Lc; k++) E.type[last * Lc + k] = E.solv;
  E.nMol--;
  return true;
};
MDEngine.prototype.setMolCount = function (target) {
  const E = this; target = Math.max(0, Math.min(Math.floor(E.N / E.Lc) - 2, Math.round(target)));
  let guard = 0;
  while (E.nMol < target && guard++ < 5000) if (!E.addMolecule()) break;
  while (E.nMol > target) E.removeMolecule();
  E.computeForces();
  return E.nMol;
};

if (typeof module !== 'undefined') module.exports = MDEngine;


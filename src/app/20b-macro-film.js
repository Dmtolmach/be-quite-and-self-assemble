  // ---------- after a game: a short film from the box out to everyday life ----------
  // The box (the best moment) shrinks into a hand-drawn picture of what such a result looks like in real life; the picture depends on the stars.
  // Timeline: 0.6 s the box alone, 2.4 s zooming out, the close-up of the box; at 4.4 s (or Skip) the end card opens with this picture, the stars and the verdict,
  // and stays until the player closes it, so there is time to read.
  const MACRO = {
    ice: [{ t: 'Slush, like ice cream', d: 'Tiny crystals with liquid water between them: soft and white, not a solid block.' },
      { t: 'Cloudy ice', d: 'Many small crystals and their borders scatter light, so the ice looks white.' },
      { t: 'Clear ice with a cloudy heart', d: 'Most of it grew in big crystals; the last part froze too fast.' },
      { t: 'Crystal-clear ice', d: 'Big, well-ordered crystals let light pass straight through.' }],
    demix: [{ t: 'A cloudy mixture', d: 'The two liquids are still mixed, like milk: they had no time to separate.' },
      { t: 'Droplets everywhere', d: 'Small drops of one liquid float in the other, like a shaken salad dressing.' },
      { t: 'Almost separated', d: 'The drops have merged into two layers, with a few drops left over.' },
      { t: 'Two clean layers', d: 'Each liquid gathered with its own kind, like oil on water.' }],
    drug: [{ t: 'Died of the tumour', d: 'Almost no drug reached the tumour.' },
      { t: 'Still in hospital', d: 'Some drug reached the tumour, but not enough to beat it.' },
      { t: 'Getting better', d: 'Most of the drug hit the tumour. Home soon!' },
      { t: 'Healthy and happy!', d: 'The drug went exactly where it was needed.' }],
    gel: [{ t: 'Still a liquid', d: 'The proteins never linked up: the solution flows like water.' },
      { t: 'Clumps sank to the bottom', d: 'Small clumps formed, but they never joined into one network.' },
      { t: 'A soft gel', d: 'The clumps joined into a network that holds the water: a jelly.' },
      { t: 'Like a cooked egg!', d: 'One strong network through everything, like egg white when it is cooked.' }],
  };
  const POISON = { t: 'Died of poisoning', d: 'Most of the drug was released in healthy tissue instead of the tumour.' };
  // where the box sits in each picture (picture coordinates: 1000 × 1000, picture area y < 760)
  const ANCHOR = { ice: [[500, 400], [440, 520], [440, 520], [440, 520]], demix: [[500, 470], [500, 470], [500, 470], [500, 475]],
    drug: [[500, 640], [520, 530], [500, 420], [500, 400]], gel: [[500, 470], [500, 600], [500, 540], [370, 540]] };
  const MBOX = 34; // size of the box in the picture
  let macro = null; // { o, t0, raf, snap, info, done }
  function macroStop() { if (!macro) return; cancelAnimationFrame(macro.raf); clearTimeout(macro.auto); macro = null; $('macroBox').hidden = true; }
  function macroPlay(o, done) { // the zoom-out film over the box; then done() opens the end card, which keeps the finished picture
    macroStop(); if (!MACRO[o.g.id]) { done(); return; }
    const el = $('macroBox'), c = $('macroCv');
    el.style.left = cv.offsetLeft + 'px'; el.style.top = cv.offsetTop + 'px'; el.style.width = cv.offsetWidth + 'px'; el.style.height = cv.offsetHeight + 'px';
    const pr = Math.min(2, window.devicePixelRatio || 1); c.width = c.height = Math.round(cv.offsetWidth * pr);
    macro = Object.assign(macroInfo(o), { o, done, t0: 0, raf: 0, snap: o.snap || null }); o.macroM = macro;
    const M = macro; el.hidden = false; $('macroGo').textContent = T('Skip') + ' ▸'; syncBoxStart();
    if (fxCalm()) { macroDone(); return; } // reduced motion: straight to the card with the picture
    // wait two frames so the box shows the restored best moment, then copy it
    M.raf = requestAnimationFrame(() => { M.raf = requestAnimationFrame(() => { if (macro !== M) return;
      if (!M.snap) { const sn = document.createElement('canvas'); sn.width = cv.width; sn.height = cv.height; sn.getContext('2d').drawImage(cv, 0, 0); M.snap = o.snap = sn; }
      M.t0 = performance.now(); const tick = () => { if (macro !== M) return; const t = (performance.now() - M.t0) / 1000; macroFrame(M, c, t); if (t > 4.4) { macroDone(); return; } M.raf = requestAnimationFrame(tick); }; tick(); }); });
  }
  function macroDone() { const M = macro; if (!M) return;
    if (!M.snap) { const sn = document.createElement('canvas'); sn.width = cv.width; sn.height = cv.height; sn.getContext('2d').drawImage(cv, 0, 0); M.snap = M.o.snap = sn; }
    macroStop(); M.done(); }
  $('macroGo').addEventListener('click', macroDone);
  const ease = (u) => u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2, clamp01 = (u) => Math.max(0, Math.min(1, u)), sstep = (a, b, u) => { const v = clamp01((u - a) / (b - a)); return v * v * (3 - 2 * v); };
  const PIC_H = 0.78; // the picture is 1000 wide and 780 high in picture coordinates
  function macroFrame(M, c, t) { // one frame into canvas c at time t (s); t ≥ 3.6 gives the finished picture with the close-up
    const x = c.getContext('2d'), W = c.width, H = c.height, k = W / 1000, oy = (H - PIC_H * W) / 2;
    const ef = ease(clamp01((t - 0.6) / 2.4)), [ax, ay] = ANCHOR[M.kind][M.st], z0 = Math.max(W, H) / (MBOX * k), z = Math.exp(Math.log(z0) * (1 - ef));
    const sx = W / 2 + (ax * k - W / 2) * ef, sy = H / 2 + (ay * k + oy - H / 2) * ef, sc = k * z, px = W / 500;
    x.setTransform(1, 0, 0, 1, 0, 0); x.fillStyle = PAPER; x.fillRect(0, 0, W, H);
    x.setTransform(sc, 0, 0, sc, sx - ax * sc, sy - ay * sc);
    x.globalAlpha = sstep(0.12, 0.55, ef); if (x.globalAlpha > 0) macroScene(x, M); x.globalAlpha = 1;
    const b0 = [ax - MBOX / 2, ay - MBOX / 2];
    if (M.snap) x.drawImage(M.snap, b0[0], b0[1], MBOX, MBOX);
    x.lineWidth = 2.5 * px / sc; x.strokeStyle = colors.hot; x.strokeRect(b0[0], b0[1], MBOX, MBOX);
    x.setTransform(1, 0, 0, 1, 0, 0);
    if (t < 0.9) { x.globalAlpha = 1 - sstep(0.5, 0.9, t); macroLabel(x, W, T('Your box at its best moment'), W / 2, 0.06 * W); x.globalAlpha = 1; }
    const show = sstep(3.0, 3.6, t); if (show <= 0) return;
    // close-up: the box again, large, joined to its place in the picture
    x.globalAlpha = show; const iw = 0.27 * W, right = ax < 520, ix = right ? W - iw - 0.04 * W : 0.04 * W, iy = oy + 0.04 * W;
    const bx = ax * k - MBOX * k / 2, by = oy + ay * k - MBOX * k / 2, bw = MBOX * k;
    x.strokeStyle = colors.hot; x.lineWidth = 1.5 * px; x.setLineDash([5 * px, 4 * px]); x.beginPath();
    x.moveTo(right ? bx + bw : bx, by); x.lineTo(right ? ix : ix + iw, iy); x.moveTo(right ? bx + bw : bx, by + bw); x.lineTo(right ? ix : ix + iw, iy + iw); x.stroke(); x.setLineDash([]);
    x.fillStyle = '#ffffff'; x.fillRect(ix - 3, iy - 3, iw + 6, iw + 6); if (M.snap) x.drawImage(M.snap, ix, iy, iw, iw);
    x.lineWidth = 3 * px; x.strokeRect(ix, iy, iw, iw);
    macroLabel(x, W, T('Your box: smaller than a virus'), ix + iw / 2, iy + iw + 0.035 * W, 0.024);
    x.globalAlpha = 1;
  }
  function macroStill(c, M) { // the finished picture for the end card
    const w = c.clientWidth || 320, pr = Math.min(2, window.devicePixelRatio || 1); c.width = Math.round(w * pr); c.height = Math.round(w * pr * PIC_H); macroFrame(M, c, 99); }
  const macroInfo = (o) => { const st = Math.max(0, Math.min(3, o.st)), G = o.G || {}, poison = o.g.id === 'drug' && st === 0 && (G.lost || 0) > (G.del || 0);
    return { kind: o.g.id, st, poison, info: poison ? POISON : MACRO[o.g.id][st] }; };
  function macroLabel(x, W, txt, cxp, cyp, f) {
    x.font = `600 ${(f || 0.03) * W}px ${css('--f-body') || 'sans-serif'}`; x.textAlign = 'center'; x.textBaseline = 'middle';
    const w = x.measureText(txt).width + 0.03 * W, h = (f || 0.03) * W * 1.6; x.fillStyle = 'rgba(255,255,255,0.88)'; x.fillRect(cxp - w / 2, cyp - h / 2, w, h); x.fillStyle = INK; x.fillText(txt, cxp, cyp); }
  function wrapText(x, txt, cxp, y, maxW, lh) { const words = txt.split(' '); let line = '', lines = [];
    for (const w of words) { const tt = line ? line + ' ' + w : w; if (x.measureText(tt).width > maxW && line) { lines.push(line); line = w; } else line = tt; } if (line) lines.push(line);
    lines.slice(0, 3).forEach((l, i) => x.fillText(l, cxp, y + i * lh)); }

  // ---- hand-drawn pictures (picture coordinates 1000 × 1000; the picture uses y < 760, the caption sits below) ----
  const PAPER = '#fbf7ee', INK = '#3a3631';
  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  // a sketchy outline: the shape's points with a little steady wobble, drawn twice like a pencil line
  function sk(x, pts, o) { o = o || {}; const r = rng(o.seed || 7), amp = o.amp === undefined ? 2.2 : o.amp, closed = o.closed !== false;
    const path = (dj) => { x.beginPath(); pts.forEach(([px, py], i) => { const jx = (r() - 0.5) * amp * dj, jy = (r() - 0.5) * amp * dj; i ? x.lineTo(px + jx, py + jy) : x.moveTo(px + jx, py + jy); }); if (closed) x.closePath(); };
    if (o.fill) { path(0.5); x.fillStyle = o.fill; x.fill(); }
    if (o.stroke !== false) { x.strokeStyle = o.stroke || INK; x.lineJoin = 'round'; x.lineCap = 'round'; x.lineWidth = o.w || 4; path(1); x.stroke();
      if (!o.single) { const a0 = x.globalAlpha; x.globalAlpha = a0 * 0.45; x.lineWidth = (o.w || 4) * 0.6; path(1.6); x.stroke(); x.globalAlpha = a0; } } }
  const ell = (cx, cy, rx, ry, a0, a1, n) => { const p = [], A0 = a0 || 0, A1 = a1 === undefined ? 2 * Math.PI : a1, m = n || 48; for (let i = 0; i <= m; i++) { const a = A0 + (A1 - A0) * i / m; p.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a)]); } return p; };
  const seg = (pts, n) => { const out = []; for (let h = 0; h < pts.length - 1; h++) for (let q = 0; q < n; q++) { const f = q / n; out.push([pts[h][0] + f * (pts[h + 1][0] - pts[h][0]), pts[h][1] + f * (pts[h + 1][1] - pts[h][1])]); } out.push(pts[pts.length - 1]); return out; };
  const blob = (cx, cy, R, bumps, amp, seed) => { const r = rng(seed), ph = r() * 6, p = []; for (let i = 0; i <= 64; i++) { const a = 2 * Math.PI * i / 64; const rr = R * (1 + amp * Math.sin(bumps * a + ph) + 0.4 * amp * Math.sin((bumps + 3) * a + 2 * ph)); p.push([cx + rr * Math.cos(a), cy + rr * Math.sin(a)]); } return p; };
  function table(x, y) { sk(x, seg([[40, y], [960, y]], 12), { closed: false, w: 3, stroke: 'rgba(58,54,49,0.55)' }); }
  function shadow(x, cx, cy, rx, ry, col) { x.fillStyle = col || 'rgba(58,54,49,0.12)'; x.beginPath(); x.ellipse(cx, cy, rx, ry, 0, 0, 2 * Math.PI); x.fill(); }
  function sparkle(x, cx, cy, r, col) { x.fillStyle = col || '#ffffff'; x.beginPath(); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, rr = i & 1 ? r * 0.22 : r; i ? x.lineTo(cx + rr * Math.sin(a), cy - rr * Math.cos(a)) : x.moveTo(cx, cy - r); } x.closePath(); x.fill(); }
  function macroScene(x, M) {
    x.save(); ({ ice: sceneIce, demix: sceneDemix, drug: sceneDrug, gel: sceneGel })[M.kind](x, M.st, M); x.restore();
  }
  function sceneIce(x, st) {
    table(x, st ? 662 : 690);
    if (st === 0) { // three scoops of ice cream in a cup: tiny crystals, soft and white
      shadow(x, 500, 690, 170, 18);
      const scoop = (cx, cy, R, seed, col) => { const p = blob(cx, cy, R, 6, 0.025, seed); sk(x, p, { fill: col, w: 4, seed, amp: 1 });
        const r = rng(seed + 50); for (let i = 0; i < 70; i++) { const a = r() * 6.283, d = 0.85 * R * Math.sqrt(r()); x.fillStyle = r() < 0.5 ? 'rgba(120,170,210,0.55)' : 'rgba(255,255,255,0.95)'; x.beginPath(); x.arc(cx + d * Math.cos(a), cy + d * Math.sin(a), 2 + 3 * r(), 0, 6.283); x.fill(); }
        x.strokeStyle = 'rgba(255,255,255,0.9)'; x.lineWidth = 7; x.lineCap = 'round'; x.beginPath(); x.arc(cx - 0.2 * R, cy - 0.2 * R, 0.55 * R, 3.6, 4.4); x.stroke(); };
      scoop(415, 505, 92, 3, '#f1f5fa'); scoop(585, 505, 92, 4, '#eef3f9'); scoop(500, 395, 95, 5, '#f5f8fc');
      sk(x, seg([[330, 540], [670, 540], [625, 685], [375, 685]], 4), { fill: '#e5845c', w: 4, seed: 6 }); // the cup, over the lower scoops
      sk(x, seg([[320, 535], [680, 535], [680, 560], [320, 560]], 3), { fill: '#f2a07a', w: 4, seed: 7 }); // rim
      x.strokeStyle = 'rgba(255,255,255,0.55)'; x.lineWidth = 6; for (let k = 0; k < 4; k++) { const X = 400 + 65 * k; x.beginPath(); x.moveTo(X, 575); x.lineTo(X - 6 + 4 * k, 670); x.stroke(); }
      sk(x, seg([[600, 360], [720, 230]], 6), { closed: false, w: 10, stroke: '#9aa3ab', seed: 9 }); sk(x, ell(726, 222, 26, 18), { fill: '#c3cad1', w: 3 }); // spoon
      return; }
    shadow(x, 500, 662, 220, 24, st === 3 ? 'rgba(76,195,255,0.18)' : 'rgba(58,54,49,0.12)');
    const top = [[500, 280], [680, 360], [500, 440], [320, 360]], left = [[320, 360], [500, 440], [500, 660], [320, 580]], right = [[500, 440], [680, 360], [680, 580], [500, 660]];
    const f = st === 3 ? ['rgba(160,220,255,0.30)', 'rgba(130,200,245,0.22)', 'rgba(110,185,240,0.32)'] : st === 2 ? ['rgba(175,222,250,0.45)', 'rgba(150,205,240,0.38)', 'rgba(135,195,235,0.45)'] : ['rgba(238,244,250,0.95)', 'rgba(222,233,243,0.95)', 'rgba(206,222,236,0.95)'];
    const edge = st === 1 ? '#7d95aa' : '#3d8fc4';
    sk(x, seg(top, 4), { fill: f[0], stroke: edge, seed: 1 }); sk(x, seg(left, 4), { fill: f[1], stroke: edge, seed: 2 }); sk(x, seg(right, 4), { fill: f[2], stroke: edge, seed: 3 });
    const r = rng(st * 17 + 5); x.save(); x.beginPath(); [[500, 280], [680, 360], [680, 580], [500, 660], [320, 580], [320, 360]].forEach(([a, b], i) => i ? x.lineTo(a, b) : x.moveTo(a, b)); x.closePath(); x.clip(); // marks stay inside the cube
    if (st === 2) { const g = x.createRadialGradient(500, 500, 0, 500, 500, 110); g.addColorStop(0, 'rgba(255,255,255,0.95)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.beginPath(); x.arc(500, 500, 110, 0, 6.283); x.fill(); }
    const bubbles = st === 1 ? 70 : st === 2 ? 14 : 0;
    for (let i = 0; i < bubbles; i++) { const u = r(), v = r(), side = r() < 0.5; const px = side ? 320 + 180 * u : 500 + 180 * u, py = (side ? 360 + 80 * u : 440 - 80 * u) + 220 * v * 0.95 + 8;
      x.strokeStyle = 'rgba(90,120,150,0.6)'; x.lineWidth = 2; x.beginPath(); x.arc(px, py, 3 + 6 * r(), 0, 6.283); x.stroke(); }
    if (st === 1) for (let i = 0; i < 9; i++) { let px = 340 + 320 * r(), py = 380 + 240 * r(); const p = [[px, py]]; for (let q = 0; q < 4; q++) { px += (r() - 0.5) * 60; py += (r() - 0.3) * 40; p.push([px, py]); } sk(x, p, { closed: false, w: 2, stroke: 'rgba(110,135,160,0.7)', single: true, amp: 0 }); }
    x.restore();
    if (st >= 2) { x.strokeStyle = 'rgba(255,255,255,0.95)'; x.lineWidth = 9; x.lineCap = 'round'; x.beginPath(); x.moveTo(350, 420); x.lineTo(420, 520); x.moveTo(355, 470); x.lineTo(390, 520); x.moveTo(560, 470); x.lineTo(640, 410); x.stroke(); }
    if (st === 3) { sparkle(x, 690, 330, 28, '#ffffff'); sparkle(x, 330, 330, 18, '#d9f2ff'); sparkle(x, 640, 600, 16, '#ffffff'); sparkle(x, 700, 330, 10, '#7fd3ff'); }
  }
  function mixHex(a, b, f) { const A = hexRgb(a), B = hexRgb(b); return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * f)).join(',')})`; }
  function glass(x, inner) { // a glass with straight, slightly tapered walls; inner(clipped) paints the liquid
    const out = [[350, 200], [650, 200], [625, 670], [375, 670]];
    shadow(x, 500, 680, 180, 18); table(x, 680);
    x.save(); x.beginPath(); x.moveTo(358, 290); x.lineTo(642, 290); x.lineTo(620, 660); x.lineTo(380, 660); x.closePath(); x.clip(); inner(); x.restore();
    sk(x, seg(out, 6), { fill: false, stroke: INK, w: 4, seed: 21 }); sk(x, ell(500, 200, 150, 14), { stroke: INK, w: 3, seed: 22 });
    x.strokeStyle = 'rgba(255,255,255,0.8)'; x.lineWidth = 10; x.lineCap = 'round'; x.beginPath(); x.moveTo(385, 240); x.lineTo(400, 600); x.stroke();
  }
  function sceneDemix(x, st) {
    const cS = colors.mixS, cC = colors.mixC, r = rng(31 + st);
    glass(x, () => {
      if (st === 0) { x.fillStyle = mixHex(cS, cC, 0.5); x.fillRect(300, 280, 400, 400); for (let i = 0; i < 700; i++) { x.fillStyle = r() < 0.5 ? cS : cC; x.globalAlpha = 0.5; x.beginPath(); x.arc(360 + 280 * r(), 290 + 370 * r(), 2.5 + 2 * r(), 0, 6.283); x.fill(); } x.globalAlpha = 1; return; }
      x.fillStyle = cS; x.fillRect(300, 280, 400, 400);
      if (st === 1) { for (let i = 0; i < 46; i++) { const R = 7 + 18 * r(); sk(x, ell(370 + 260 * r(), 300 + 350 * r(), R, R * 0.9, 0, 6.283, 16), { fill: cC, w: 2, stroke: 'rgba(58,54,49,0.4)', single: true, amp: 1 }); } return; }
      const wav = st === 2 ? 22 : 3, p = [[300, 690], [300, 470]]; for (let X = 300; X <= 700; X += 10) p.push([X, 470 + wav * Math.sin(X / 37 + 1)]); p.push([700, 690]);
      x.fillStyle = cC; x.beginPath(); p.forEach(([a, b], i) => i ? x.lineTo(a, b) : x.moveTo(a, b)); x.fill();
      sk(x, p.slice(2, -1), { closed: false, stroke: 'rgba(58,54,49,0.5)', w: 2.5, single: true });
      if (st === 2) for (let i = 0; i < 10; i++) { const up = i < 5, R = 6 + 10 * r(); sk(x, ell(380 + 240 * r(), up ? 320 + 110 * r() : 520 + 120 * r(), R, R, 0, 6.283, 14), { fill: up ? cC : cS, w: 2, stroke: 'rgba(58,54,49,0.4)', single: true, amp: 1 }); }
    });
  }
  function person(x, cx, cy, o) { // a simple friendly figure; cy = hip height
    const sk2 = (p, w, col) => sk(x, p, { closed: false, w: w || 7, stroke: col || INK, seed: 40 });
    const body = o.body || '#5b8fd1', head = [cx, cy - 210];
    sk(x, seg([[cx - 45, cy - 160], [cx + 45, cy - 160], [cx + 40, cy], [cx - 40, cy]], 3), { fill: body, w: 4, seed: 41 }); // shirt
    if (o.legs === 'jump') { sk2([[cx - 25, cy], [cx - 70, cy + 70], [cx - 40, cy + 130]], 9); sk2([[cx + 25, cy], [cx + 70, cy + 70], [cx + 40, cy + 130]], 9); }
    else { sk2([[cx - 22, cy], [cx - 30, cy + 150]], 9); sk2([[cx + 22, cy], [cx + 30, cy + 150]], 9); }
    if (o.arms === 'up') { sk2([[cx - 40, cy - 150], [cx - 100, cy - 230], [cx - 120, cy - 290]], 8); sk2([[cx + 40, cy - 150], [cx + 100, cy - 230], [cx + 120, cy - 290]], 8); }
    else { sk2([[cx - 42, cy - 150], [cx - 70, cy - 70], [cx - 66, cy - 10]], 8); sk2([[cx + 42, cy - 150], [cx + 70, cy - 70], [cx + 66, cy - 10]], 8); }
    sk(x, ell(head[0], head[1], 52, 56), { fill: '#f6d3b3', w: 4, seed: 42 });
    x.fillStyle = INK; x.beginPath(); x.arc(cx - 18, head[1] - 8, 5, 0, 6.283); x.arc(cx + 18, head[1] - 8, 5, 0, 6.283); x.fill();
    const m = o.mouth || 0; sk(x, ell(cx, head[1] + 14 - 6 * m, 20, 4 + 14 * Math.abs(m), m >= 0 ? 0.15 : Math.PI + 0.15, m >= 0 ? Math.PI - 0.15 : 2 * Math.PI - 0.15, 10), { closed: false, w: 4, seed: 43, single: true });
  }
  function sceneDrug(x, st, M) {
    const r = rng(51 + st);
    if (st === 0) { // a grave
      sk(x, [...ell(500, 690, 300, 70, Math.PI, 2 * Math.PI, 30)], { fill: '#9ccf7a', w: 4, seed: 52 }); // grass mound
      const stone = [[400, 660], [400, 380], ...ell(500, 380, 100, 100, Math.PI, 2 * Math.PI, 20).slice(1), [600, 660]];
      sk(x, stone, { fill: '#b9b6b0', w: 5, seed: 53 });
      x.fillStyle = INK; x.textAlign = 'center'; x.textBaseline = 'middle'; const rip = T('R.I.P.').split(' '), lines = rip.length > 1 ? [rip[0], rip.slice(1).join(' ')] : rip; // a long wording goes on two lines and shrinks to fit the stone
      lines.forEach((ln, i) => { let f = 46; x.font = `700 ${f}px ${css('--f-display') || 'serif'}`; while (x.measureText(ln).width > 170 && f > 20) { f -= 2; x.font = `700 ${f}px ${css('--f-display') || 'serif'}`; } x.fillText(ln, 500, 400 + (i - (lines.length - 1) / 2) * 44); });
      sk(x, seg([[470, 470], [530, 470]], 3), { closed: false, w: 4, seed: 54 });
      // poison: a little bottle with a skull mark; tumour: a dark lump
      if (M.poison) { sk(x, seg([[470, 520], [530, 520], [535, 620], [465, 620]], 3), { fill: '#7fbf5a', w: 4, seed: 55 }); sk(x, seg([[485, 500], [515, 500], [515, 520], [485, 520]], 2), { fill: '#6b5844', w: 3, seed: 56 });
        x.fillStyle = INK; x.font = '700 40px sans-serif'; x.fillText('☠', 500, 575); }
      else { sk(x, blob(500, 565, 42, 5, 0.18, 57), { fill: '#7a5a6e', w: 4, seed: 57 }); }
      for (let i = 0; i < 7; i++) { const fx = 270 + 460 * r(), fy = 650 + 30 * r(); if (Math.abs(fx - 500) < 120) continue; sk(x, seg([[fx, fy], [fx, fy - 40]], 2), { closed: false, w: 3, stroke: '#4a8a3a', seed: i }); x.fillStyle = ['#e46a8a', '#f2c94c', '#ffffff'][i % 3]; x.beginPath(); x.arc(fx, fy - 46, 10, 0, 6.283); x.fill(); }
      return; }
    if (st === 1) { // in a hospital bed, with a drip
      table(x, 700);
      sk(x, seg([[230, 560], [770, 560], [770, 620], [230, 620]], 4), { fill: '#e8e3d8', w: 4, seed: 61 }); // bed
      sk(x, seg([[230, 440], [230, 690]], 3), { closed: false, w: 8, seed: 62 }); sk(x, seg([[770, 500], [770, 690]], 3), { closed: false, w: 8, seed: 63 });
      sk(x, ell(300, 520, 60, 30), { fill: '#ffffff', w: 3, seed: 64 }); // pillow
      sk(x, ell(310, 480, 46, 46), { fill: '#f6d3b3', w: 4, seed: 65 }); x.fillStyle = INK; x.fillRect(292, 474, 12, 3); x.fillRect(318, 474, 12, 3); // closed eyes
      sk(x, ell(312, 503, 12, 4, Math.PI + 0.3, 2 * Math.PI - 0.3, 8), { closed: false, w: 3, seed: 66, single: true }); // small sad mouth
      sk(x, [[350, 500], ...seg([[420, 470], [760, 480], [770, 560], [350, 560]], 4)], { fill: '#8fb8de', w: 4, seed: 67 }); // blanket
      sk(x, seg([[840, 280], [840, 690]], 3), { closed: false, w: 6, seed: 68 }); sk(x, seg([[800, 690], [880, 690]], 2), { closed: false, w: 6, seed: 69 });
      sk(x, seg([[810, 290], [870, 290], [865, 380], [815, 380]], 3), { fill: 'rgba(170,215,255,0.8)', w: 3, seed: 70 }); // drip bag
      sk(x, [[840, 380], [820, 450], [700, 500], [600, 520]], { closed: false, w: 2.5, stroke: '#6c8fb0', seed: 71, single: true });
      sk(x, [[620, 260], [660, 260], [675, 220], [690, 300], [705, 250], [720, 260], [760, 260]], { closed: false, w: 3, stroke: '#3aa36a', seed: 72, single: true }); // heart beat
      sk(x, ell(140, 260, 46, 46), { fill: '#ffffff', w: 3, seed: 73 }); x.fillStyle = '#d64545'; x.fillRect(132, 232, 16, 56); x.fillRect(112, 252, 56, 16); // red cross
      return; }
    if (st === 2) { // walking out of the hospital with a plaster
      table(x, 705); sk(x, seg([[90, 700], [90, 240], [330, 240], [330, 700]], 4), { fill: '#efe9dc', w: 4, seed: 81 });
      sk(x, seg([[160, 700], [160, 520], [260, 520], [260, 700]], 3), { fill: '#bfa98a', w: 3, seed: 82 });
      x.fillStyle = '#d64545'; x.fillRect(196, 300, 28, 90); x.fillRect(165, 331, 90, 28);
      person(x, 520, 520, { mouth: 0.5, body: '#7ab07a' });
      x.save(); x.translate(560, 380); x.rotate(-0.5); x.fillStyle = '#f2d7a8'; x.fillRect(-26, -10, 52, 20); x.restore();
      sk(x, seg([[700, 330], [760, 330]], 2), { closed: false, w: 3, seed: 83, single: true }); sk(x, seg([[705, 360], [750, 360]], 2), { closed: false, w: 3, seed: 84, single: true });
      sparkle(x, 800, 200, 30, '#f2c94c'); return; }
    // three stars: jumping for joy in the sun
    x.fillStyle = '#ffd95a'; x.beginPath(); x.arc(160, 170, 60, 0, 6.283); x.fill();
    x.strokeStyle = '#f2b705'; x.lineWidth = 6; for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5; x.beginPath(); x.moveTo(160 + 80 * Math.cos(a), 170 + 80 * Math.sin(a)); x.lineTo(160 + 105 * Math.cos(a), 170 + 105 * Math.sin(a)); x.stroke(); }
    table(x, 715); shadow(x, 500, 715, 110, 14);
    person(x, 500, 470, { mouth: 1, arms: 'up', legs: 'jump', body: '#e0704a' });
    for (const [a, b] of [[330, 600], [670, 600], [360, 650], [640, 650]]) sk(x, seg([[a, b], [a + (a < 500 ? -30 : 30), b + 10]], 2), { closed: false, w: 3, seed: a, single: true });
    for (let i = 0; i < 5; i++) sparkle(x, 260 + 120 * i + 30 * r(), 140 + 60 * r(), 14 + 10 * r(), ['#f2b705', '#e46a8a', '#4cae6b', '#3a9bd6', '#9b6bd1'][i]);
  }
  function sceneGel(x, st) {
    const r = rng(91 + st);
    if (st <= 1) { glass(x, () => { x.fillStyle = 'rgba(244,226,160,0.55)'; x.fillRect(300, 280, 400, 400);
        if (st === 0) for (let i = 0; i < 90; i++) { x.fillStyle = 'rgba(200,150,60,0.6)'; x.beginPath(); x.arc(370 + 260 * r(), 300 + 350 * r(), 2 + 2 * r(), 0, 6.283); x.fill(); }
        else { for (let i = 0; i < 26; i++) sk(x, blob(390 + 220 * r(), 610 + 40 * r(), 16 + 14 * r(), 5, 0.25, i), { fill: '#e9d9a8', stroke: 'rgba(120,90,40,0.7)', w: 2.5, single: true, amp: 1 });
          for (let i = 0; i < 4; i++) { const fx = 400 + 200 * r(), fy = 360 + 160 * r(); sk(x, blob(fx, fy, 10 + 6 * r(), 5, 0.25, 30 + i), { fill: '#e9d9a8', stroke: 'rgba(120,90,40,0.7)', w: 2, single: true, amp: 1 });
            x.strokeStyle = 'rgba(120,90,40,0.5)'; x.lineWidth = 2; x.beginPath(); x.moveTo(fx - 8, fy - 22); x.lineTo(fx - 8, fy - 40); x.moveTo(fx + 8, fy - 22); x.lineTo(fx + 8, fy - 40); x.stroke(); } } });
      return; }
    if (st === 2) { // a wobbly jelly on a plate
      table(x, 690); sk(x, ell(500, 660, 260, 40), { fill: '#ffffff', w: 4, seed: 92 });
      const jelly = [[330, 650], [350, 420], ...ell(500, 420, 150, 70, Math.PI, 2 * Math.PI, 24).slice(1), [670, 650]];
      x.save(); x.translate(500, 650); x.transform(1, 0, -0.04, 1, 0, 0); x.translate(-500, -650);
      sk(x, seg(jelly.slice(0, 2), 4).concat(jelly.slice(2, -1)).concat(seg(jelly.slice(-2), 4)), { fill: 'rgba(240,170,60,0.75)', w: 4, seed: 93 });
      sk(x, ell(500, 650, 170, 18, 0, Math.PI, 20), { closed: false, w: 3, seed: 94, single: true });
      x.strokeStyle = 'rgba(255,255,255,0.85)'; x.lineWidth = 10; x.lineCap = 'round'; x.beginPath(); x.moveTo(390, 440); x.lineTo(380, 600); x.stroke(); x.restore();
      for (const s of [-1, 1]) { sk(x, [[500 + s * 200, 420], [500 + s * 220, 450], [500 + s * 200, 480]], { closed: false, w: 3, seed: 95, single: true }); sk(x, [[500 + s * 230, 400], [500 + s * 255, 450], [500 + s * 230, 500]], { closed: false, w: 3, seed: 96, single: true }); }
      return; }
    // three stars: a fried egg in a pan
    table(x, 700); sk(x, seg([[740, 470], [940, 400]], 4), { closed: false, w: 26, stroke: '#3b3b3b', seed: 97 });
    sk(x, ell(470, 480, 280, 200), { fill: '#4a4a4a', w: 5, seed: 98 }); sk(x, ell(470, 480, 245, 170), { fill: '#5d5d5d', stroke: false, seed: 99 });
    sk(x, blob(460, 480, 175, 5, 0.12, 100), { fill: '#ffffff', w: 4, seed: 100 });
    sk(x, ell(500, 460, 62, 58), { fill: '#f6a81c', w: 4, seed: 101 }); x.fillStyle = 'rgba(255,255,255,0.75)'; x.beginPath(); x.ellipse(482, 440, 16, 10, -0.5, 0, 6.283); x.fill();
  }
  window.__macro = (id, st, lost, card) => { const g = GAMES.find((q) => q.id === id); if (!g) return; const o = { g, st, v: 0, G: { lost: lost || 0, del: 0, peakSec: 0 } }; postGame = id;
    macroPlay(o, card ? () => endCard(o) : () => {}); }; // for tests

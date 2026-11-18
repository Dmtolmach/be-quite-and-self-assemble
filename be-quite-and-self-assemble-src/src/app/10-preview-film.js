  // ---------- goal preview: before a game starts, the box plays a fast "film" of the system: heated it falls apart (forward),
  // cooled it orders (the same film played backwards), 10 s of film, then 20 s of the live box, repeated ----------
  const DEMO = { ice: { T: 0.34, ord: true, tau: 24 }, demix: { T: 2.0, ord: true, tau: 18 }, drug: { T: 2.5, ord: true, tau: 12 },
    gel: { T: 3.5, ord: true, tau: 26, heatTau: 8, coolT: 1.2 } }; // gel: a real heat-then-cool run, played forwards only
  const demoCache = {}; let demo = null, demoDrawing = false, demoHeat = 0, filmCtl = false;
  const previewOn = () => appMode === 'game' && !!gameSel && !game && !(postGame && postGame === gameSel.id) && !gendOpen() && !guide && !battle && !classOn && tourI < 0 && !gameLevel && !!DEMO[gameSel.id] && !!eng;
  function demoTick(budgetMs) { // record the film in small slices of each frame, on a copy of the game's system
    if (!previewOn()) return; const id = gameSel.id, cf = DEMO[id];
    if (!demo || demo.id !== id) demo = demoCache[id] || null;
    if (!demo) {
      let E; try { E = new MDEngine(Object.assign({}, eng.p, { T: cf.T, ordered: cf.ord, seed: 7 + id.length, baro: false, hotBand: null, flowU: 0, iceWall: false })); } catch (e) { return; }
      E.setupTable(); const nf = 60, every = Math.max(1, Math.round(cf.tau / nf / E.p.dt));
      demo = demoCache[id] = { id, E, frames: [], every, nf, t0: 0, k: 0 }; demo.frames.push(demoGrab(E));
    }
    if (demo.frames.length >= demo.nf) return;
    const t0 = performance.now(), E = demo.E;
    while (performance.now() - t0 < budgetMs && demo.frames.length < demo.nf) {
      if (cf.heatTau && demo.k === Math.round(cf.heatTau / E.p.dt)) { E.p.T = cf.coolT; E.setupTable(); } // gel film: heat, then cool
      E.step(); if (++demo.k % demo.every === 0) demo.frames.push(demoGrab(E)); }
    if (demo.frames.length >= demo.nf) demo.t0 = performance.now();
  }
  window.__demo = () => demo && { id: demo.id, n: demo.frames.length, nf: demo.nf, k: demo.k, every: demo.every, prev: previewOn() };
  const demoGrab = (E) => { const fr = { x: Float32Array.from(E.x.subarray(0, E.N)), y: Float32Array.from(E.y.subarray(0, E.N)), arm: E.mb && E.arm ? Float32Array.from(E.arm.subarray(0, 6 * E.N)) : null, T: E.p.T, rel: null };
    if (E.nDrug) { const r = E.drugStats(1.5, 2), rel = []; for (let i = 0; i < E.N; i++) if (E.type[i] === 4 && r.cnt[i] < 2) rel.push(i); fr.rel = Int32Array.from(rel); } // released drug glows in the film
    return fr; };
  function demoFrame() { // which frame to show now, or null for the live box
    if (!previewOn() || !demo || demo.id !== gameSel.id || demo.frames.length < demo.nf) return null;
    const t = ((performance.now() - demo.t0) / 1000) % 10, cf = DEMO[demo.id];
    if (cf.heatTau) { // gel: the run forwards over 8 s, then 2 s on its last frame; the controls follow the temperature it was run at
      const i = Math.min(demo.nf - 1, Math.round(Math.min(1, t / 8) * (demo.nf - 1))), hot = demo.frames[i].T > cf.coolT + 0.01;
      return { i, fwd: hot, f: hot ? 0.9 : 0.15, gel: true }; }
    // others loop while the preview is on: 4 s heating, 4 s cooling (the film backwards), 2 s cold
    const fwd = t < 4, f = fwd ? t / 4 : t < 8 ? 1 - (t - 4) / 4 : 0, i = Math.min(demo.nf - 1, Math.round(f * (demo.nf - 1)));
    return { i, fwd, f };
  }
  function drawDemo(fr) {
    const E = demo.E, F = demo.frames[fr.i]; E.x.set(F.x); E.y.set(F.y); if (F.arm) E.arm.set(F.arm);
    const keepE = eng, keepAn = an; eng = E; an = null; demoDrawing = true; demoHeat = fr.f;
    try { draw(); } finally { eng = keepE; an = keepAn; demoDrawing = false; }
    if (F.rel && F.rel.length) { const s = cv.width / E.L; ctx.save(); ctx.globalCompositeOperation = isDark() ? 'lighter' : 'source-over';
      for (const i of F.rel) { const X = F.x[i] * s, Y = F.y[i] * s, R = 1.8 * s, gr = ctx.createRadialGradient(X, Y, 0, X, Y, R);
        gr.addColorStop(0, 'rgba(255,214,64,0.95)'); gr.addColorStop(0.45, 'rgba(255,200,40,0.45)'); gr.addColorStop(1, 'rgba(255,200,40,0)'); ctx.fillStyle = gr; ctx.fillRect(X - R, Y - R, 2 * R, 2 * R); }
      ctx.restore(); }
    // banner and thermometer
    const W = cv.width, H = cv.height, u = dpr; ctx.save();
    const msg = T(fr.gel ? (fr.fwd ? 'Preview · noise heats the proteins: they open' : 'Preview · quiet: the open proteins link into a gel') : fr.fwd ? 'Preview · noise heats it: order is lost' : 'Preview · quiet cools it: order grows');
    ctx.font = `700 ${14 * u}px ${css('--f-body') || 'sans-serif'}`; const tw = ctx.measureText(msg).width + 24 * u;
    ctx.globalAlpha = 0.85; ctx.fillStyle = fr.fwd ? colors.hot : colors.cold; ctx.beginPath(); ctx.roundRect ? ctx.roundRect((W - tw) / 2, 10 * u, tw, 28 * u, 14 * u) : ctx.rect((W - tw) / 2, 10 * u, tw, 28 * u); ctx.fill();
    ctx.globalAlpha = 1; ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(msg, W / 2, 24 * u);
    ctx.restore();
    // the player's own controls under the box show what the film does: the slider and the noise bar move, the symbol changes
    const g = gameSel, [lo, hi] = g.range, Tf = lo + (0.05 + 0.9 * fr.f) * (hi - lo);
    $('tsliderM').value = Tf; $('micbarM').style.width = (100 * fr.f) + '%'; const k = tWord(g, Tf), b = $('tsetM'); b.textContent = T_SIGNS[k]; b.className = 'tw tw' + k; filmCtl = true;
  }


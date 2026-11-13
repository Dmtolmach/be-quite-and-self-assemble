  // ---- rendering ----
  const cv = $('sim'), ctx = cv.getContext('2d');
  let dpr = 1, W = 0;
  // ---- adaptive drawing quality: watch frame time and drawing time, step down when the device cannot keep up ----
  // 0 full · 1 canvas at 1x pixel density · 2 also no water arms, readouts less often · 3 also every 2nd frame drawn, solvent hidden (not in Ice / Binary liquid)
  let qLevel = 0, qAuto = isPhone, qDraw = null, qFrame = null, qSim = 0, qT = 0, loopN = 0, simMsFrame = 0;
  const ANEVERY = [6, 9, 15, 20];
  function setQuality(q) { q = Math.max(0, Math.min(3, q)); if (q === qLevel) return; const pix = (q >= 1) !== (qLevel >= 1); qLevel = q; if (pix) resize(); qDraw = qFrame = null; qT = performance.now(); }
  function qualityTick(now, dMs, fMs) {
    if (fMs > 200 || document.visibilityState !== 'visible') { qT = now; return; } // tab was hidden or the page was busy elsewhere
    qDraw = qDraw === null ? dMs : 0.92 * qDraw + 0.08 * dMs; qFrame = qFrame === null ? fMs : 0.92 * qFrame + 0.08 * fMs; qSim = 0.92 * qSim + 0.08 * simMsFrame;
    if (!qAuto || qLevel >= 3 || !running) { if (!running) qT = now; return; }
    if (now - qT < 2500) return; // let it settle after a change
    // the browser paints the canvas after our code returns, so painting shows up as frame time outside the simulation, not in qDraw
    if ((qFrame > (qLevel >= 3 ? 40 : 24) && qFrame - qSim > 0.35 * qFrame) || qDraw > 7) { setQuality(qLevel + 1); $('quality').value = 'auto'; } // a slow simulation alone is not helped by simpler drawing
    else qT = now - 1500; // re-check about once a second
  }
  if (!isPhone) $('quality').value = '0';
  $('quality').addEventListener('change', (e) => { const v = e.target.value; qAuto = v === 'auto'; setQuality(qAuto ? 0 : +v); });
  // on a computer the whole box and the temperature bar must fit on the screen: the box gets smaller when the window is short
  function fitSim() {
    if (phoneUI() || classOn) { if (cv.style.maxWidth) { cv.style.maxWidth = ''; resize(); } return; }
    const box = cv.closest('.cellbox'), mb = document.querySelector('.mbar'), hud = $('ghud'); if (!box || !mb) return;
    const top = box.getBoundingClientRect().top + scrollY, running = !!(coachReady && game);
    const hudH = hud.hidden ? 0 : running ? hud.offsetHeight + 10 : Math.min(hud.offsetHeight + 10, 120); // after a game the result graph may push the box down
    const avail = Math.max(300, Math.floor(innerHeight - (running ? 14 : top) - hudH - mb.offsetHeight - 24 - 10 - 6)); // a running game scrolls the box to the top of the screen
    const want = avail + 'px'; if (cv.style.maxWidth !== want) { cv.style.maxWidth = want; resize(); }
  }
  addEventListener('resize', () => fitSim());
  if (window.ResizeObserver) { const ro = new ResizeObserver(() => fitSim()); ['ghud'].forEach((id) => $(id) && ro.observe($(id))); document.querySelector('header') && ro.observe(document.querySelector('header')); }
  function resize() { dpr = Math.min(qLevel >= 1 ? 1 : 2, window.devicePixelRatio || 1); W = cv.clientWidth; cv.width = Math.round(W * dpr); cv.height = Math.round(W * dpr); sizePlots(); }
  window.addEventListener('resize', () => { resize(); if (coachReady) { const rp = $('greplay'); if (!rp.hidden && rp._run) drawReplay(rp._run); } });
  const CPAL = ['#e0704a', '#3a9bd6', '#9b6bd1', '#d4a72c', '#4cae6b', '#d65a9a', '#2fb5b0', '#8f8f3a'];
  const TYPECOL = { 0: 'head', 1: 'tail', 3: 'poly', 5: 'tail', 6: 'head' };

  function disks(col, r, test, from, to) {
    ctx.fillStyle = col; ctx.beginPath();
    const x = eng.x, y = eng.y, s = cv.width / eng.L;
    for (let i = from; i < to; i++) { if (!test(i)) continue; const X = x[i] * s, Y = y[i] * s; ctx.moveTo(X + r, Y); ctx.arc(X, Y, r, 0, 6.2832); }
    ctx.fill();
  }
  function draw() {
    if (eng2 && sys === 'plates') { drawSplit(); return; }
    ctx.save();
    if (eng.walls) { ctx.translate(0, cv.height); ctx.scale(1, -1); } // brush: substrate at the bottom
    if (!eng.walls && eng.L0 && (eng.p.baro || eng.L !== eng.L0)) { // barostat: fixed magnification, box centre fixed, periodic copies fill the view so the box edge never shows
      const k = eng.L / eng.L0, Wc = cv.width, Hc = cv.height, reps = k < 0.999 ? [-1, 0, 1] : [0];
      ctx.fillStyle = heatBg(); ctx.fillRect(0, 0, Wc, Hc);
      ctx.translate(Wc / 2, Hc / 2); ctx.scale(k, k); ctx.translate(-Wc / 2, -Hc / 2);
      noBg = true; for (const oy of reps) for (const ox of reps) { ctx.save(); ctx.translate(ox * Wc, oy * Hc); drawScene(); ctx.restore(); } noBg = false;
    } else drawScene();
    if (sys === 'dumbbell' && eng.nDrug) drawDrug();
    if (!demoDrawing && sys === 'crypt' && gelShow && gelShow.path.length > 1 && appMode === 'game' && ((game && game.g.id === 'gel') || (!game && gameSel && gameSel.id === 'gel'))) drawGel(gelShow);
    if (follow && !demoDrawing) drawFollow(false);
    ctx.restore();
  }
